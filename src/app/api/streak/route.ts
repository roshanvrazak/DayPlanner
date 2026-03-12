import { NextResponse } from "next/server";
import { calculateStreak } from "@/lib/enforcer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user";

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
