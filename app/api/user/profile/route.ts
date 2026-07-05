import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { normalizeStringArray, requireAuth, serializeAuthUser } from "@/lib/auth/server";

export const runtime = "nodejs";

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);
const maxProfileImageBytes = 3 * 1024 * 1024;

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function firstTeam(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 120);
}

async function saveProfileImage(file: File, userId: string) {
  const extension = allowedImageTypes.get(file.type);
  if (!extension) throw new Error("Profile picture must be a JPG, PNG, WebP, or GIF image");
  if (file.size > maxProfileImageBytes) throw new Error("Profile picture must be smaller than 3MB");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "profile");
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${userId}-${randomUUID()}.${extension}`;
  const filePath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return `/uploads/profile/${filename}`;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;
    return NextResponse.json({ user: serializeAuthUser(auth.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profile preferences";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

async function updateProfile(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const name = normalizeName(formData.get("name"));
      const image = formData.get("profilePic");
      const internationalTeam = firstTeam(formData.get("internationalTeam"));
      const clubTeam = firstTeam(formData.get("clubTeam"));

      if (name) auth.user.name = name;
      auth.user.preferences = { internationalTeam, clubTeam };
      auth.user.favoriteInternationalTeams = internationalTeam ? [internationalTeam] : [];
      auth.user.favoriteClubTeams = clubTeam ? [clubTeam] : [];
      if (image instanceof File && image.size > 0) {
        const imageUrl = await saveProfileImage(image, auth.user._id.toString());
        auth.user.profileImage = imageUrl;
        auth.user.profilePic = imageUrl;
        auth.user.avatar = imageUrl;
      }
      auth.user.isProfileComplete = Boolean(internationalTeam || clubTeam || auth.user.profileImage || auth.user.profilePic || auth.user.avatar);
    } else {
      const body = await request.json().catch(() => ({}));
      const favoriteInternationalTeams = normalizeStringArray(body.favoriteInternationalTeams);
      const favoriteClubTeams = normalizeStringArray(body.favoriteClubTeams);
      const internationalTeam = firstTeam(body.preferences?.internationalTeam) || favoriteInternationalTeams[0] || "";
      const clubTeam = firstTeam(body.preferences?.clubTeam) || favoriteClubTeams[0] || "";
      const name = normalizeName(body.name);
      const profilePic = typeof body.profilePic === "string" ? body.profilePic.trim().slice(0, 1000) : "";

      if (name) auth.user.name = name;
      if (profilePic) {
        auth.user.profileImage = profilePic;
        auth.user.profilePic = profilePic;
        auth.user.avatar = profilePic;
      }
      auth.user.preferences = { internationalTeam, clubTeam };
      auth.user.favoriteInternationalTeams = internationalTeam ? [internationalTeam] : [];
      auth.user.favoriteClubTeams = clubTeam ? [clubTeam] : [];
      auth.user.isProfileComplete = Boolean(internationalTeam || clubTeam || auth.user.profileImage || auth.user.profilePic || auth.user.avatar);
    }

    await auth.user.save();

    return NextResponse.json({ user: serializeAuthUser(auth.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save profile preferences";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


export async function PUT(request: Request) {
  return updateProfile(request);
}

export async function POST(request: Request) {
  return updateProfile(request);
}





