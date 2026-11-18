import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { QueueStateMachine } from "@/lib/queue/stateMachine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { reason = "Customer cancelled remotely" } = body;

    const stateMachine = new QueueStateMachine(prisma);
    const result = await stateMachine.cancelToken(params.id, reason);

    return NextResponse.json({
      success: true,
      message: "Token has been cancelled",
      token: result.token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel token" },
      { status: 400 }
    );
  }
}
