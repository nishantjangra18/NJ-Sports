import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/db/mongoose";
import { User, type UserDocument } from "@/models/User";

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  profilePic: string;
  profileImage: string;
  preferences: {
    internationalTeam: string;
    clubTeam: string;
  };
  favoriteInternationalTeams: string[];
  favoriteClubTeams: string[];
  isProfileComplete: boolean;
  watchHistory: Array<{
    videoId: string;
    title: string;
    thumbnail: string;
    url: string;
    duration: number;
    watchedTime: number;
    lastWatchedAt: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
};

type JwtPayload = {
  userId: string;
  email: string;
  exp: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getJwtSecret() {
  return process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "nj-sports-dev-secret-change-me";
}

function signInput(input: string) {
  return createHmac("sha256", getJwtSecret()).update(input).digest("base64url");
}

export function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function mapWatchHistory(user: UserDocument | null) {
  if (!user || !Array.isArray(user.watchHistory)) return [];
  return user.watchHistory
    .map((item) => ({
      videoId: item.matchId,
      title: item.title,
      thumbnail: item.thumbnail,
      url: item.url,
      duration: item.duration,
      watchedTime: item.watchedTime,
      lastWatchedAt: item.lastWatchedAt instanceof Date ? item.lastWatchedAt.getTime() : Date.now()
    }))
    .filter((item) => item.videoId && item.title && item.thumbnail && item.url)
    .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
}

export function serializeAuthUser(user: UserDocument | null): AuthUser | null {
  if (!user) return null;
  const internationalTeam = user.preferences?.internationalTeam ?? user.favoriteInternationalTeams?.[0] ?? "";
  const clubTeam = user.preferences?.clubTeam ?? user.favoriteClubTeams?.[0] ?? "";
  const profileImage = user.profileImage || user.profilePic || user.avatar || "";

  return {
    userId: user._id.toString(),
    name: user.name ?? "",
    email: user.email ?? "",
    avatar: profileImage,
    profilePic: profileImage,
    profileImage,
    preferences: {
      internationalTeam,
      clubTeam
    },
    favoriteInternationalTeams: user.favoriteInternationalTeams?.length ? user.favoriteInternationalTeams : internationalTeam ? [internationalTeam] : [],
    favoriteClubTeams: user.favoriteClubTeams?.length ? user.favoriteClubTeams : clubTeam ? [clubTeam] : [],
    isProfileComplete: Boolean(user.isProfileComplete),
    watchHistory: mapWatchHistory(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function createToken(user: UserDocument) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    userId: user._id.toString(),
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
  }));
  const input = `${header}.${payload}`;
  return `${input}.${signInput(input)}`;
}

export function verifyToken(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = signInput(`${header}.${payload}`);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as Partial<JwtPayload>;
    if (!decoded.userId || !decoded.email || !decoded.exp) return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

export async function requireAuth(request: Request) {
  const payload = verifyToken(getBearerToken(request));
  if (!payload || !mongoose.Types.ObjectId.isValid(payload.userId)) {
    return { user: null, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  await connectMongoDB();
  const user = await User.findById(payload.userId);
  if (!user) return { user: null, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };

  return { user, response: null };
}

export function validateEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function validatePassword(value: unknown) {
  return typeof value === "string" && value.length >= 6 ? value : "";
}
