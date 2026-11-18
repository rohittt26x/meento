import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { QueueStateMachine } from "@/lib/queue/stateMachine";
import { parseAuthHeader } from "@/lib/auth/jwt";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = parseAuthHeader(req.headers.get("authorization"));
    const body = await req.json().catch(() => ({}));
    const { queueId, staffId: reqStaffId } = body;

    const staffId = authUser?.userId || reqStaffId;
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "Staff identity required to call next" },
        { status: 401 }
      );
    }

    // If queueId is not specified in body, find default queue in this counter's venue
    let targetQueueId = queueId;
    if (!targetQueueId) {
      const counter = await prisma.serviceCounter.findUnique({
        where: { id: params.id },
        include: { venue: { include: { queues: true } } },
      });
      if (!counter) {
        return NextResponse.json(
          { success: false, error: "Counter not found" },
          { status: 404 }
        );
      }
      targetQueueId = counter.venue.queues[0]?.id;
    }

    if (!targetQueueId) {
      return NextResponse.json(
        { success: false, error: "No active queue found for this counter" },
        { status: 404 }
      );
    }

    const stateMachine = new QueueStateMachine(prisma);
    const result = await stateMachine.callNextToken(
      targetQueueId,
      params.id,
      staffId
    );

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Called token ${result.token.formattedCode}`,
      token: result.token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to call next token" },
      { status: 400 }
    );
  }
}
