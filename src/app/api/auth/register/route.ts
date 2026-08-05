import { NextResponse } from "next/server";
import { register } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password, nickname } = await req.json();
    const result = await register(username, password, nickname);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
