import { NextResponse } from "next/server";
import { lockTodayBlocks, isTodayLocked } from "@/lib/enforcer";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const lockedCount = await lockTodayBlocks(userId);

    return NextResponse.json({
      success: true,
      lockedCount,
    });
  } catch (error) {
    console.error("Lock error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to lock blocks" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const locked = await isTodayLocked(userId);

    return NextResponse.json({ locked });
  } catch (error) {
    console.error("Lock check error:", error);
    return NextResponse.json(
      { locked: false, error: "Failed to check lock status" },
      { status: 500 }
    );
  }
}
