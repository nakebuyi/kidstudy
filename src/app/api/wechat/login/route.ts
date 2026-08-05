import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.trim() === "") {
      return NextResponse.json({ error: "code 不能为空" }, { status: 400 });
    }

    // Call WeChat API to get openid
    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;

    if (!appid || !secret) {
      return NextResponse.json({ error: "微信配置未设置" }, { status: 500 });
    }

    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const wxRes = await fetch(wxUrl);
    const wxData = await wxRes.json() as {
      openid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (!wxData.openid) {
      return NextResponse.json(
        { error: wxData.errmsg || "微信登录失败" },
        { status: 400 }
      );
    }

    const openid = wxData.openid;

    // Find or create parent by openid
    let parent = await prisma.parent.findUnique({
      where: { wechatOpenId: openid },
      include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    let isNew = false;

    if (!parent) {
      isNew = true;
      parent = await prisma.parent.create({
        data: {
          username: `wx_${openid.slice(0, 16)}`,
          passwordHash: "", // WeChat users don't have password
          nickname: "微信用户",
          wechatOpenId: openid,
          role: "PARENT",
        },
        include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
      });
    }

    const token = await signToken({ userId: parent.id, role: "PARENT" });

    return NextResponse.json({
      token,
      user: {
        id: parent.id,
        username: parent.username,
        nickname: parent.nickname || parent.username,
        role: "PARENT",
        currentChildId: parent.children[0]?.id || null,
      },
      isNew,
    });
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
