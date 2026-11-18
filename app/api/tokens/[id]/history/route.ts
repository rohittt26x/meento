import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await prisma.queueEntry.findUnique({
      where: { id: params.id },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
        },
        serviceRecord: true,
        queue: {
          select: { name: true, code: true },
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch token history" },
      { status: 500 }
    );
  }
}
