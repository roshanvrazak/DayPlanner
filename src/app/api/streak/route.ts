import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { calculateStreak } from "@/lib/enforcer";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const streak = await calculateStreak(userId);

    return NextResponse.json({ streak });
  } catch (error) {
    console.error("Streak error:", error);
    return NextResponse.json(
      { streak: 0, error: "Failed to calculate streak" },
      { status: 500 }
    );
  }
}
