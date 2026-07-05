import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectMongoDB } from "@/lib/db/mongoose";
import { createToken, serializeAuthUser, validateEmail, validatePassword } from "@/lib/auth/server";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);

    if (!email || !password) return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });

    await connectMongoDB();
    const user = await User.findOne({ email }).select("+password name email avatar profilePic profileImage preferences favoriteInternationalTeams favoriteClubTeams watchHistory isProfileComplete createdAt updatedAt");
    if (!user?.password) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const token = createToken(user);
    return NextResponse.json({ token, user: serializeAuthUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to login";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}






