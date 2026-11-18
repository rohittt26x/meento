import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateQueueQRCodeDataUri } from "@/lib/qr/qrGenerator";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const queue = await prisma.queue.findFirst({
      where: {
        OR: [{ id: params.id }, { code: params.id }],
      },
    });

    if (!queue) {
      return NextResponse.json(
        { success: false, error: "Queue not found" },
        { status: 404 }
      );
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = `${protocol}://${host}`;

    const qrDataUri = await generateQueueQRCodeDataUri(queue.id, appUrl);

    return NextResponse.json({
      success: true,
      data: {
        queueId: queue.id,
        queueName: queue.name,
        queueCode: queue.code,
        joinUrl: `${appUrl}/join/${queue.id}`,
        qrDataUri,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate QR" },
      { status: 500 }
    );
  }
}
