import { NextRequest, NextResponse } from "next/server";
import { prisma, hasDatabase } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  if (!hasDatabase || !prisma) {
    return NextResponse.json(
      { error: "Registration is not available in demo mode" },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        name: name?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
