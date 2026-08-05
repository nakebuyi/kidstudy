import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    const result = await login(username, password);
    if (!result) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
