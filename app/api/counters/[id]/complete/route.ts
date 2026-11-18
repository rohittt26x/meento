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
    const { tokenId, staffId: reqStaffId, notes } = body;

    const staffId = authUser?.userId || reqStaffId;
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "Staff identity required" },
        { status: 401 }
      );
    }

    let targetTokenId = tokenId;
    if (!targetTokenId) {
      const activeToken = await prisma.queueEntry.findFirst({
        where: {
          counterId: params.id,
          status: { in: ["SERVING", "CALLED"] },
        },
      });
      if (!activeToken) {
        return NextResponse.json(
          { success: false, error: "No active token to complete at this counter" },
          { status: 404 }
        );
      }
      targetTokenId = activeToken.id;
    }

    const stateMachine = new QueueStateMachine(prisma);
    const result = await stateMachine.completeService(
      targetTokenId,
      params.id,
      staffId,
      notes
    );

    return NextResponse.json({
      success: true,
      message: `Completed token ${result.token.formattedCode}`,
      token: result.token,
      durationSeconds: result.durationSeconds,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to complete service" },
      { status: 400 }
    );
  }
}
