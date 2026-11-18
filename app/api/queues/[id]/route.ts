import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseAuthHeader } from "@/lib/auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const queue = await prisma.queue.findFirst({
      where: {
        OR: [{ id: params.id }, { code: params.id }],
      },
      include: {
        venue: {
          include: {
            counters: true,
          },
        },
        _count: {
          select: {
            entries: {
              where: { status: "WAITING" },
            },
          },
        },
      },
    });

    if (!queue) {
      return NextResponse.json(
        { success: false, error: "Queue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...queue,
        waitingCount: queue._count.entries,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch queue" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = parseAuthHeader(req.headers.get("authorization"));
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "STAFF")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, estimatedServiceTimeMinutes, name } = body;

    const updated = await prisma.queue.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(estimatedServiceTimeMinutes !== undefined
          ? { estimatedServiceTimeMinutes: Number(estimatedServiceTimeMinutes) }
          : {}),
        ...(name ? { name } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update queue" },
      { status: 500 }
    );
  }
}
