import { NextRequest, NextResponse } from "next/server";
import { parseAuthHeader } from "@/lib/auth/jwt";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authUser = parseAuthHeader(req.headers.get("authorization"));
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized session" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        staffMemberships: {
          include: { venue: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Session query failed" },
      { status: 500 }
    );
  }
}
