import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const seedScript = path.join(process.cwd(), "prisma", "seed.js");
    await execAsync(`node "${seedScript}"`);

    return NextResponse.json({
      success: true,
      message: "Database demo state has been reset successfully!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset demo data" },
      { status: 500 }
    );
  }
}
