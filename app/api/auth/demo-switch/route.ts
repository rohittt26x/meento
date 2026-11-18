import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signUserToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, counterNumber } = body;

    let targetEmail = "admin@mitadt.edu.in";
    if (role === "STAFF") {
      targetEmail =
        counterNumber === 2
          ? "amit.verma@mitadt.edu.in"
          : "priya.sharma@mitadt.edu.in";
    } else if (role === "CUSTOMER") {
      targetEmail = "rohit.shinde@student.mitadt.edu.in";
    }

    const user = await prisma.user.findFirst({
      where: { email: targetEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Demo user not found. Please run seed." },
        { status: 404 }
      );
    }

    const token = signUserToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Demo switch failed" },
      { status: 500 }
    );
  }
}
