import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOverridePhrase } from "@/lib/generate-override-phrase";
import bcrypt from "bcryptjs";
import { z } from "zod";

const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = SignupSchema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "User already exists" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 12);
    const overridePhrase = generateOverridePhrase();

    const user = await prisma.user.create({
      data: { name, email, hashedPassword, overridePhrase },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      overridePhrase,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
