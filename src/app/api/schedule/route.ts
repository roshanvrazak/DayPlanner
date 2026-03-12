import { NextResponse } from "next/server";
import { runScheduler } from "@/lib/scheduler";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || "default-user";

    const blocks = await runScheduler(userId);

    return NextResponse.json({
      success: true,
      blocksCreated: blocks.length,
      blocks,
    });
  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to schedule tasks" },
      { status: 500 }
    );
  }
}
