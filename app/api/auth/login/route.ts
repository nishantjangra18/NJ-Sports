import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectMongoDB } from "@/lib/db/mongoose";
import { createToken, logUserActivity, serializeAuthUser, validateEmail, validatePassword } from "@/lib/auth/server";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);

    if (!email || !password) return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });

    const adminEmail = (process.env.ADMIN_EMAIL || "nishant@njsports.admin").toLowerCase().trim();
    const adminPass = process.env.ADMIN_PASS || "jangra146";

    // Enforce specific email/password checks for the administrator
    const isAdminEmail = email === adminEmail;
    if (isAdminEmail && password !== adminPass) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email }).select("+password name email avatar profilePic profileImage role activityLogs preferences favoriteInternationalTeams favoriteClubTeams watchHistory isProfileComplete createdAt updatedAt");
    if (!user?.password) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    // Promote the matching admin account
    if (isAdminEmail && user.role !== "admin") {
      user.role = "admin";
    }

    // Demote any unauthorized user who somehow acquired admin status
    if (!isAdminEmail && user.role === "admin") {
      user.role = "user";
    }

    user.lastLogin = new Date();
    await logUserActivity(user, "login", isAdminEmail ? "Admin logged in successfully" : "User logged in successfully");
    await user.save();

    const token = createToken(user);
    return NextResponse.json({ token, user: serializeAuthUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to login";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}






