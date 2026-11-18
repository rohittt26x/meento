import QRCode from "qrcode";

export async function generateQueueQRCodeDataUri(
  queueId: string,
  appUrl?: string
): Promise<string> {
  const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const targetUrl = `${baseUrl}/join/${queueId}`;

  try {
    const dataUri = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
      color: {
        dark: "#0a0f1d", // Deep navy brand color
        light: "#ffffff",
      },
    });
    return dataUri;
  } catch (err) {
    console.error("Error generating QR code:", err);
    throw new Error("Failed to generate QR code");
  }
}
