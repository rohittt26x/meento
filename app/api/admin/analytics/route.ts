import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [serviceRecords, allTokens, queues, counters] = await Promise.all([
      prisma.serviceRecord.findMany({
        include: {
          counter: { select: { counterNumber: true, name: true } },
          staff: { select: { name: true } },
        },
      }),
      prisma.queueEntry.findMany({
        select: {
          status: true,
          joinedAt: true,
          completedAt: true,
          queueId: true,
        },
      }),
      prisma.queue.findMany({
        select: { id: true, name: true, code: true },
      }),
      prisma.serviceCounter.findMany({
        select: { id: true, counterNumber: true, name: true },
      }),
    ]);

    // Service duration calculations
    const durations = serviceRecords.map((r) => r.durationSeconds);
    const avgDurationSeconds =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 240;
    const minDurationSeconds =
      durations.length > 0 ? Math.min(...durations) : 0;
    const maxDurationSeconds =
      durations.length > 0 ? Math.max(...durations) : 0;

    // Counter throughput breakdown
    const counterThroughput = counters.map((c) => {
      const recordsForCounter = serviceRecords.filter(
        (r) => r.counterId === c.id
      );
      const totalDur = recordsForCounter.reduce(
        (acc, r) => acc + r.durationSeconds,
        0
      );
      const avgSec =
        recordsForCounter.length > 0
          ? Math.round(totalDur / recordsForCounter.length)
          : 0;

      return {
        counterId: c.id,
        counterNumber: c.counterNumber,
        counterName: c.name,
        completedCount: recordsForCounter.length,
        avgDurationMinutes: Math.round((avgSec / 60) * 10) / 10,
      };
    });

    // Status breakdown
    const statusCounts = {
      WAITING: allTokens.filter((t) => t.status === "WAITING").length,
      CALLED: allTokens.filter((t) => t.status === "CALLED").length,
      SERVING: allTokens.filter((t) => t.status === "SERVING").length,
      COMPLETED: allTokens.filter((t) => t.status === "COMPLETED").length,
      CANCELLED: allTokens.filter((t) => t.status === "CANCELLED").length,
      NO_SHOW: allTokens.filter((t) => t.status === "NO_SHOW").length,
    };

    // Queue distribution
    const queueDistribution = queues.map((q) => {
      const tokens = allTokens.filter((t) => t.queueId === q.id);
      return {
        queueId: q.id,
        name: q.name,
        code: q.code,
        totalTokens: tokens.length,
        activeWaiting: tokens.filter((t) => t.status === "WAITING").length,
        completed: tokens.filter((t) => t.status === "COMPLETED").length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        performance: {
          avgDurationMinutes: Math.round((avgDurationSeconds / 60) * 10) / 10,
          minDurationSeconds,
          maxDurationSeconds,
          totalCompletedServices: serviceRecords.length,
        },
        counterThroughput,
        statusCounts,
        queueDistribution,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load analytics" },
      { status: 500 }
    );
  }
}
