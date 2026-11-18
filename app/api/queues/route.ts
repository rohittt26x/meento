import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseAuthHeader } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");

    const queues = await prisma.queue.findMany({
      where: venueId ? { venueId } : undefined,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            code: true,
            isOpen: true,
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
      orderBy: { createdAt: "asc" },
    });

    // Also get active counters count for each venue
    const counters = await prisma.serviceCounter.findMany({
      where: { status: { in: ["OPEN", "BUSY"] } },
    });

    const activeCountersByVenue = new Map<string, number>();
    counters.forEach((c) => {
      activeCountersByVenue.set(
        c.venueId,
        (activeCountersByVenue.get(c.venueId) || 0) + 1
      );
    });

    const formatted = queues.map((q) => ({
      id: q.id,
      name: q.name,
      code: q.code,
      prefix: q.prefix,
      description: q.description,
      status: q.status,
      maxCapacity: q.maxCapacity,
      estimatedServiceTimeMinutes: q.estimatedServiceTimeMinutes,
      waitingCount: q._count.entries,
      activeCountersCount: activeCountersByVenue.get(q.venueId) || 0,
      venue: q.venue,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list queues" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = parseAuthHeader(req.headers.get("authorization"));
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      venueId,
      name,
      code,
      prefix = "Q",
      description,
      estimatedServiceTimeMinutes = 5,
    } = body;

    if (!venueId || !name || !code) {
      return NextResponse.json(
        { success: false, error: "venueId, name, and code are required" },
        { status: 400 }
      );
    }

    const queue = await prisma.queue.create({
      data: {
        venueId,
        name,
        code: code.toUpperCase().trim(),
        prefix: prefix.toUpperCase().trim(),
        description,
        estimatedServiceTimeMinutes: Number(estimatedServiceTimeMinutes),
        status: "OPEN",
      },
    });

    return NextResponse.json({ success: true, data: queue }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create queue" },
      { status: 500 }
    );
  }
}
