import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { defaultETAPredictor } from "@/lib/eta/etaEngine";

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
            counters: {
              include: {
                currentStaff: {
                  select: { name: true, email: true },
                },
              },
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

    // 1. Fetch active waiting tokens
    const waitingTokens = await prisma.queueEntry.findMany({
      where: {
        queueId: queue.id,
        status: "WAITING",
      },
      orderBy: [{ priority: "desc" }, { tokenNumber: "asc" }],
      select: {
        id: true,
        tokenNumber: true,
        formattedCode: true,
        customerName: true,
        customerPhone: true,
        joinedAt: true,
        priority: true,
      },
    });

    // 2. Fetch currently serving & called tokens
    const activeTokens = await prisma.queueEntry.findMany({
      where: {
        queueId: queue.id,
        status: { in: ["CALLED", "SERVING"] },
      },
      include: {
        counter: true,
      },
    });

    const currentServing = activeTokens
      .filter((t) => t.status === "SERVING")
      .map((t) => ({
        tokenId: t.id,
        tokenCode: t.formattedCode,
        customerName: t.customerName,
        counterId: t.counterId,
        counterNumber: t.counter?.counterNumber || 1,
        counterName: t.counter?.name || `Counter ${t.counter?.counterNumber}`,
        servedAt: t.servedAt ? t.servedAt.toISOString() : null,
      }));

    const currentlyCalled = activeTokens
      .filter((t) => t.status === "CALLED")
      .map((t) => ({
        tokenId: t.id,
        tokenCode: t.formattedCode,
        customerName: t.customerName,
        counterId: t.counterId,
        counterNumber: t.counter?.counterNumber || 1,
        counterName: t.counter?.name || `Counter ${t.counter?.counterNumber}`,
        calledAt: t.calledAt ? t.calledAt.toISOString() : null,
      }));

    // 3. Count completed today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedTodayCount = await prisma.queueEntry.count({
      where: {
        queueId: queue.id,
        status: "COMPLETED",
        completedAt: { gte: startOfDay },
      },
    });

    // 4. Calculate dynamic ETA for the next waiting customer
    const activeCounters = queue.venue.counters.filter(
      (c) => c.status === "OPEN" || c.status === "BUSY"
    );

    const recentRecords = await prisma.serviceRecord.findMany({
      where: { queueEntry: { queueId: queue.id } },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { durationSeconds: true },
    });
    const recentDurations = recentRecords.map((r) => r.durationSeconds);

    const eta = defaultETAPredictor.predict({
      queueStatus: queue.status as any,
      customersAhead: waitingTokens.length,
      activeCountersCount: activeCounters.length,
      defaultServiceTimeMinutes: queue.estimatedServiceTimeMinutes,
      recentServiceDurationsSeconds: recentDurations,
    });

    return NextResponse.json({
      success: true,
      data: {
        queueId: queue.id,
        queueName: queue.name,
        queueCode: queue.code,
        prefix: queue.prefix,
        status: queue.status,
        venueName: queue.venue.name,
        venueIsOpen: queue.venue.isOpen,
        waitingCount: waitingTokens.length,
        servingCount: currentServing.length,
        calledCount: currentlyCalled.length,
        completedTodayCount,
        activeCountersCount: activeCounters.length,
        averageWaitMinutes: eta.estimatedMinutes,
        confidenceScore: eta.confidenceScore,
        currentServingTokens: currentServing,
        currentlyCalledTokens: currentlyCalled,
        waitingList: waitingTokens,
        counters: queue.venue.counters,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch queue status" },
      { status: 500 }
    );
  }
}
