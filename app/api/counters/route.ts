import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const counters = await prisma.serviceCounter.findMany({
      include: {
        venue: {
          select: { name: true, code: true },
        },
        currentStaff: {
          select: { id: true, name: true, email: true },
        },
        queueEntries: {
          where: { status: { in: ["CALLED", "SERVING"] } },
          select: {
            id: true,
            formattedCode: true,
            customerName: true,
            customerPhone: true,
            status: true,
            calledAt: true,
            servedAt: true,
          },
        },
      },
      orderBy: { counterNumber: "asc" },
    });

    const formatted = counters.map((c) => ({
      id: c.id,
      counterNumber: c.counterNumber,
      name: c.name,
      description: c.description,
      status: c.status,
      currentStaff: c.currentStaff,
      venue: c.venue,
      activeToken: c.queueEntries[0] || null,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list counters" },
      { status: 500 }
    );
  }
}
