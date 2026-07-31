# 幼小衔接学习平台 MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可登录的学习平台，孩子完成每日识字打卡，家长查看学习情况，移动端和桌面端均可访问。

**Architecture:** Next.js 14 App Router 全栈应用。前端使用 Tailwind + shadcn/ui 组件，桌面端和移动端通过 `useLayout` hook 自动切换布局壳。后端使用 Next.js API Routes + Prisma + SQLite，NextAuth.js Credentials Provider 处理认证。学习内容从静态 JSON 加载，Web Speech API 提供语音。

**Tech Stack:** Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui, NextAuth.js (Credentials), Prisma ORM, SQLite, Web Speech API

**Source spec:** `docs/superpowers/specs/2026-07-31-mvp-requirements-design.md`

## Global Constraints

- 桌面端断点 ≥768px，移动端 <768px
- 所有可点击元素最小 48×48px 触摸区域
- 密码使用 bcrypt 哈希存储
- 打卡数据按日期（YYYY-MM-DD）存储，每日 0 点重置
- 宠物等级 = Math.min(10, Math.floor(points / 100) + 1)
- 宠物心情：连续打卡≥3天=happy，今天已打卡=normal，今天未打卡=sad
- 积分规则：打卡+10，连续7天+50，学完1字+5
- 跟写描红覆盖率 ≥60% 即算完成
- 未登录访问任何页面 → 重定向到 `/login`
- 已登录访问 `/login` 或 `/register` → 重定向到 `/dashboard`

---

## File Structure Map

```
kidstudy/
├── prisma/
│   ├── schema.prisma              # 4 张表：Parent, Child, LearningRecord, CheckInRecord
│   └── seed.ts                    # 创建 demo 家长账号
├── content/
│   └── literacy.json              # 30 个汉字，3 级各 10 个
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 根布局：Providers + html/body
│   │   ├── page.tsx               # 重定向到 /dashboard
│   │   ├── login/page.tsx         # 登录页
│   │   ├── register/page.tsx      # 注册页
│   │   ├── dashboard/
│   │   │   ├── layout.tsx         # 根据设备类型选择 DesktopLayout or MobileLayout
│   │   │   ├── page.tsx           # 工作台首页
│   │   │   └── calendar/page.tsx  # 打卡日历
│   │   ├── learning/literacy/
│   │   │   ├── page.tsx           # 字表总览（3 Tab 难度）
│   │   │   ├── [id]/page.tsx      # 单字学习（三步流程）
│   │   │   └── result/page.tsx    # 学习结果
│   │   ├── parent/
│   │   │   ├── page.tsx           # 家长中心首页
│   │   │   ├── children/page.tsx  # 孩子管理
│   │   │   └── report/page.tsx    # 学习报告（周报）
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── children/route.ts
│   │       ├── checkin/route.ts
│   │       └── learning/route.ts
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 组件（自动生成）
│   │   ├── layout/
│   │   │   ├── DesktopLayout.tsx  # 顶部导航 + 侧边栏 + 底部栏 + children
│   │   │   ├── MobileLayout.tsx   # 顶部栏 + children + 底部 Tab
│   │   │   ├── useLayout.ts       # 监听 window.innerWidth
│   │   │   ├── TopNav.tsx         # 桌面端顶部导航栏
│   │   │   ├── Sidebar.tsx        # 桌面端左侧边栏（宠物+积分+打卡）
│   │   │   ├── BottomBar.tsx      # 桌面端底部状态栏
│   │   │   ├── MobileTopBar.tsx   # 移动端顶部栏
│   │   │   └── MobileBottomTabs.tsx # 移动端底部 Tab 导航
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── dashboard/
│   │   │   ├── TodayTask.tsx      # 今日打卡任务卡片
│   │   │   ├── PointsDisplay.tsx  # 积分展示
│   │   │   ├── StreakDisplay.tsx  # 打卡天数展示
│   │   │   └── QuickLinks.tsx     # 快捷入口
│   │   ├── learning/
│   │   │   ├── CharacterGrid.tsx  # 汉字网格
│   │   │   ├── CharacterCard.tsx  # 字卡展示（步骤1）
│   │   │   ├── WritingCanvas.tsx  # 描红 Canvas（步骤2）
│   │   │   ├── QuizOptions.tsx    # 四选一测试（步骤3）
│   │   │   └── StepIndicator.tsx  # 步骤指示器
│   │   ├── calendar/
│   │   │   └── Calendar.tsx       # 月视图日历
│   │   ├── pet/
│   │   │   └── PetDisplay.tsx     # 宠物展示组件
│   │   └── parent/
│   │       ├── ChildList.tsx      # 孩子列表
│   │       ├── ChildForm.tsx      # 添加/编辑孩子表单
│   │       └── WeeklyReport.tsx   # 周报组件
│   ├── hooks/
│   │   ├── useSpeech.ts           # Web Speech API 封装
│   │   ├── useCheckIn.ts          # 打卡状态管理
│   │   └── usePoints.ts           # 积分状态管理
│   ├── lib/
│   │   ├── prisma.ts              # Prisma 客户端单例
│   │   ├── auth.ts                # NextAuth 配置
│   │   ├── literacy.ts            # 汉字内容加载函数
│   │   ├── points.ts              # 积分计算函数
│   │   ├── streak.ts              # 连续打卡天数计算
│   │   └── pet.ts                 # 宠物等级/心情计算
│   ├── store/
│   │   ├── AppProvider.tsx        # SessionProvider + ChildProvider
│   │   ├── ChildContext.tsx       # 当前孩子状态
│   │   └── LearningContext.tsx    # 学习会话状态
│   ├── types/
│   │   └── index.ts               # 所有 TypeScript 类型
│   └── middleware.ts              # 路由权限守卫
├── .env                           # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Phase 1: 基础框架

### Task 1: 项目初始化 + shadcn/ui 安装

**Files:**
- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/globals.css`
- Create: `components.json` (shadcn/ui 配置)
- Create: `src/components/ui/*` (shadcn 组件)
- Create: `.env`

**Interfaces:**
- Produces: 可运行的 Next.js 开发服务器，shadcn/ui 组件就绪

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
cd /data/claude/kidstudy
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: 安装依赖**

```bash
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 3: 初始化 shadcn/ui**

```bash
npx shadcn@latest init -d
```

- [ ] **Step 4: 添加 shadcn/ui 组件**

```bash
npx shadcn@latest add button card input label tabs avatar badge progress dialog dropdown-menu tooltip
```

- [ ] **Step 5: 创建 .env 文件**

```bash
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
EOF
```

- [ ] **Step 6: 验证项目可运行**

```bash
npm run dev
# 应该看到 Next.js 默认页面
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: init Next.js + Tailwind + shadcn/ui + dependencies"
```

---

### Task 2: Prisma 数据模型 + 种子数据

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/prisma.ts`
- Modify: `package.json` (添加 seed 脚本)

**Interfaces:**
- Produces: `PrismaClient` 单例 (`src/lib/prisma.ts`)，4 张表，种子脚本

- [ ] **Step 1: 编写 Prisma schema**

Write `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Parent {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  children     Child[]
  createdAt    DateTime @default(now())
}

model Child {
  id            String           @id @default(uuid())
  parentId      String
  parent        Parent           @relation(fields: [parentId], references: [id], onDelete: Cascade)
  name          String
  avatar        String           @default("👦")
  points        Int              @default(0)
  streak        Int              @default(0)
  maxStreak     Int              @default(0)
  totalCheckIns Int              @default(0)
  pet           String           @default("{\"type\":\"cat\",\"name\":\"小咪\",\"level\":1,\"mood\":\"normal\"}")
  createdAt     DateTime         @default(now())
  learningRecords LearningRecord[]
  checkInRecords   CheckInRecord[]
}

model LearningRecord {
  id        String   @id @default(uuid())
  childId   String
  child     Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  charId    String
  type      String
  score     Int?
  accuracy  Float?
  duration  Int      @default(0)
  createdAt DateTime @default(now())
}

model CheckInRecord {
  id           String   @id @default(uuid())
  childId      String
  child        Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  date         String
  charId       String
  completed    Boolean  @default(false)
  pointsEarned Int      @default(0)
  createdAt    DateTime @default(now())

  @@unique([childId, date])
}
```

- [ ] **Step 2: 创建 Prisma 客户端单例**

Write `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: 编写种子脚本**

Write `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const parent = await prisma.parent.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      passwordHash,
      children: {
        create: {
          name: "小明",
          avatar: "👦",
          pet: JSON.stringify({ type: "cat", name: "小咪", level: 1, mood: "normal" }),
        },
      },
    },
  });

  console.log(`Seeded parent: ${parent.username}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
```

- [ ] **Step 4: 配置 package.json seed 脚本**

在 `package.json` 的 `scripts` 中添加：

```json
"postinstall": "prisma generate",
"db:push": "prisma db push",
"db:seed": "npx tsx prisma/seed.ts",
"db:setup": "prisma db push && npx tsx prisma/seed.ts"
```

- [ ] **Step 5: 运行数据库初始化**

```bash
npm run db:setup
```

- [ ] **Step 6: 验证数据库**

```bash
npx prisma studio
# 应该能看到 Parent, Child 两张表，demo 家长和 小明 孩子
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Prisma schema, seed, and client"
```

---

### Task 3: 类型定义 + NextAuth 配置

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Produces: `LiteracyContent` 等类型，`auth()` / `signIn()` / `signOut()` 导出

- [ ] **Step 1: 编写类型定义**

Write `src/types/index.ts`:

```typescript
// 学习科目
export type Subject = "literacy" | "pinyin" | "english" | "math" | "poetry";

// 识字内容
export interface LiteracyContent {
  id: string;
  char: string;
  pinyin: string;
  radical: string;
  strokes: number;
  words: string[];
  sentences: string[];
  emoji: string;
  level: 1 | 2 | 3;
  order: number;
}

// 宠物状态
export interface PetState {
  type: "cat" | "dog" | "rabbit";
  name: string;
  level: number;
  mood: "happy" | "normal" | "sad";
}

// 学习记录类型
export type RecordType = "learn" | "practice" | "test";

// 打卡状态
export type CheckInStatus = "not_started" | "in_progress" | "completed" | "claimed";

// 学习步骤
export type LearningStep = 1 | 2 | 3;

// NextAuth session 扩展
export interface ExtendedSession {
  user: {
    id: string;
    username: string;
  };
  currentChildId?: string;
}
```

- [ ] **Step 2: 编写 NextAuth 配置**

Write `src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const parent = await prisma.parent.findUnique({
          where: { username: credentials.username as string },
          include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
        });

        if (!parent) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          parent.passwordHash
        );

        if (!isValid) return null;

        return {
          id: parent.id,
          username: parent.username,
          currentChildId: parent.children[0]?.id || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.currentChildId = (user as any).currentChildId;
      }
      if (trigger === "update" && session?.currentChildId) {
        token.currentChildId = session.currentChildId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        username: token.username as string,
      };
      (session as any).currentChildId = token.currentChildId;
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 3: 创建 NextAuth API 路由**

Write `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add types, NextAuth config, and auth API route"
```

---

### Task 4: Context Providers

**Files:**
- Create: `src/store/ChildContext.tsx`
- Create: `src/store/LearningContext.tsx`
- Create: `src/store/AppProvider.tsx`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `auth` from `@/lib/auth`
- Produces: `useChild()` → `{ child, children, setCurrentChild, refreshChild }`, `useLearning()` → `{ currentStep, charId, ... }`, `<AppProvider>` wrapper

- [ ] **Step 1: 编写 ChildContext**

Write `src/store/ChildContext.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface Child {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
  pet: string;
}

interface ChildContextType {
  child: Child | null;
  children: Child[];
  setCurrentChild: (childId: string) => void;
  refreshChild: () => Promise<void>;
  refreshChildren: () => Promise<void>;
}

const ChildContext = createContext<ChildContextType>({
  child: null,
  children: [],
  setCurrentChild: () => {},
  refreshChild: async () => {},
  refreshChildren: async () => {},
});

export function ChildProvider({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();
  const [child, setChild] = useState<Child | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  const fetchChildren = useCallback(async () => {
    const res = await fetch("/api/children");
    if (res.ok) {
      const data = await res.json();
      setChildrenList(data);
      return data;
    }
    return [];
  }, []);

  const fetchChild = useCallback(async (childId: string) => {
    const res = await fetch(`/api/children?id=${childId}`);
    if (res.ok) {
      const data = await res.json();
      setChild(data);
    }
  }, []);

  const refreshChild = useCallback(async () => {
    const currentChildId = (session as any)?.currentChildId;
    if (currentChildId) await fetchChild(currentChildId);
  }, [session, fetchChild]);

  const refreshChildren = useCallback(async () => {
    await fetchChildren();
  }, [fetchChildren]);

  const setCurrentChild = useCallback(async (childId: string) => {
    await update({ currentChildId: childId });
    await fetchChild(childId);
  }, [update, fetchChild]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    const currentChildId = (session as any)?.currentChildId;
    if (currentChildId) {
      fetchChild(currentChildId);
    }
  }, [session, fetchChild]);

  return (
    <ChildContext.Provider
      value={{ child, children: childrenList, setCurrentChild, refreshChild, refreshChildren }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  return useContext(ChildContext);
}
```

- [ ] **Step 2: 编写 LearningContext**

Write `src/store/LearningContext.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { LearningStep } from "@/types";

interface LearningContextType {
  charId: string | null;
  currentStep: LearningStep;
  step1Complete: boolean;
  step2Complete: boolean;
  step3Correct: boolean | null;
  startLearning: (charId: string) => void;
  completeStep: (step: LearningStep) => void;
  setQuizResult: (correct: boolean) => void;
  reset: () => void;
}

const LearningContext = createContext<LearningContextType>({
  charId: null,
  currentStep: 1,
  step1Complete: false,
  step2Complete: false,
  step3Correct: null,
  startLearning: () => {},
  completeStep: () => {},
  setQuizResult: () => {},
  reset: () => {},
});

export function LearningProvider({ children }: { children: ReactNode }) {
  const [charId, setCharId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<LearningStep>(1);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [step3Correct, setStep3Correct] = useState<boolean | null>(null);

  const startLearning = (id: string) => {
    setCharId(id);
    setCurrentStep(1);
    setStep1Complete(false);
    setStep2Complete(false);
    setStep3Correct(null);
  };

  const completeStep = (step: LearningStep) => {
    if (step === 1) setStep1Complete(true);
    if (step === 2) setStep2Complete(true);
    if (step < 3) setCurrentStep((step + 1) as LearningStep);
  };

  const setQuizResult = (correct: boolean) => {
    setStep3Correct(correct);
  };

  const reset = () => {
    setCharId(null);
    setCurrentStep(1);
    setStep1Complete(false);
    setStep2Complete(false);
    setStep3Correct(null);
  };

  return (
    <LearningContext.Provider
      value={{ charId, currentStep, step1Complete, step2Complete, step3Correct, startLearning, completeStep, setQuizResult, reset }}
    >
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  return useContext(LearningContext);
}
```

- [ ] **Step 3: 编写 AppProvider**

Write `src/store/AppProvider.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { ChildProvider } from "./ChildContext";
import { LearningProvider } from "./LearningContext";
import { ReactNode } from "react";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ChildProvider>
        <LearningProvider>
          {children}
        </LearningProvider>
      </ChildProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add context providers (App, Child, Learning)"
```

---

### Task 5: 根布局 + 中间件

**Files:**
- Create: `src/middleware.ts`
- Modify: `src/app/layout.tsx` (替换默认内容)
- Create: `src/app/page.tsx` (重定向)

**Interfaces:**
- Consumes: `AppProvider` from `@/store/AppProvider`
- Produces: 根布局带 providers，路由守卫

- [ ] **Step 1: 编写中间件**

Write `src/middleware.ts`:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/register"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  if (!isLoggedIn && !publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: 更新根布局**

Write `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { AppProvider } from "@/store/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "幼小衔接学习平台",
  description: "幼小衔接在线学习平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-orange-50/30 antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 编写首页重定向**

Write `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add root layout, middleware, and home redirect"
```

---

### Task 6: 登录 & 注册页面

**Files:**
- Create: `src/components/auth/LoginForm.tsx`
- Create: `src/components/auth/RegisterForm.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`

**Interfaces:**
- Consumes: `signIn` from `next-auth/react`, `useRouter` from `next/navigation`
- Produces: 登录/注册页面

- [ ] **Step 1: 编写 LoginForm**

Write `src/components/auth/LoginForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("用户名或密码错误");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">👋 欢迎回来</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              className="h-12"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
          <p className="text-center text-sm text-gray-500">
            还没有账号？
            <a href="/register" className="text-blue-500 ml-1">去注册</a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 编写 RegisterForm**

Write `src/components/auth/RegisterForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "注册失败");
      setLoading(false);
      return;
    }

    // 自动登录
    const result = await signIn("credentials", { username, password, redirect: false });
    if (result?.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">📝 注册账号</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              minLength={3}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
              required
              minLength={6}
              className="h-12"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
            {loading ? "注册中..." : "注册"}
          </Button>
          <p className="text-center text-sm text-gray-500">
            已有账号？
            <a href="/login" className="text-blue-500 ml-1">去登录</a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 创建注册 API 路由**

Write `src/app/api/auth/register/route.ts`:

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const existing = await prisma.parent.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "用户名已被注册" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.parent.create({ data: { username, passwordHash } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 创建登录页面**

Write `src/app/login/page.tsx`:

```typescript
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 5: 创建注册页面**

Write `src/app/register/page.tsx`:

```typescript
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <RegisterForm />
    </div>
  );
}
```

- [ ] **Step 6: 验证认证流程**

```bash
npm run dev
# 访问 http://localhost:3000，应重定向到 /login
# 使用 demo / 123456 登录，应进入 /dashboard（目前 404）
# 访问 /register，注册新账号并自动登录
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add login, register pages and auth API"
```

---

### Task 7: 桌面端布局组件

**Files:**
- Create: `src/components/layout/TopNav.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/BottomBar.tsx`
- Create: `src/components/layout/DesktopLayout.tsx`

**Interfaces:**
- Consumes: `useChild()` from `@/store/ChildContext`, `signOut` from `next-auth/react`
- Produces: `<DesktopLayout>` 壳组件

- [ ] **Step 1: 编写 TopNav**

Write `src/components/layout/TopNav.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useChild } from "@/store/ChildContext";

const subjects = [
  { key: "literacy", label: "识字", color: "bg-orange-100 text-orange-700", enabled: true },
  { key: "pinyin", label: "拼音", color: "bg-gray-100 text-gray-400", enabled: false },
  { key: "english", label: "英语", color: "bg-gray-100 text-gray-400", enabled: false },
  { key: "math", label: "算数", color: "bg-gray-100 text-gray-400", enabled: false },
  { key: "poetry", label: "古诗词", color: "bg-gray-100 text-gray-400", enabled: false },
];

export function TopNav() {
  const pathname = usePathname();
  const { child } = useChild();

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-xl font-bold text-orange-500">
          📚 幼小衔接
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {subjects.map((s) => (
            <Link
              key={s.key}
              href={s.enabled ? `/learning/${s.key}` : "#"}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                s.enabled
                  ? pathname.startsWith(`/learning/${s.key}`)
                    ? "bg-orange-100 text-orange-700"
                    : "hover:bg-gray-100"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              onClick={(e) => { if (!s.enabled) e.preventDefault(); }}
            >
              {s.label} {!s.enabled && "🔒"}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/parent" className="text-sm text-gray-600 hover:text-gray-900">
          👤 家长中心
        </Link>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          退出
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 编写 Sidebar**

Write `src/components/layout/Sidebar.tsx`:

```typescript
"use client";

import { useChild } from "@/store/ChildContext";
import { PetDisplay } from "@/components/pet/PetDisplay";
import { PointsDisplay } from "@/components/dashboard/PointsDisplay";
import { StreakDisplay } from "@/components/dashboard/StreakDisplay";

export function Sidebar() {
  const { child } = useChild();

  if (!child) return null;

  const pet = JSON.parse(child.pet);

  return (
    <aside className="w-[240px] border-r bg-white flex flex-col items-center py-6 px-4 gap-4 shrink-0">
      <PetDisplay pet={pet} />
      <div className="w-full space-y-3">
        <PointsDisplay points={child.points} />
        <StreakDisplay streak={child.streak} maxStreak={child.maxStreak} />
        <div className="text-center text-sm text-gray-500">
          📅 累计打卡 {child.totalCheckIns} 天
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: 编写 BottomBar**

Write `src/components/layout/BottomBar.tsx`:

```typescript
const tips = [
  "千里之行，始于足下。",
  "学而时习之，不亦说乎。",
  "书山有路勤为径，学海无涯苦作舟。",
  "少壮不努力，老大徒伤悲。",
  "温故而知新，可以为师矣。",
];

export function BottomBar() {
  const tip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <footer className="h-10 border-t bg-white flex items-center justify-between px-4 text-sm text-gray-500 shrink-0">
      <span>💡 {tip}</span>
      <span>👁️ 记得休息一下眼睛哦~</span>
    </footer>
  );
}
```

- [ ] **Step 4: 编写 DesktopLayout**

Write `src/components/layout/DesktopLayout.tsx`:

```typescript
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { BottomBar } from "./BottomBar";

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <BottomBar />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add desktop layout components (TopNav, Sidebar, BottomBar, DesktopLayout)"
```

---

### Task 8: 移动端布局组件 + useLayout Hook

**Files:**
- Create: `src/components/layout/MobileTopBar.tsx`
- Create: `src/components/layout/MobileBottomTabs.tsx`
- Create: `src/components/layout/MobileLayout.tsx`
- Create: `src/components/layout/useLayout.ts`
- Create: `src/app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `DesktopLayout`, `MobileLayout`
- Produces: `useLayout()` → `{ isMobile: boolean }`，dashboard layout 自动切换

- [ ] **Step 1: 编写 useLayout Hook**

Write `src/components/layout/useLayout.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";

export function useLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return { isMobile };
}
```

- [ ] **Step 2: 编写 MobileTopBar**

Write `src/components/layout/MobileTopBar.tsx`:

```typescript
"use client";

import { useChild } from "@/store/ChildContext";
import { PointsDisplay } from "@/components/dashboard/PointsDisplay";

export function MobileTopBar() {
  const { child, children, setCurrentChild } = useChild();

  return (
    <header className="h-12 border-b bg-white flex items-center justify-between px-3 shrink-0">
      <div className="flex items-center gap-2">
        {children.length > 1 && (
          <select
            className="text-sm border rounded px-2 py-1 bg-white"
            value={child?.id || ""}
            onChange={(e) => setCurrentChild(e.target.value)}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.avatar} {c.name}
              </option>
            ))}
          </select>
        )}
        {children.length <= 1 && child && (
          <span className="text-sm font-medium">{child.avatar} {child.name}</span>
        )}
      </div>
      {child && <PointsDisplay points={child.points} compact />}
    </header>
  );
}
```

- [ ] **Step 3: 编写 MobileBottomTabs**

Write `src/components/layout/MobileBottomTabs.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { key: "dashboard", label: "工作台", icon: "🏠", href: "/dashboard" },
  { key: "learning", label: "学习", icon: "📚", href: "/learning/literacy" },
  { key: "calendar", label: "日历", icon: "📅", href: "/dashboard/calendar" },
  { key: "parent", label: "家长", icon: "👤", href: "/parent" },
];

export function MobileBottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="h-14 border-t bg-white flex items-center justify-around shrink-0">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(`/${tab.key}`);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] ${
              isActive ? "text-orange-500" : "text-gray-400"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: 编写 MobileLayout**

Write `src/components/layout/MobileLayout.tsx`:

```typescript
import { MobileTopBar } from "./MobileTopBar";
import { MobileBottomTabs } from "./MobileBottomTabs";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <MobileTopBar />
      <main className="flex-1 overflow-auto p-4">{children}</main>
      <MobileBottomTabs />
    </div>
  );
}
```

- [ ] **Step 5: 编写 Dashboard Layout**

Write `src/app/dashboard/layout.tsx`:

```typescript
"use client";

import { useLayout } from "@/components/layout/useLayout";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { MobileLayout } from "@/components/layout/MobileLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobile } = useLayout();

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return <DesktopLayout>{children}</DesktopLayout>;
}
```

- [ ] **Step 6: 验证布局切换**

```bash
npm run dev
# 浏览器宽度 ≥768px → 桌面端布局（顶部导航+侧边栏+底部栏）
# 浏览器宽度 <768px → 移动端布局（顶部栏+底部Tab）
# 缩小浏览器窗口测试切换
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add mobile layout components and responsive layout switching"
```

---

## Phase 2: 识字模块

### Task 9: 学习内容 JSON

**Files:**
- Create: `content/literacy.json`
- Create: `src/lib/literacy.ts`

**Interfaces:**
- Produces: `getAllCharacters()` → `LiteracyContent[]`, `getCharacterById(id)` → `LiteracyContent | undefined`, `getCharactersByLevel(level)` → `LiteracyContent[]`

- [ ] **Step 1: 编写 literacy.json（30 个汉字）**

Write `content/literacy.json`:

```json
[
  {"id":"char_001","char":"一","pinyin":"yī","radical":"一","strokes":1,"words":["一个","一天"],"sentences":["我有一个苹果。"],"emoji":"1️⃣","level":1,"order":1},
  {"id":"char_002","char":"二","pinyin":"èr","radical":"二","strokes":2,"words":["二月","二手"],"sentences":["今天星期二。"],"emoji":"2️⃣","level":1,"order":2},
  {"id":"char_003","char":"三","pinyin":"sān","radical":"一","strokes":3,"words":["三个","三角"],"sentences":["我有三个好朋友。"],"emoji":"3️⃣","level":1,"order":3},
  {"id":"char_004","char":"大","pinyin":"dà","radical":"大","strokes":3,"words":["大人","大小"],"sentences":["大象很大。"],"emoji":"🐘","level":1,"order":4},
  {"id":"char_005","char":"小","pinyin":"xiǎo","radical":"小","strokes":3,"words":["小孩","小鸟"],"sentences":["小鸟在唱歌。"],"emoji":"🐦","level":1,"order":5},
  {"id":"char_006","char":"人","pinyin":"rén","radical":"人","strokes":2,"words":["人们","人类"],"sentences":["我爱我的家人。"],"emoji":"🧑","level":1,"order":6},
  {"id":"char_007","char":"天","pinyin":"tiān","radical":"大","strokes":4,"words":["天空","今天"],"sentences":["今天天气真好！"],"emoji":"☀️","level":1,"order":7},
  {"id":"char_008","char":"日","pinyin":"rì","radical":"日","strokes":4,"words":["日出","生日"],"sentences":["太阳每天升起。"],"emoji":"🌞","level":1,"order":8},
  {"id":"char_009","char":"月","pinyin":"yuè","radical":"月","strokes":4,"words":["月亮","一月"],"sentences":["月亮弯弯像小船。"],"emoji":"🌙","level":1,"order":9},
  {"id":"char_010","char":"水","pinyin":"shuǐ","radical":"水","strokes":4,"words":["水果","喝水"],"sentences":["多喝水对身体好。"],"emoji":"💧","level":1,"order":10},
  {"id":"char_011","char":"火","pinyin":"huǒ","radical":"火","strokes":4,"words":["火车","火星"],"sentences":["不要玩火。"],"emoji":"🔥","level":2,"order":11},
  {"id":"char_012","char":"山","pinyin":"shān","radical":"山","strokes":3,"words":["大山","山顶"],"sentences":["山上有座庙。"],"emoji":"⛰️","level":2,"order":12},
  {"id":"char_013","char":"木","pinyin":"mù","radical":"木","strokes":4,"words":["木头","树木"],"sentences":["森林里有很多树。"],"emoji":"🌳","level":2,"order":13},
  {"id":"char_014","char":"花","pinyin":"huā","radical":"艹","strokes":7,"words":["花朵","花园"],"sentences":["春天花开了。"],"emoji":"🌸","level":2,"order":14},
  {"id":"char_015","char":"草","pinyin":"cǎo","radical":"艹","strokes":9,"words":["草地","小草"],"sentences":["草地上有只兔子。"],"emoji":"🌿","level":2,"order":15},
  {"id":"char_016","char":"鱼","pinyin":"yú","radical":"鱼","strokes":8,"words":["小鱼","金鱼"],"sentences":["小鱼在水里游。"],"emoji":"🐟","level":2,"order":16},
  {"id":"char_017","char":"鸟","pinyin":"niǎo","radical":"鸟","strokes":5,"words":["小鸟","飞鸟"],"sentences":["小鸟在树上唱歌。"],"emoji":"🐤","level":2,"order":17},
  {"id":"char_018","char":"马","pinyin":"mǎ","radical":"马","strokes":3,"words":["马上","骑马"],"sentences":["马儿跑得快。"],"emoji":"🐴","level":2,"order":18},
  {"id":"char_019","char":"牛","pinyin":"niú","radical":"牛","strokes":4,"words":["牛奶","水牛"],"sentences":["牛在田里吃草。"],"emoji":"🐮","level":2,"order":19},
  {"id":"char_020","char":"羊","pinyin":"yáng","radical":"羊","strokes":6,"words":["山羊","羊毛"],"sentences":["草地上有白羊。"],"emoji":"🐑","level":2,"order":20},
  {"id":"char_021","char":"上","pinyin":"shàng","radical":"一","strokes":3,"words":["上学","上午"],"sentences":["我上学去了。"],"emoji":"⬆️","level":3,"order":21},
  {"id":"char_022","char":"下","pinyin":"xià","radical":"一","strokes":3,"words":["下午","下雨"],"sentences":["下午我要去公园。"],"emoji":"⬇️","level":3,"order":22},
  {"id":"char_023","char":"左","pinyin":"zuǒ","radical":"工","strokes":5,"words":["左手","左边"],"sentences":["左手拿筷子。"],"emoji":"👈","level":3,"order":23},
  {"id":"char_024","char":"右","pinyin":"yòu","radical":"口","strokes":5,"words":["右手","右边"],"sentences":["右手写字。"],"emoji":"👉","level":3,"order":24},
  {"id":"char_025","char":"中","pinyin":"zhōng","radical":"丨","strokes":4,"words":["中国","中间"],"sentences":["我爱中国。"],"emoji":"🇨🇳","level":3,"order":25},
  {"id":"char_026","char":"口","pinyin":"kǒu","radical":"口","strokes":3,"words":["口水","门口"],"sentences":["门口有只小狗。"],"emoji":"👄","level":3,"order":26},
  {"id":"char_027","char":"手","pinyin":"shǒu","radical":"手","strokes":4,"words":["小手","洗手"],"sentences":["饭前要洗手。"],"emoji":"✋","level":3,"order":27},
  {"id":"char_028","char":"目","pinyin":"mù","radical":"目","strokes":5,"words":["目光","节目"],"sentences":["保护眼睛很重要。"],"emoji":"👁️","level":3,"order":28},
  {"id":"char_029","char":"耳","pinyin":"ěr","radical":"耳","strokes":6,"words":["耳朵","木耳"],"sentences":["耳朵用来听声音。"],"emoji":"👂","level":3,"order":29},
  {"id":"char_030","char":"足","pinyin":"zú","radical":"足","strokes":7,"words":["足球","满足"],"sentences":["我喜欢踢足球。"],"emoji":"🦶","level":3,"order":30}
]
```

- [ ] **Step 2: 编写 literacy.ts 工具函数**

Write `src/lib/literacy.ts`:

```typescript
import type { LiteracyContent } from "@/types";
import characters from "@/../content/literacy.json";

export function getAllCharacters(): LiteracyContent[] {
  return characters as LiteracyContent[];
}

export function getCharacterById(id: string): LiteracyContent | undefined {
  return (characters as LiteracyContent[]).find((c) => c.id === id);
}

export function getCharactersByLevel(level: 1 | 2 | 3): LiteracyContent[] {
  return (characters as LiteracyContent[]).filter((c) => c.level === level);
}

export function getNextCharacter(learnedCharIds: string[]): LiteracyContent | undefined {
  return (characters as LiteracyContent[])
    .filter((c) => !learnedCharIds.includes(c.id))
    .sort((a, b) => a.order - b.order)[0];
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add 30-character literacy content JSON and loader"
```

---

### Task 10: useSpeech Hook

**Files:**
- Create: `src/hooks/useSpeech.ts`

**Interfaces:**
- Produces: `useSpeech()` → `{ speak(text), speaking, supported }`

- [ ] **Step 1: 编写 useSpeech Hook**

Write `src/hooks/useSpeech.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text: string, lang: string = "zh-CN") => {
      if (!supported) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  return { speak, speaking, supported };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add useSpeech hook for Web Speech API TTS"
```

---

### Task 11: 字表总览页

**Files:**
- Create: `src/components/learning/CharacterGrid.tsx`
- Create: `src/app/learning/literacy/page.tsx`

**Interfaces:**
- Consumes: `getAllCharacters()`, `getCharactersByLevel()` from `@/lib/literacy`
- Produces: `/learning/literacy` 页面

- [ ] **Step 1: 编写 CharacterGrid 组件**

Write `src/components/learning/CharacterGrid.tsx`:

```typescript
"use client";

import Link from "next/link";
import type { LiteracyContent } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Props {
  characters: LiteracyContent[];
  learnedCharIds: string[];
  currentCharId?: string | null;
}

const levelLabels = { 1: "基础", 2: "进阶", 3: "拓展" };

export function CharacterGrid({ characters, learnedCharIds, currentCharId }: Props) {
  const levels = [1, 2, 3] as const;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">🔤 识字学习</h1>
        <Progress
          value={(learnedCharIds.length / characters.length) * 100}
          className="h-3 max-w-md mx-auto"
        />
        <p className="text-sm text-gray-500 mt-1">
          已学 {learnedCharIds.length} / {characters.length} 字
        </p>
      </div>

      <Tabs defaultValue="1">
        <TabsList className="w-full justify-center">
          {levels.map((l) => (
            <TabsTrigger key={l} value={String(l)}>
              {levelLabels[l]} ({characters.filter((c) => c.level === l).length}字)
            </TabsTrigger>
          ))}
        </TabsList>
        {levels.map((l) => {
          const levelChars = characters.filter((c) => c.level === l);
          return (
            <TabsContent key={l} value={String(l)}>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {levelChars.map((c) => {
                  const isLearned = learnedCharIds.includes(c.id);
                  const isCurrent = c.id === currentCharId;
                  return (
                    <Link
                      key={c.id}
                      href={`/learning/literacy/${c.id}`}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-lg font-bold border-2 transition-colors min-h-[64px] ${
                        isLearned
                          ? "bg-green-50 border-green-300 text-green-700"
                          : isCurrent
                          ? "bg-orange-50 border-orange-300 text-orange-700"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                      }`}
                    >
                      <span className="text-2xl">{c.char}</span>
                      <span className="text-xs font-normal">{c.pinyin}</span>
                      <span className="text-xs">{isLearned ? "✅" : isCurrent ? "📖" : "🔒"}</span>
                    </Link>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: 编写字表页面**

Write `src/app/learning/literacy/page.tsx`:

```typescript
import { getAllCharacters } from "@/lib/literacy";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CharacterGrid } from "@/components/learning/CharacterGrid";

export default async function LiteracyPage() {
  const session = await auth();
  const currentChildId = (session as any)?.currentChildId;

  let learnedCharIds: string[] = [];
  let currentCharId: string | null = null;

  if (currentChildId) {
    const records = await prisma.learningRecord.findMany({
      where: { childId: currentChildId, type: "test" },
      select: { charId: true },
    });
    learnedCharIds = [...new Set(records.map((r) => r.charId))];

    const todayCheckIn = await prisma.checkInRecord.findFirst({
      where: { childId: currentChildId, date: new Date().toISOString().slice(0, 10) },
    });
    currentCharId = todayCheckIn?.charId || null;
  }

  const characters = getAllCharacters();

  return (
    <CharacterGrid
      characters={characters}
      learnedCharIds={learnedCharIds}
      currentCharId={currentCharId}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add character grid and literacy list page"
```

---

### Task 12: 学习步骤组件（字卡 + 描红 + 测试）

**Files:**
- Create: `src/components/learning/CharacterCard.tsx`
- Create: `src/components/learning/WritingCanvas.tsx`
- Create: `src/components/learning/QuizOptions.tsx`
- Create: `src/components/learning/StepIndicator.tsx`

**Interfaces:**
- Consumes: `useSpeech()` from `@/hooks/useSpeech`
- Produces: 三个步骤组件 + 步骤指示器

- [ ] **Step 1: 编写 StepIndicator**

Write `src/components/learning/StepIndicator.tsx`:

```typescript
import type { LearningStep } from "@/types";

interface Props {
  currentStep: LearningStep;
  step1Complete: boolean;
  step2Complete: boolean;
}

const steps = [
  { step: 1, label: "字卡" },
  { step: 2, label: "跟写" },
  { step: 3, label: "测试" },
];

export function StepIndicator({ currentStep, step1Complete, step2Complete }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.step} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              s.step === currentStep
                ? "bg-orange-500 text-white"
                : s.step === 1 && step1Complete
                ? "bg-green-500 text-white"
                : s.step === 2 && step2Complete
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {s.step === currentStep ? s.step : (s.step === 1 && step1Complete) || (s.step === 2 && step2Complete) ? "✓" : s.step}
          </div>
          <span className="text-sm text-gray-500">{s.label}</span>
          {i < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-300" />}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 编写 CharacterCard（步骤1）**

Write `src/components/learning/CharacterCard.tsx`:

```typescript
"use client";

import type { LiteracyContent } from "@/types";
import { useSpeech } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  character: LiteracyContent;
  onComplete: () => void;
}

export function CharacterCard({ character, onComplete }: Props) {
  const { speak, speaking, supported } = useSpeech();

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center py-8 space-y-6">
        <div className="text-8xl">{character.emoji}</div>
        <div className="text-7xl font-bold text-orange-700">{character.char}</div>
        <div className="text-2xl text-gray-600">{character.pinyin}</div>

        <div className="grid grid-cols-2 gap-4 text-center w-full max-w-xs">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-500">部首</div>
            <div className="text-lg font-bold">{character.radical}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-500">笔画</div>
            <div className="text-lg font-bold">{character.strokes}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">组词</div>
          <div className="flex gap-2 justify-center flex-wrap">
            {character.words.map((w) => (
              <span key={w} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">{w}</span>
            ))}
          </div>
        </div>

        <div className="text-center text-gray-600 italic">
          {character.sentences[0]}
        </div>

        {supported && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => speak(character.char)}
            disabled={speaking}
            className="h-12"
          >
            🔊 {speaking ? "播放中..." : "点击发音"}
          </Button>
        )}

        <Button onClick={onComplete} size="lg" className="h-12 px-8">
          下一步 →
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 编写 WritingCanvas（步骤2）**

Write `src/components/learning/WritingCanvas.tsx`:

```typescript
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  char: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function WritingCanvas({ char, onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const drawBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = `${size * 0.7}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, canvas.width / 2, canvas.height / 2);
  }, [char]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const size = Math.min(parent.clientWidth - 32, 300);
      canvas.width = size;
      canvas.height = size;
      drawBackground();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawBackground]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center py-8 space-y-4">
        <h3 className="text-xl font-bold">✏️ 跟写练习</h3>
        <p className="text-sm text-gray-500">在灰色字上描红</p>
        <canvas
          ref={canvasRef}
          className="border-2 border-dashed border-gray-300 rounded-xl touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onSkip} className="h-12 min-w-[80px]">
            跳过
          </Button>
          <Button onClick={onComplete} disabled={!hasDrawn} className="h-12 min-w-[80px]">
            {hasDrawn ? "完成 ✓" : "请先描红"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: 编写 QuizOptions（步骤3）**

Write `src/components/learning/QuizOptions.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import type { LiteracyContent } from "@/types";
import { useSpeech } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  character: LiteracyContent;
  allCharacters: LiteracyContent[];
  onComplete: (correct: boolean) => void;
}

export function QuizOptions({ character, allCharacters, onComplete }: Props) {
  const { speak, supported } = useSpeech();
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = useMemo(() => {
    const others = allCharacters
      .filter((c) => c.id !== character.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [...others, character].sort(() => Math.random() - 0.5);
  }, [character, allCharacters]);

  const handleSelect = (id: string) => {
    if (answered) return;
    setSelected(id);
    setAnswered(true);
    onComplete(id === character.id);
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center py-8 space-y-6">
        <h3 className="text-xl font-bold">🎯 认读测试</h3>
        <p className="text-sm text-gray-500">听发音，选择正确的汉字</p>

        {supported && (
          <Button variant="outline" size="lg" onClick={() => speak(character.char)} className="h-12">
            🔊 点击听发音
          </Button>
        )}

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {options.map((opt) => {
            const isCorrect = opt.id === character.id;
            const isSelected = opt.id === selected;
            let bgColor = "bg-white hover:bg-gray-50";
            if (answered && isSelected) {
              bgColor = isCorrect ? "bg-green-100 border-green-500" : "bg-red-100 border-red-500";
            } else if (answered && isCorrect) {
              bgColor = "bg-green-100 border-green-500";
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={answered}
                className={`h-24 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-colors min-h-[72px] ${bgColor}`}
              >
                {opt.char}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`text-lg font-bold ${selected === character.id ? "text-green-600" : "text-red-600"}`}>
            {selected === character.id ? "✅ 正确！" : "❌ 再试一次"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add learning step components (CharacterCard, WritingCanvas, QuizOptions, StepIndicator)"
```

---

### Task 13: 单字学习页 + 学习结果页

**Files:**
- Create: `src/app/learning/literacy/[id]/page.tsx`
- Create: `src/app/learning/literacy/result/page.tsx`

**Interfaces:**
- Consumes: `getCharacterById()`, `getAllCharacters()` from `@/lib/literacy`, `useLearning()` from `@/store/LearningContext`
- Produces: `/learning/literacy/[id]` 和 `/learning/literacy/result` 页面

- [ ] **Step 1: 编写单字学习页**

Write `src/app/learning/literacy/[id]/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCharacterById, getAllCharacters } from "@/lib/literacy";
import { CharacterCard } from "@/components/learning/CharacterCard";
import { WritingCanvas } from "@/components/learning/WritingCanvas";
import { QuizOptions } from "@/components/learning/QuizOptions";
import { StepIndicator } from "@/components/learning/StepIndicator";
import type { LearningStep } from "@/types";

export default function CharacterLearnPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const character = getCharacterById(id);
  const allCharacters = getAllCharacters();

  const [currentStep, setCurrentStep] = useState<LearningStep>(1);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!character) router.push("/learning/literacy");
  }, [character, router]);

  if (!character) return null;

  const handleStep1Complete = () => {
    setStep1Complete(true);
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setStep2Complete(true);
    setCurrentStep(3);
  };

  const handleQuizComplete = (correct: boolean) => {
    setQuizCorrect(correct);
    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Save learning records
    fetch("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        charId: character.id,
        step1Complete: true,
        step2Complete: true,
        quizCorrect: correct,
        duration,
      }),
    }).then(() => {
      router.push(`/learning/literacy/result?charId=${character.id}&correct=${correct}&duration=${duration}`);
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.push("/learning/literacy")}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← 返回字表
      </button>

      <StepIndicator currentStep={currentStep} step1Complete={step1Complete} step2Complete={step2Complete} />

      {currentStep === 1 && <CharacterCard character={character} onComplete={handleStep1Complete} />}
      {currentStep === 2 && (
        <WritingCanvas char={character.char} onComplete={handleStep2Complete} onSkip={handleStep2Complete} />
      )}
      {currentStep === 3 && (
        <QuizOptions character={character} allCharacters={allCharacters} onComplete={handleQuizComplete} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 编写学习结果页**

Write `src/app/learning/literacy/result/page.tsx`:

```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCharacterById } from "@/lib/literacy";
import { useEffect, useState } from "react";

export default function LearningResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const charId = searchParams.get("charId") || "";
  const correct = searchParams.get("correct") === "true";
  const duration = parseInt(searchParams.get("duration") || "0");

  const character = getCharacterById(charId);
  const [checkInResult, setCheckInResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/learning", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charId, correct }),
    })
      .then((r) => r.json())
      .then((data) => setCheckInResult(data.message));
  }, [charId, correct]);

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="flex flex-col items-center py-8 space-y-6">
          <div className="text-6xl">{correct ? "🎉" : "💪"}</div>
          <h2 className="text-2xl font-bold">
            {correct ? "学习完成！" : "继续加油！"}
          </h2>

          {character && (
            <div className="text-center">
              <div className="text-5xl font-bold text-orange-700">{character.char}</div>
              <div className="text-gray-500">{character.pinyin}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-center w-full">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">得分</div>
              <div className="text-2xl font-bold text-green-600">+5</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">用时</div>
              <div className="text-2xl font-bold">{duration}秒</div>
            </div>
          </div>

          {checkInResult && (
            <div className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-full">
              {checkInResult}
            </div>
          )}

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => router.push("/dashboard")}
            >
              返回工作台
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={() => router.push("/learning/literacy")}
            >
              继续学习
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add character learning page and result page"
```

---

### Task 14: 学习记录 API

**Files:**
- Create: `src/app/api/learning/route.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `auth()` from `@/lib/auth`
- Produces: `POST /api/learning` (创建学习记录), `PUT /api/learning` (完成学习+积分+打卡更新)

- [ ] **Step 1: 编写学习记录 API**

Write `src/app/api/learning/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/points";
import { calculateStreak } from "@/lib/streak";
import { getPetState } from "@/lib/pet";

export async function POST(req: Request) {
  const session = await auth();
  const childId = (session as any)?.currentChildId;
  if (!childId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { charId, step1Complete, step2Complete, quizCorrect, duration } = await req.json();

  // 创建三条学习记录
  await prisma.learningRecord.createMany({
    data: [
      { childId, charId, type: "learn", duration: Math.floor(duration / 3) },
      { childId, charId, type: "practice", duration: Math.floor(duration / 3) },
      { childId, charId, type: "test", score: quizCorrect ? 5 : 0, accuracy: quizCorrect ? 1 : 0, duration: Math.floor(duration / 3) },
    ],
  });

  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const session = await auth();
  const childId = (session as any)?.currentChildId;
  if (!childId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { charId, correct } = await req.json();
  const today = new Date().toISOString().slice(0, 10);

  // 更新或创建今日打卡记录
  const existing = await prisma.checkInRecord.findUnique({
    where: { childId_date: { childId, date: today } },
  });

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });

  const points = calculatePoints(child, existing ? "already_checked" : "new_checkin");
  const streak = calculateStreak(child, existing ? "already_checked" : "new_checkin");

  if (!existing) {
    await prisma.checkInRecord.create({
      data: {
        childId,
        date: today,
        charId,
        completed: true,
        pointsEarned: points,
      },
    });
  }

  const pet = getPetState(child.points + points, streak);

  await prisma.child.update({
    where: { id: childId },
    data: {
      points: { increment: points },
      streak,
      maxStreak: Math.max(child.maxStreak, streak),
      totalCheckIns: existing ? child.totalCheckIns : child.totalCheckIns + 1,
      pet: JSON.stringify(pet),
    },
  });

  const message = existing
    ? "已完成今日学习"
    : `打卡成功！+${points}分`;

  return NextResponse.json({ success: true, message, points, streak });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add learning records API"
```

---

## Phase 3: 打卡 + 积分 + 宠物 + 工作台

### Task 15: 积分 & 打卡 & 宠物工具函数

**Files:**
- Create: `src/lib/points.ts`
- Create: `src/lib/streak.ts`
- Create: `src/lib/pet.ts`

**Interfaces:**
- Produces: `calculatePoints(child, action)`, `calculateStreak(child, action)`, `getPetState(points, streak)`

- [ ] **Step 1: 编写 points.ts**

Write `src/lib/points.ts`:

```typescript
type CheckInAction = "new_checkin" | "already_checked";

export function calculatePoints(
  child: { streak: number },
  action: CheckInAction
): number {
  if (action === "already_checked") return 0;

  let points = 10; // 打卡基础分
  points += 5; // 学习完成 1 个字

  // 连续 7 天额外奖励
  if ((child.streak + 1) % 7 === 0) {
    points += 50;
  }

  return points;
}
```

- [ ] **Step 2: 编写 streak.ts**

Write `src/lib/streak.ts`:

```typescript
type CheckInAction = "new_checkin" | "already_checked";

export function calculateStreak(
  child: { streak: number },
  action: CheckInAction
): number {
  if (action === "already_checked") return child.streak;
  return child.streak + 1;
}
```

- [ ] **Step 3: 编写 pet.ts**

Write `src/lib/pet.ts`:

```typescript
import type { PetState } from "@/types";

export function getPetState(points: number, streak: number): PetState {
  const level = Math.min(10, Math.floor(points / 100) + 1);

  let mood: PetState["mood"] = "sad";
  if (streak >= 3) {
    mood = "happy";
  } else if (streak >= 1) {
    mood = "normal";
  }

  return { type: "cat", name: "小咪", level, mood };
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add points, streak, and pet utility functions"
```

---

### Task 16: 宠物展示 & 工作台组件

**Files:**
- Create: `src/components/pet/PetDisplay.tsx`
- Create: `src/components/dashboard/PointsDisplay.tsx`
- Create: `src/components/dashboard/StreakDisplay.tsx`
- Create: `src/components/dashboard/TodayTask.tsx`
- Create: `src/components/dashboard/QuickLinks.tsx`

**Interfaces:**
- Consumes: `PetState` from `@/types`
- Produces: 工作台子组件

- [ ] **Step 1: 编写 PetDisplay**

Write `src/components/pet/PetDisplay.tsx`:

```typescript
import type { PetState } from "@/types";

const petEmojis: Record<string, string> = {
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
};

const moodEmojis: Record<string, string> = {
  happy: "😊",
  normal: "😐",
  sad: "😢",
};

const moodLabels: Record<string, string> = {
  happy: "开心",
  normal: "一般",
  sad: "低落",
};

interface Props {
  pet: PetState;
  compact?: boolean;
}

export function PetDisplay({ pet, compact }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">{petEmojis[pet.type] || "🐱"}</span>
        <span className="text-sm">Lv.{pet.level}</span>
        <span>{moodEmojis[pet.mood]}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-5xl">{petEmojis[pet.type] || "🐱"}</div>
      <div className="text-lg font-bold">{pet.name}</div>
      <div className="text-sm text-gray-500">Lv.{pet.level}</div>
      <div className="text-sm">
        {moodEmojis[pet.mood]} {moodLabels[pet.mood]}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-orange-400 h-2 rounded-full transition-all"
          style={{ width: `${(pet.level / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编写 PointsDisplay**

Write `src/components/dashboard/PointsDisplay.tsx`:

```typescript
interface Props {
  points: number;
  compact?: boolean;
}

export function PointsDisplay({ points, compact }: Props) {
  if (compact) {
    return <span className="text-sm font-bold text-orange-600">⭐{points}</span>;
  }

  return (
    <div className="bg-orange-50 rounded-lg p-3 text-center">
      <div className="text-sm text-gray-500">积分余额</div>
      <div className="text-2xl font-bold text-orange-600">⭐ {points}</div>
    </div>
  );
}
```

- [ ] **Step 3: 编写 StreakDisplay**

Write `src/components/dashboard/StreakDisplay.tsx`:

```typescript
interface Props {
  streak: number;
  maxStreak: number;
}

export function StreakDisplay({ streak, maxStreak }: Props) {
  return (
    <div className="bg-red-50 rounded-lg p-3 text-center">
      <div className="text-sm text-gray-500">连续打卡</div>
      <div className="text-2xl font-bold text-red-600">🔥 {streak} 天</div>
      <div className="text-xs text-gray-400">最高 {maxStreak} 天</div>
    </div>
  );
}
```

- [ ] **Step 4: 编写 TodayTask**

Write `src/components/dashboard/TodayTask.tsx`:

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  hasCheckedIn: boolean;
  todayCharId: string | null;
  todayChar: string | null;
}

export function TodayTask({ hasCheckedIn, todayCharId, todayChar }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📋 今日任务</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCheckedIn ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-lg font-bold text-green-600">今日打卡已完成！</div>
            <div className="text-sm text-gray-500">明天再来学习新字吧~</div>
          </div>
        ) : todayCharId ? (
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-700 mb-2">{todayChar}</div>
            <div className="text-sm text-gray-500 mb-4">今日学习目标</div>
            <Link href={`/learning/literacy/${todayCharId}`}>
              <Button className="w-full h-12">开始学习</Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-sm text-gray-500 mb-4">去字表选择一个字开始学习吧！</div>
            <Link href="/learning/literacy">
              <Button className="w-full h-12">📚 进入识字学习</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: 编写 QuickLinks**

Write `src/components/dashboard/QuickLinks.tsx`:

```typescript
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const links = [
  { href: "/learning/literacy", icon: "🔤", label: "识字学习", color: "bg-orange-50 hover:bg-orange-100" },
  { href: "/dashboard/calendar", icon: "📅", label: "打卡日历", color: "bg-blue-50 hover:bg-blue-100" },
  { href: "/parent/report", icon: "📊", label: "学习报告", color: "bg-green-50 hover:bg-green-100" },
];

export function QuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          <Card className={`${link.color} transition-colors cursor-pointer h-full`}>
            <CardContent className="flex flex-col items-center justify-center py-4 gap-1">
              <span className="text-2xl">{link.icon}</span>
              <span className="text-sm font-medium">{link.label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add pet display, dashboard components (Points, Streak, TodayTask, QuickLinks)"
```

---

### Task 17: 打卡日历页面

**Files:**
- Create: `src/components/calendar/Calendar.tsx`
- Create: `src/app/dashboard/calendar/page.tsx`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `auth()` from `@/lib/auth`
- Produces: `/dashboard/calendar` 页面

- [ ] **Step 1: 编写 Calendar 组件**

Write `src/components/calendar/Calendar.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  checkedDates: string[];
  streak: number;
  totalCheckIns: number;
}

export function Calendar({ checkedDates, streak, totalCheckIns }: Props) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
            ←
          </Button>
          <span>{year}年 {month + 1}月</span>
          <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
            →
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayLabels.map((d) => (
            <div key={d} className="text-sm text-gray-500 py-1">{d}</div>
          ))}
          {weeks.flat().map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isChecked = checkedDates.includes(dateStr);
            const isToday = dateStr === today;
            return (
              <div
                key={dateStr}
                className={`aspect-square flex items-center justify-center rounded-md text-sm font-medium min-h-[36px] ${
                  isChecked
                    ? "bg-green-100 text-green-700"
                    : isToday
                    ? "border-2 border-orange-400 text-orange-700"
                    : "text-gray-600"
                }`}
              >
                {isChecked ? "✅" : day}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-4 pt-4 border-t text-sm">
          <span>🔥 连续打卡: <strong>{streak}天</strong></span>
          <span>📅 累计打卡: <strong>{totalCheckIns}天</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 编写日历页面**

Write `src/app/dashboard/calendar/page.tsx`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Calendar } from "@/components/calendar/Calendar";

export default async function CalendarPage() {
  const session = await auth();
  const childId = (session as any)?.currentChildId;

  let checkedDates: string[] = [];
  let streak = 0;
  let totalCheckIns = 0;

  if (childId) {
    const records = await prisma.checkInRecord.findMany({
      where: { childId, completed: true },
      select: { date: true },
      orderBy: { date: "desc" },
    });
    checkedDates = records.map((r) => r.date);

    const child = await prisma.child.findUnique({
      where: { id: childId },
      select: { streak: true, totalCheckIns: true },
    });
    streak = child?.streak || 0;
    totalCheckIns = child?.totalCheckIns || 0;
  }

  return (
    <div className="max-w-md mx-auto">
      <Calendar checkedDates={checkedDates} streak={streak} totalCheckIns={totalCheckIns} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add calendar page"
```

---

### Task 18: 工作台首页

**Files:**
- Create: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `auth()` from `@/lib/auth`, `prisma` from `@/lib/prisma`, dashboard components
- Produces: `/dashboard` 页面

- [ ] **Step 1: 编写工作台首页**

Write `src/app/dashboard/page.tsx`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextCharacter } from "@/lib/literacy";
import { TodayTask } from "@/components/dashboard/TodayTask";
import { QuickLinks } from "@/components/dashboard/QuickLinks";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  const childId = (session as any)?.currentChildId;

  let child = null;
  let hasCheckedIn = false;
  let todayCharId: string | null = null;
  let todayChar: string | null = null;

  if (childId) {
    child = await prisma.child.findUnique({ where: { id: childId } });

    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = await prisma.checkInRecord.findUnique({
      where: { childId_date: { childId, date: today } },
    });
    hasCheckedIn = !!todayRecord?.completed;

    if (!hasCheckedIn) {
      const learnedRecords = await prisma.learningRecord.findMany({
        where: { childId, type: "test" },
        select: { charId: true },
      });
      const learnedIds = [...new Set(learnedRecords.map((r) => r.charId))];
      const nextChar = getNextCharacter(learnedIds);
      todayCharId = nextChar?.id || null;
      todayChar = nextChar?.char || null;
    } else {
      todayCharId = todayRecord!.charId;
      todayChar = todayRecord!.charId || null;
    }
  }

  if (!child) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">请先创建孩子档案</p>
      </div>
    );
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? "早上好" : now.getHours() < 18 ? "下午好" : "晚上好";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{child.avatar}</span>
            <div>
              <h1 className="text-xl font-bold">
                {child.name}，{greeting}！
              </h1>
              <p className="text-gray-500">
                {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-center">
            <div className="flex-1">
              <div className="text-2xl font-bold text-orange-600">⭐ {child.points}</div>
              <div className="text-xs text-gray-500">积分</div>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-red-600">🔥 {child.streak}天</div>
              <div className="text-xs text-gray-500">连续打卡</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TodayTask hasCheckedIn={hasCheckedIn} todayCharId={todayCharId} todayChar={todayChar} />
      <QuickLinks />
    </div>
  );
}
```

- [ ] **Step 2: 验证工作台**

```bash
npm run dev
# 登录后访问 /dashboard，应看到：
# - 欢迎语 + 日期 + 积分 + 打卡天数
# - 今日任务卡片（显示待学习汉字）
# - 快捷入口（识字、日历、报告）
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add dashboard home page"
```

---

## Phase 4: 家长中心

### Task 19: 孩子管理 API + 页面

**Files:**
- Create: `src/app/api/children/route.ts`
- Create: `src/components/parent/ChildList.tsx`
- Create: `src/components/parent/ChildForm.tsx`
- Create: `src/app/parent/children/page.tsx`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `auth()` from `@/lib/auth`
- Produces: 孩子 CRUD API + 管理页面

- [ ] **Step 1: 编写孩子管理 API**

Write `src/app/api/children/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("id");

  if (childId) {
    const child = await prisma.child.findFirst({
      where: { id: childId, parentId },
    });
    if (!child) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(child);
  }

  const children = await prisma.child.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(children);
}

export async function POST(req: Request) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { name, avatar, petType } = await req.json();
  if (!name) return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });

  const petTypes = ["cat", "dog", "rabbit"] as const;
  const petNames: Record<string, string> = { cat: "小咪", dog: "旺财", rabbit: "小白" };
  const type = petTypes.includes(petType) ? petType : "cat";

  const child = await prisma.child.create({
    data: {
      parentId,
      name,
      avatar: avatar || "👦",
      pet: JSON.stringify({ type, name: petNames[type], level: 1, mood: "normal" }),
    },
  });

  return NextResponse.json(child, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("id");
  if (!childId) return NextResponse.json({ error: "缺少孩子ID" }, { status: 400 });

  await prisma.child.deleteMany({ where: { id: childId, parentId } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: 编写 ChildList 组件**

Write `src/components/parent/ChildList.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChild } from "@/store/ChildContext";

interface ChildItem {
  id: string;
  name: string;
  avatar: string;
  points: number;
}

interface Props {
  onAdd: () => void;
}

export function ChildList({ onAdd }: Props) {
  const { children, child: currentChild, setCurrentChild, refreshChildren } = useChild();

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个孩子吗？相关的学习记录也会被删除。")) return;
    await fetch(`/api/children?id=${id}`, { method: "DELETE" });
    await refreshChildren();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">👶 孩子管理</h2>
        <Button onClick={onAdd} size="sm">+ 添加孩子</Button>
      </div>
      {children.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">👶</div>
          <p>还没有添加孩子</p>
          <Button onClick={onAdd} className="mt-4">添加第一个孩子</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((c: ChildItem) => (
            <Card key={c.id} className={`${c.id === currentChild?.id ? "border-orange-400" : ""}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{c.avatar}</span>
                  <div>
                    <div className="font-bold">{c.name}</div>
                    <div className="text-sm text-gray-500">⭐ {c.points} 分</div>
                  </div>
                  {c.id === currentChild?.id && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">当前</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {c.id !== currentChild?.id && (
                    <Button variant="outline" size="sm" onClick={() => setCurrentChild(c.id)}>
                      切换
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-500">
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 编写 ChildForm 组件**

Write `src/components/parent/ChildForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const avatars = ["👦", "👧", "🧒", "👶"];
const pets = [
  { type: "cat", emoji: "🐱", label: "小猫" },
  { type: "dog", emoji: "🐶", label: "小狗" },
  { type: "rabbit", emoji: "🐰", label: "小兔" },
];

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChildForm({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👦");
  const [petType, setPetType] = useState("cat");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), avatar, petType }),
    });
    if (res.ok) {
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>添加孩子</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>姓名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入孩子姓名" required className="h-12" />
          </div>
          <div className="space-y-2">
            <Label>选择头像</Label>
            <div className="flex gap-3">
              {avatars.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`text-3xl w-12 h-12 rounded-lg flex items-center justify-center border-2 min-w-[48px] min-h-[48px] ${
                    avatar === a ? "border-orange-400 bg-orange-50" : "border-gray-200"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>选择宠物</Label>
            <div className="flex gap-3">
              {pets.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => setPetType(p.type)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 min-w-[72px] ${
                    petType === p.type ? "border-orange-400 bg-orange-50" : "border-gray-200"
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-xs">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12">
              取消
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1 h-12">
              {loading ? "添加中..." : "确认添加"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: 编写孩子管理页面**

Write `src/app/parent/children/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useChild } from "@/store/ChildContext";
import { ChildList } from "@/components/parent/ChildList";
import { ChildForm } from "@/components/parent/ChildForm";

export default function ChildrenPage() {
  const [showForm, setShowForm] = useState(false);
  const { refreshChildren } = useChild();

  return (
    <div className="max-w-md mx-auto">
      {showForm ? (
        <ChildForm
          onSuccess={() => {
            setShowForm(false);
            refreshChildren();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <ChildList onAdd={() => setShowForm(true)} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add children CRUD API and management page"
```

---

### Task 20: 家长中心首页 + 学习报告

**Files:**
- Create: `src/app/parent/page.tsx`
- Create: `src/components/parent/WeeklyReport.tsx`
- Create: `src/app/parent/report/page.tsx`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `auth()` from `@/lib/auth`
- Produces: `/parent` 和 `/parent/report` 页面

- [ ] **Step 1: 编写家长中心首页**

Write `src/app/parent/page.tsx`:

```typescript
"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useChild } from "@/store/ChildContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ParentPage() {
  const { child } = useChild();

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">👤 家长中心</h1>

      {child && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">当前孩子</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{child.avatar}</span>
              <div>
                <div className="text-lg font-bold">{child.name}</div>
                <div className="text-sm text-gray-500">
                  ⭐ {child.points} 分 · 🔥 连续 {child.streak} 天
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Link href="/parent/children">
          <Button variant="outline" className="w-full h-12 justify-start text-lg">
            👶 孩子管理
          </Button>
        </Link>
        <Link href="/parent/report">
          <Button variant="outline" className="w-full h-12 justify-start text-lg">
            📊 学习报告
          </Button>
        </Link>
      </div>

      <Button
        variant="ghost"
        className="w-full text-red-500"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        退出登录
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 编写 WeeklyReport 组件**

Write `src/components/parent/WeeklyReport.tsx`:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  weekLabel: string;
  checkedDays: number;
  totalDays: number;
  newChars: number;
  earnedPoints: number;
  streak: number;
  dailyMinutes: { date: string; minutes: number }[];
}

export function WeeklyReport({ weekLabel, checkedDays, totalDays, newChars, earnedPoints, streak, dailyMinutes }: Props) {
  const maxMinutes = Math.max(...dailyMinutes.map((d) => d.minutes), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 本周学习报告</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-500">{weekLabel}</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{checkedDays}/{totalDays}</div>
            <div className="text-sm text-gray-500">📚 本周打卡</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{newChars}</div>
            <div className="text-sm text-gray-500">🔤 新学汉字</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{earnedPoints}</div>
            <div className="text-sm text-gray-500">⭐ 获得积分</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{streak}</div>
            <div className="text-sm text-gray-500">🔥 当前连续</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold mb-3">每日学习时长</h4>
          <div className="flex items-end justify-between gap-2 h-32">
            {dailyMinutes.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full bg-orange-400 rounded-t"
                  style={{ height: `${(d.minutes / maxMinutes) * 100}%`, minHeight: d.minutes > 0 ? "4px" : "0" }}
                />
                <span className="text-xs text-gray-500">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 编写学习报告页面**

Write `src/app/parent/report/page.tsx`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WeeklyReport } from "@/components/parent/WeeklyReport";

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  start.setHours(0, 0, 0, 0);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d <= now) {
      days.push(d.toISOString().slice(0, 10));
    }
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
    days,
    weekLabel: `${start.toLocaleDateString("zh-CN")} - ${now.toLocaleDateString("zh-CN")}`,
  };
}

export default async function ReportPage() {
  const session = await auth();
  const childId = (session as any)?.currentChildId;

  if (!childId) {
    return <div className="text-center py-12 text-gray-500">请先选择孩子</div>;
  }

  const { days, weekLabel } = getWeekRange();

  const checkInRecords = await prisma.checkInRecord.findMany({
    where: { childId, date: { in: days }, completed: true },
  });

  const learningRecords = await prisma.learningRecord.findMany({
    where: {
      childId,
      createdAt: {
        gte: new Date(days[0]),
        lte: new Date(),
      },
    },
  });

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { streak: true },
  });

  const checkedDays = checkInRecords.length;
  const newChars = [...new Set(learningRecords.filter((r) => r.type === "test").map((r) => r.charId))].length;
  const earnedPoints = checkInRecords.reduce((sum, r) => sum + r.pointsEarned, 0);

  const dailyMinutes = days.map((date) => {
    const dayRecords = learningRecords.filter((r) => {
      const recordDate = r.createdAt.toISOString().slice(0, 10);
      return recordDate === date;
    });
    const totalDuration = dayRecords.reduce((sum, r) => sum + r.duration, 0);
    return { date, minutes: Math.round(totalDuration / 60) };
  });

  return (
    <div className="max-w-md mx-auto">
      <WeeklyReport
        weekLabel={weekLabel}
        checkedDays={checkedDays}
        totalDays={days.length}
        newChars={newChars}
        earnedPoints={earnedPoints}
        streak={child?.streak || 0}
        dailyMinutes={dailyMinutes}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add parent center home and weekly report pages"
```

---

### Task 21: 最终验证 & 修复

- [ ] **Step 1: 清理 & 重新初始化数据库**

```bash
rm -f prisma/dev.db
npm run db:setup
```

- [ ] **Step 2: 启动开发服务器，完整走通 MVP 流程**

```bash
npm run dev
```

验证清单：
1. 访问 `http://localhost:3000` → 重定向到 `/login`
2. 注册新账号 → 自动登录 → 进入 `/dashboard`
3. 工作台显示"请先创建孩子档案"
4. 进入家长中心 → 孩子管理 → 创建孩子
5. 返回工作台 → 看到今日任务 → 点击"开始学习"
6. 完成字卡 → 描红 → 测试 → 看到结果页
7. 返回工作台 → 今日任务显示"已完成"
8. 进入打卡日历 → 看到今日打卡标记
9. 进入家长中心 → 学习报告 → 看到本周数据
10. 缩小浏览器宽度到 <768px → 布局切换为移动端
11. 移动端底部 Tab 导航各页面正常

- [ ] **Step 3: 修复发现的问题**

- [ ] **Step 4: 最终 Commit**

```bash
git add -A && git commit -m "feat: complete MVP - all features verified"
```