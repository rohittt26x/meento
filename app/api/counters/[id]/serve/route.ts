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
    const { tokenId, staffId: reqStaffId } = body;

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
        where: { counterId: params.id, status: "CALLED" },
      });
      if (!activeToken) {
        return NextResponse.json(
          { success: false, error: "No currently called token at this counter" },
          { status: 404 }
        );
      }
      targetTokenId = activeToken.id;
    }

    const stateMachine = new QueueStateMachine(prisma);
    const result = await stateMachine.startServing(
      targetTokenId,
      params.id,
      staffId
    );

    return NextResponse.json({
      success: true,
      message: `Started serving token ${result.token.formattedCode}`,
      token: result.token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to start serving" },
      { status: 400 }
    );
  }
}
