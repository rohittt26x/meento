import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { defaultETAPredictor } from "@/lib/eta/etaEngine";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await prisma.queueEntry.findUnique({
      where: { id: params.id },
      include: {
        queue: {
          include: {
            venue: {
              include: {
                counters: true,
              },
            },
          },
        },
        counter: true,
        events: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 404 }
      );
    }

    // 1. Calculate how many active waiting customers are ahead of this token
    let positionAhead = 0;
    if (token.status === "WAITING") {
      positionAhead = await prisma.queueEntry.count({
        where: {
          queueId: token.queueId,
          status: "WAITING",
          tokenNumber: { lt: token.tokenNumber },
        },
      });
    }

    // 2. Fetch active counters
    const activeCounters = token.queue.venue.counters.filter(
      (c) => c.status === "OPEN" || c.status === "BUSY"
    );

    // 3. Fetch recent service completions
    const recentRecords = await prisma.serviceRecord.findMany({
      where: {
        queueEntry: { queueId: token.queueId },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { durationSeconds: true },
    });
    const recentDurations = recentRecords.map((r) => r.durationSeconds);

    // 4. Calculate dynamic ETA
    const eta = defaultETAPredictor.predict({
      queueStatus: token.queue.status as any,
      customersAhead: positionAhead,
      activeCountersCount: activeCounters.length,
      defaultServiceTimeMinutes: token.queue.estimatedServiceTimeMinutes,
      recentServiceDurationsSeconds: recentDurations,
    });

    // 5. Find what token is currently being served in this queue
    const activeServingToken = await prisma.queueEntry.findFirst({
      where: {
        queueId: token.queueId,
        status: { in: ["SERVING", "CALLED"] },
      },
      orderBy: { calledAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        tokenId: token.id,
        tokenNumber: token.tokenNumber,
        formattedCode: token.formattedCode,
        customerName: token.customerName,
        customerPhone: token.customerPhone,
        status: token.status,
        priority: token.priority,
        joinedAt: token.joinedAt,
        calledAt: token.calledAt,
        servedAt: token.servedAt,
        completedAt: token.completedAt,
        cancelledAt: token.cancelledAt,
        cancellationReason: token.cancellationReason,
        positionAhead,
        estimatedWaitMinutes:
          token.status === "WAITING"
            ? eta.estimatedMinutes
            : token.status === "CALLED"
            ? 0
            : 0,
        currentlyServingCode: activeServingToken?.formattedCode || "None",
        assignedCounter: token.counter
          ? {
              id: token.counter.id,
              number: token.counter.counterNumber,
              name: token.counter.name,
            }
          : null,
        queue: {
          id: token.queue.id,
          name: token.queue.name,
          code: token.queue.code,
          prefix: token.queue.prefix,
          status: token.queue.status,
          venueName: token.queue.venue.name,
          venueAddress: token.queue.venue.address,
        },
        events: token.events,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load token" },
      { status: 500 }
    );
  }
}
