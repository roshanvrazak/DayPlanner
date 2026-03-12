import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user";

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return NextResponse.json({
      name: user.name,
      dayStartTime: user.dayStartTime,
      dayEndTime: user.dayEndTime,
      strictMode: user.strictMode,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || "default-user";

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.dayStartTime !== undefined && { dayStartTime: body.dayStartTime }),
        ...(body.dayEndTime !== undefined && { dayEndTime: body.dayEndTime }),
        ...(body.strictMode !== undefined && { strictMode: body.strictMode }),
      },
    });

    return NextResponse.json({
      name: user.name,
      dayStartTime: user.dayStartTime,
      dayEndTime: user.dayEndTime,
      strictMode: user.strictMode,
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
