import { NextResponse } from "next/server";
import { runScheduler } from "@/lib/scheduler";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

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
