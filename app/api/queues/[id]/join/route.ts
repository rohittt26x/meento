import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { defaultETAPredictor } from "@/lib/eta/etaEngine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, userId } = body;

    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid customer name" },
        { status: 400 }
      );
    }

    if (!customerPhone || customerPhone.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    // 1. Fetch queue and venue status
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
      },
    });

    if (!queue) {
      return NextResponse.json(
        { success: false, error: "Queue not found" },
        { status: 404 }
      );
    }

    if (!queue.venue.isOpen) {
      return NextResponse.json(
        { success: false, error: "The venue is currently closed" },
        { status: 400 }
      );
    }

    if (queue.status === "CLOSED") {
      return NextResponse.json(
        { success: false, error: "This queue is closed for today" },
        { status: 400 }
      );
    }

    if (queue.status === "PAUSED") {
      return NextResponse.json(
        { success: false, error: "This queue is temporarily paused" },
        { status: 400 }
      );
    }

    // 2. Prevent duplicate active tokens for same phone in same queue
    const existingActive = await prisma.queueEntry.findFirst({
      where: {
        queueId: queue.id,
        customerPhone: cleanPhone,
        status: { in: ["WAITING", "CALLED", "SERVING"] },
      },
    });

    if (existingActive) {
      return NextResponse.json(
        {
          success: false,
          error: `You already have an active token (${existingActive.formattedCode}) in this queue.`,
          existingTokenId: existingActive.id,
          existingTokenCode: existingActive.formattedCode,
        },
        { status: 409 }
      );
    }

    // 3. Atomically determine next sequential token number and create entry
    const newEntry = await prisma.$transaction(async (tx) => {
      // Find highest existing token number in queue
      const latestToken = await tx.queueEntry.findFirst({
        where: { queueId: queue.id },
        orderBy: { tokenNumber: "desc" },
      });

      const nextTokenNumber = latestToken ? latestToken.tokenNumber + 1 : 101;
      const formattedCode = `${queue.prefix}-${nextTokenNumber}`;

      const entry = await tx.queueEntry.create({
        data: {
          queueId: queue.id,
          userId: userId || null,
          tokenNumber: nextTokenNumber,
          formattedCode,
          customerName: cleanName,
          customerPhone: cleanPhone,
          status: "WAITING",
          priority: 0,
        },
      });

      // Audit event
      await tx.queueEvent.create({
        data: {
          queueEntryId: entry.id,
          eventType: "JOINED",
          details: `Joined queue via QR / Web. Token #${nextTokenNumber}`,
        },
      });

      return entry;
    });

    // 4. Calculate position and ETA
    const waitingAhead = await prisma.queueEntry.count({
      where: {
        queueId: queue.id,
        status: "WAITING",
        tokenNumber: { lt: newEntry.tokenNumber },
      },
    });

    const activeCounters = queue.venue.counters.filter(
      (c) => c.status === "OPEN" || c.status === "BUSY"
    ).length;

    // Fetch recent completed service durations
    const recentRecords = await prisma.serviceRecord.findMany({
      where: {
        queueEntry: { queueId: queue.id },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { durationSeconds: true },
    });

    const recentDurations = recentRecords.map((r) => r.durationSeconds);

    const etaResult = defaultETAPredictor.predict({
      queueStatus: queue.status as any,
      customersAhead: waitingAhead,
      activeCountersCount: activeCounters,
      defaultServiceTimeMinutes: queue.estimatedServiceTimeMinutes,
      recentServiceDurationsSeconds: recentDurations,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          tokenId: newEntry.id,
          tokenNumber: newEntry.tokenNumber,
          formattedCode: newEntry.formattedCode,
          customerName: newEntry.customerName,
          status: newEntry.status,
          positionAhead: waitingAhead,
          estimatedWaitMinutes: etaResult.estimatedMinutes,
          queueName: queue.name,
          venueName: queue.venue.name,
          joinedAt: newEntry.joinedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join queue" },
      { status: 500 }
    );
  }
}
