import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      waitingCount,
      servingCount,
      calledCount,
      completedTodayCount,
      cancelledTodayCount,
      noShowTodayCount,
      totalQueues,
      counters,
      recentServices,
      venues,
    ] = await Promise.all([
      prisma.queueEntry.count({ where: { status: "WAITING" } }),
      prisma.queueEntry.count({ where: { status: "SERVING" } }),
      prisma.queueEntry.count({ where: { status: "CALLED" } }),
      prisma.queueEntry.count({
        where: { status: "COMPLETED", completedAt: { gte: startOfDay } },
      }),
      prisma.queueEntry.count({
        where: { status: "CANCELLED", cancelledAt: { gte: startOfDay } },
      }),
      prisma.queueEntry.count({
        where: { status: "NO_SHOW", updatedAt: { gte: startOfDay } },
      }),
      prisma.queue.count(),
      prisma.serviceCounter.findMany({
        include: {
          currentStaff: { select: { name: true, email: true } },
          venue: { select: { name: true } },
        },
      }),
      prisma.serviceRecord.findMany({
        take: 20,
        orderBy: { completedAt: "desc" },
        include: {
          queueEntry: { select: { formattedCode: true, customerName: true } },
          counter: { select: { counterNumber: true, name: true } },
          staff: { select: { name: true } },
        },
      }),
      prisma.venue.findMany({
        include: {
          queues: {
            include: {
              _count: {
                select: {
                  entries: { where: { status: "WAITING" } },
                },
              },
            },
          },
        },
      }),
    ]);

    // Calculate average service duration in minutes from recent records
    let avgServiceSeconds = 240; // 4 mins default
    if (recentServices.length > 0) {
      const sum = recentServices.reduce(
        (acc, r) => acc + r.durationSeconds,
        0
      );
      avgServiceSeconds = Math.round(sum / recentServices.length);
    }
    const avgServiceMinutes = Math.round((avgServiceSeconds / 60) * 10) / 10;

    const activeCountersCount = counters.filter(
      (c) => c.status === "OPEN" || c.status === "BUSY"
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          waitingCount,
          servingCount,
          calledCount,
          completedTodayCount,
          cancelledTodayCount,
          noShowTodayCount,
          totalQueues,
          activeCountersCount,
          totalCountersCount: counters.length,
          avgServiceMinutes,
        },
        counters,
        recentServices,
        venues,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load admin stats" },
      { status: 500 }
    );
  }
}
