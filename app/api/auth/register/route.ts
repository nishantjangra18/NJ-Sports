import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectMongoDB } from "@/lib/db/mongoose";
import { createToken, logUserActivity, serializeAuthUser, validateEmail, validatePassword } from "@/lib/auth/server";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    await connectMongoDB();
    const existingUser = await User.findOne({ email }).select("_id");
    if (existingUser) return NextResponse.json({ error: "Email is already registered" }, { status: 409 });

    const adminEmail = (process.env.ADMIN_EMAIL || "nishant@njsports.admin").toLowerCase().trim();
    const adminPass = process.env.ADMIN_PASS || "jangra146";

    const isAdminEmail = email === adminEmail;
    if (isAdminEmail && password !== adminPass) {
      return NextResponse.json({ error: "Invalid registration parameters for admin role" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isProfileComplete: false,
      role: isAdminEmail ? "admin" : "user",
      lastLogin: new Date(),
      activityLogs: [{
        action: "register",
        details: isAdminEmail ? "Admin account registered" : "User registered account",
        timestamp: new Date()
      }]
    });

    const token = createToken(user);
    return NextResponse.json({ token, user: serializeAuthUser(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
