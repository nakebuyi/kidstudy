# Parent/Child Account Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate parent and child accounts — parents access parent center, children log in independently to see learning tasks, check-in, points, and pet.

**Architecture:** Add `ChildAccount` model for child login credentials, extend `Parent` with `nickname`, update NextAuth to authenticate both account types, enforce role-based routing in middleware, and conditionally render UI elements (TopNav, Sidebar) based on session role.

**Tech Stack:** Next.js 16, React 19, Prisma + SQLite (Turso), NextAuth v5, shadcn/ui

## Global Constraints

- Desktop breakpoint >= 768px, 48x48px minimum touch targets
- bcrypt for password hashing (10 rounds)
- Session uses JWT strategy; role stored in token
- NextAuth `trustHost: true` (already set)
- Existing `Parent` records get `nickname` defaulted to `username`
- Existing `Child` records do NOT get auto-created `ChildAccount` — parent creates on demand

---

## File Structure Map

```
Create:
  src/app/api/children/[id]/account/route.ts   # Child account CRUD endpoint

Modify:
  prisma/schema.prisma                          # +nickname on Parent, +ChildAccount model
  prisma/seed.ts                                # +nickname on seed data
  src/lib/auth.ts                               # Dual-table auth, role in token
  src/app/api/auth/register/route.ts            # +nickname field
  src/components/auth/RegisterForm.tsx           # +nickname input
  src/middleware.ts                              # Role-based routing
  src/store/ChildContext.tsx                     # Role-aware child loading
  src/components/layout/TopNav.tsx               # Role-based parent center link
  src/components/layout/Sidebar.tsx              # Role-based child switcher
  src/app/parent/page.tsx                        # Enhanced parent center
  src/app/parent/children/page.tsx               # +child account management
  src/app/dashboard/page.tsx                     # Child-only dashboard (greeting)
```

---

### Task 1: Prisma Schema — Add `nickname` to `Parent` and `ChildAccount` model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces: `Parent.nickname` (String), `ChildAccount` model with fields: `id`, `childId` (unique FK to Child), `username` (unique), `passwordHash`, `nickname`, `createdAt`

- [ ] **Step 1: Add `nickname` to `Parent` model**

In `prisma/schema.prisma`, add `nickname` field to the `Parent` model:

```prisma
model Parent {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  nickname     String   @default("")  // NEW
  children     Child[]
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: Add `ChildAccount` model**

In `prisma/schema.prisma`, add the new model after `Child`:

```prisma
model ChildAccount {
  id           String   @id @default(uuid())
  childId      String   @unique
  child        Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  username     String   @unique
  passwordHash String
  nickname     String
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 3: Push schema changes**

Run: `npx prisma db push`
Expected: Schema synced without errors.

- [ ] **Step 4: Update seed data**

In `prisma/seed.ts`, add `nickname` to the parent creation:

```typescript
// Find the line: await prisma.parent.create({
// Add nickname field:
await prisma.parent.create({
  data: {
    username: "parent",
    passwordHash: await bcrypt.hash("123456", 10),
    nickname: "家长",  // NEW
  },
});
```

- [ ] **Step 5: Run seed**

Run: `npx tsx prisma/seed.ts`
Expected: Seed completes without errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat: add nickname to Parent, add ChildAccount model"
```

---

### Task 2: Auth — Dual-table login and role in session

**Files:**
- Modify: `src/lib/auth.ts`

**Interfaces:**
- Consumes: `Parent.nickname`, `ChildAccount` model from Task 1
- Produces: `token.role` ("parent" | "child"), `token.nickname`, `token.childId` (child only)
- Produces: `session.role`, `session.nickname`, `session.currentChildId` (child only)

- [ ] **Step 1: Update `authorize` to search both tables**

In `src/lib/auth.ts`, replace the `authorize` function:

```typescript
async authorize(credentials) {
  if (!credentials?.username || !credentials?.password) return null;

  const username = credentials.username as string;
  const password = credentials.password as string;

  // 1. Try Parent
  const parent = await prisma.parent.findUnique({
    where: { username },
    include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  if (parent) {
    const isValid = await bcrypt.compare(password, parent.passwordHash);
    if (!isValid) return null;
    return {
      id: parent.id,
      name: parent.username,
      role: "parent" as const,
      nickname: parent.nickname || parent.username,
      currentChildId: parent.children[0]?.id || null,
    };
  }

  // 2. Try ChildAccount
  const childAccount = await prisma.childAccount.findUnique({
    where: { username },
    include: { child: true },
  });

  if (childAccount) {
    const isValid = await bcrypt.compare(password, childAccount.passwordHash);
    if (!isValid) return null;
    return {
      id: childAccount.id,
      name: childAccount.child.name,
      role: "child" as const,
      nickname: childAccount.nickname,
      childId: childAccount.childId,
    };
  }

  return null;
},
```

- [ ] **Step 2: Update JWT callback to store role and nickname**

In `src/lib/auth.ts`, update the `jwt` callback:

```typescript
async jwt({ token, user, trigger, session }) {
  if (user) {
    token.id = user.id;
    token.username = user.name;
    token.role = (user as any).role;           // NEW
    token.nickname = (user as any).nickname;   // NEW
    if ((user as any).role === "child") {
      token.currentChildId = (user as any).childId;  // child's own child record
    } else {
      token.currentChildId = (user as any).currentChildId;  // parent's selected child
    }
  }
  if (trigger === "update" && session?.currentChildId) {
    token.currentChildId = session.currentChildId;
  }
  return token;
},
```

- [ ] **Step 3: Update session callback to expose role**

In `src/lib/auth.ts`, update the `session` callback:

```typescript
async session({ session, token }) {
  session.user = {
    ...session.user,
    id: token.id as string,
    name: token.username as string,
  };
  (session as any).role = token.role;                // NEW
  (session as any).nickname = token.nickname;         // NEW
  (session as any).currentChildId = token.currentChildId;
  return session;
},
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: dual-table auth with role and nickname in session"
```

---

### Task 3: Registration API — Accept `nickname`

**Files:**
- Modify: `src/app/api/auth/register/route.ts`

**Interfaces:**
- Consumes: `Parent.nickname` from Task 1
- Produces: Creates `Parent` with `nickname` field

- [ ] **Step 1: Add `nickname` to the registration handler**

Replace the `POST` handler in `src/app/api/auth/register/route.ts`:

```typescript
export async function POST(req: Request) {
  try {
    const { username, password, nickname } = await req.json();

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

    // Also check ChildAccount for username collision
    const existingChild = await prisma.childAccount.findUnique({ where: { username } });
    if (existingChild) {
      return NextResponse.json({ error: "用户名已被注册" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.parent.create({
      data: {
        username,
        passwordHash,
        nickname: (nickname || "").trim() || username,  // NEW: default to username
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: add nickname field to registration API"
```

---

### Task 4: Registration Form — Add `nickname` input

**Files:**
- Modify: `src/components/auth/RegisterForm.tsx`

**Interfaces:**
- Consumes: Updated `/api/auth/register` from Task 3

- [ ] **Step 1: Add `nickname` state and input field**

In `src/components/auth/RegisterForm.tsx`:

Add state after `password`:
```typescript
const [nickname, setNickname] = useState("");
```

Add input before the username field, inside the form:
```tsx
<div className="space-y-2">
  <Label htmlFor="nickname">昵称</Label>
  <Input
    id="nickname"
    type="text"
    value={nickname}
    onChange={(e) => setNickname(e.target.value)}
    placeholder="请输入昵称"
    required
    className="h-12"
  />
</div>
```

Update the fetch call to include `nickname`:
```typescript
body: JSON.stringify({ username, password, nickname }),
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/RegisterForm.tsx
git commit -m "feat: add nickname field to registration form"
```

---

### Task 5: Child Account API — Create and delete child login accounts

**Files:**
- Create: `src/app/api/children/[id]/account/route.ts`

**Interfaces:**
- Consumes: `ChildAccount` model from Task 1
- Produces: `POST /api/children/[id]/account` — creates `ChildAccount`
- Produces: `DELETE /api/children/[id]/account` — removes `ChildAccount`

- [ ] **Step 1: Create the route file**

Create `src/app/api/children/[id]/account/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// POST — Create child login account
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || (session as any).role !== "parent") {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const { id: childId } = await params;

  // Verify child belongs to this parent
  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const { username, password, nickname } = await req.json();

  if (!username || !password || !nickname) {
    return NextResponse.json({ error: "用户名、密码和昵称不能为空" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
  }

  // Check username uniqueness (both Parent and ChildAccount)
  const existingParent = await prisma.parent.findUnique({ where: { username } });
  const existingChild = await prisma.childAccount.findUnique({ where: { username } });
  if (existingParent || existingChild) {
    return NextResponse.json({ error: "用户名已被使用" }, { status: 400 });
  }

  // Check if child already has an account
  const existing = await prisma.childAccount.findUnique({ where: { childId } });
  if (existing) {
    return NextResponse.json({ error: "该孩子已有登录账号" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.childAccount.create({
    data: {
      childId,
      username,
      passwordHash,
      nickname: nickname.trim(),
    },
  });

  return NextResponse.json({ id: account.id, username: account.username, nickname: account.nickname }, { status: 201 });
}

// DELETE — Remove child login account
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || (session as any).role !== "parent") {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const { id: childId } = await params;

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  await prisma.childAccount.deleteMany({ where: { childId } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/children/[id]/account/
git commit -m "feat: add child account CRUD API endpoint"
```

---

### Task 6: Middleware — Role-based route enforcement

**Files:**
- Modify: `src/middleware.ts`

**Interfaces:**
- Consumes: `session.role` from Task 2
- Produces: Redirects based on role + route pattern

- [ ] **Step 1: Update middleware with role checks**

Replace `src/middleware.ts`:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/register"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const role = (req.auth as any)?.role as "parent" | "child" | undefined;

  if (!isLoggedIn && !publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && publicRoutes.includes(path)) {
    if (role === "parent") {
      return NextResponse.redirect(new URL("/parent", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isLoggedIn && role === "child") {
    // Child cannot access parent routes
    if (path.startsWith("/parent")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (isLoggedIn && role === "parent") {
    // Parent home is /parent, not /dashboard
    if (path === "/dashboard" || path.startsWith("/dashboard/") || path.startsWith("/games/")) {
      return NextResponse.redirect(new URL("/parent", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add role-based route enforcement in middleware"
```

---

### Task 7: ChildContext — Role-aware child loading

**Files:**
- Modify: `src/store/ChildContext.tsx`

**Interfaces:**
- Consumes: `session.role`, `session.currentChildId` from Task 2
- Produces: Works for both parent (loads children list) and child (loads single child)

- [ ] **Step 1: Make ChildProvider role-aware**

In `src/store/ChildContext.tsx`, update the `fetchChildren` and initialization logic:

In the `useEffect` that fetches children, add a guard for the `role`:

```typescript
const role = (session as any)?.role as string | undefined;
const currentChildId = (session as any)?.currentChildId;

useEffect(() => {
  if (role === "parent") {
    fetchChildren();
  } else if (role === "child" && currentChildId) {
    fetchChild(currentChildId);
  }
}, [fetchChildren, fetchChild, session, role, currentChildId]);
```

In `setCurrentChild`, only allow parents to switch children:

```typescript
const setCurrentChild = useCallback(async (childId: string) => {
  const role = (session as any)?.role;
  if (role !== "parent") return;  // child accounts cannot switch
  await update({ currentChildId: childId });
  await fetchChild(childId);
}, [update, fetchChild, session]);
```

- [ ] **Step 2: Commit**

```bash
git add src/store/ChildContext.tsx
git commit -m "feat: make ChildContext role-aware for parent vs child"
```

---

### Task 8: TopNav — Role-based rendering

**Files:**
- Modify: `src/components/layout/TopNav.tsx`

**Interfaces:**
- Consumes: `session.role` from Task 2
- Produces: Hides "家长中心" link for child accounts

- [ ] **Step 1: Add role check and conditionally render parent center link**

In `src/components/layout/TopNav.tsx`, add `useSession` import and role check:

```typescript
import { signOut, useSession } from "next-auth/react";

// Inside the component:
const { data: session } = useSession();
const role = (session as any)?.role as string | undefined;
```

Replace the "家长中心" link with a conditional:
```tsx
{role === "parent" && (
  <Link href="/parent" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">
    👤 家长中心
  </Link>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/TopNav.tsx
git commit -m "feat: hide parent center link for child accounts in TopNav"
```

---

### Task 9: Sidebar — Role-based rendering

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `session.role` from Task 2
- Produces: Hides child switcher dropdown for child accounts

- [ ] **Step 1: Add role check, hide child switcher for children**

In `src/components/layout/Sidebar.tsx`, add `useSession`:

```typescript
import { useSession } from "next-auth/react";

// Inside the component:
const { data: session } = useSession();
const role = (session as any)?.role as string | undefined;
```

Wrap the child selector `DropdownMenu` in a conditional:
```tsx
{role === "parent" && (
  <DropdownMenu>
    {/* ... existing child selector code ... */}
  </DropdownMenu>
)}
```

For child accounts, show their own nickname/avatar directly:
```tsx
{role === "child" && (
  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
    <span className="text-lg">{child.avatar}</span>
    {(session as any)?.nickname || child.name}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: hide child switcher for child accounts in Sidebar"
```

---

### Task 10: Parent Center — Enhanced with child list and quick actions

**Files:**
- Modify: `src/app/parent/page.tsx`

**Interfaces:**
- Consumes: `ChildContext` children list from Task 7

- [ ] **Step 1: Add child list to parent center**

Replace `src/app/parent/page.tsx`:

```tsx
"use client";

import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const parentPages = [
  { key: "report", title: "学习报告", icon: "📊", desc: "查看孩子的学习进度和成绩报告" },
  { key: "children", title: "孩子管理", icon: "👶", desc: "添加、切换和管理孩子档案" },
  { key: "settings", title: "学习设置", icon: "⚙️", desc: "设置每日学习目标和时间限制" },
];

export default function ParentPage() {
  const { children } = useChild();

  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">👤 家长中心</h1>

        {/* Child List */}
        {children.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">👶 我的孩子</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {children.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-3xl">{c.avatar}</span>
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-gray-500">
                        🌟 {c.points} 积分 · 🔥 {c.streak} 天
                      </div>
                    </div>
                    <Link href={`/parent/children`}>
                      <Button variant="outline" size="sm">管理</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {parentPages.map((p) => (
            <Link key={p.key} href={`/parent/${p.key}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <span className="text-4xl">{p.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800 text-lg">{p.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{p.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DesktopLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/parent/page.tsx
git commit -m "feat: enhance parent center with child list and quick actions"
```

---

### Task 11: Children Management — Add child account creation UI

**Files:**
- Modify: `src/app/parent/children/page.tsx`

**Interfaces:**
- Consumes: Child account API from Task 5

- [ ] **Step 1: Add "create account" form for each child**

In `src/app/parent/children/page.tsx`, add state and form for account creation.

Add these state variables after the existing ones:
```typescript
const [accountChildId, setAccountChildId] = useState<string | null>(null);
const [accountUsername, setAccountUsername] = useState("");
const [accountPassword, setAccountPassword] = useState("");
const [accountNickname, setAccountNickname] = useState("");
const [accountLoading, setAccountLoading] = useState(false);
const [accountMessage, setAccountMessage] = useState("");
```

Add the account creation handler:
```typescript
const handleCreateAccount = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!accountChildId || !accountUsername.trim() || !accountPassword.trim() || !accountNickname.trim()) return;
  setAccountLoading(true);
  setAccountMessage("");
  const res = await fetch(`/api/children/${accountChildId}/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: accountUsername.trim(),
      password: accountPassword,
      nickname: accountNickname.trim(),
    }),
  });
  const data = await res.json();
  if (res.ok) {
    setAccountMessage(`✅ 账号创建成功！用户名：${data.username}`);
    setAccountChildId(null);
    setAccountUsername("");
    setAccountPassword("");
    setAccountNickname("");
  } else {
    setAccountMessage(`❌ ${data.error || "创建失败"}`);
  }
  setAccountLoading(false);
};
```

Add a "创建登录账号" button in each child card, after the existing content:
```tsx
<div className="mt-2">
  <Button
    variant="outline"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      setAccountChildId(c.id);
      setAccountNickname(c.name);
      setAccountMessage("");
    }}
  >
    🔑 创建登录账号
  </Button>
</div>
```

Add the account creation form, rendered before the closing `</DesktopLayout>`:
```tsx
{accountChildId && (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">🔑 创建孩子登录账号</CardTitle>
    </CardHeader>
    <CardContent>
      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accountUsername">登录用户名</Label>
          <Input
            id="accountUsername"
            value={accountUsername}
            onChange={(e) => setAccountUsername(e.target.value)}
            placeholder="孩子登录时使用的用户名"
            required
            minLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountPassword">登录密码</Label>
          <Input
            id="accountPassword"
            type="password"
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            placeholder="至少6位密码"
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountNickname">孩子昵称</Label>
          <Input
            id="accountNickname"
            value={accountNickname}
            onChange={(e) => setAccountNickname(e.target.value)}
            placeholder="显示在页面上的昵称"
            required
          />
        </div>
        {accountMessage && (
          <div className={`p-3 rounded-lg text-center font-medium ${
            accountMessage.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {accountMessage}
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={accountLoading}>
            {accountLoading ? "创建中..." : "创建账号"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setAccountChildId(null)}>
            取消
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/parent/children/page.tsx
git commit -m "feat: add child account creation UI to children management"
```

---

### Task 12: Dashboard — Child greeting

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `session.nickname` from Task 2, `ChildContext` from Task 7

- [ ] **Step 1: Update greeting to use nickname**

In `src/app/dashboard/page.tsx`, add `useSession`:

```typescript
import { useSession } from "next-auth/react";

// Inside the component:
const { data: session } = useSession();
const displayName = (session as any)?.nickname || child?.name || "";
```

Update the greeting line:
```tsx
<h1 className="text-2xl font-bold text-gray-800">
  {child ? `${displayName}，早上好！` : "欢迎回来！"}
</h1>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: use nickname in dashboard greeting"
```

---

### Task 13: Final Verification — Build and route test

**Files:**
- None (verification only)

- [ ] **Step 1: Build**

Run: `npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Test parent registration with nickname**

Run:
```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"verifyparent","password":"test123","nickname":"测试家长"}'
```
Expected: `{"success":true}`

- [ ] **Step 3: Test child account creation**

First get a session cookie by logging in as parent, then:
```bash
# Create a child (via API)
curl -s -X POST http://localhost:3000/api/children \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"小红"}'
# Then create account for that child
curl -s -X POST http://localhost:3000/api/children/<child-id>/account \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"username":"xiaohong","password":"test123","nickname":"小红"}'
```
Expected: Returns account info with 201.

- [ ] **Step 4: Test child login**

```bash
curl -s http://localhost:3000/api/auth/signin -c /tmp/cookies.txt
# Get CSRF token
CSRF=$(grep csrf /tmp/cookies.txt | awk '{print $7}')
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&username=xiaohong&password=test123" \
  -b /tmp/cookies.txt -c /tmp/child_cookies.txt \
  -w "\nHTTP: %{http_code}"
```
Expected: 302 redirect.

- [ ] **Step 5: Test middleware enforcement**

Run:
```bash
# Child accessing /dashboard → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard -b /tmp/child_cookies.txt

# Child accessing /parent → 307 redirect to /dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/parent -b /tmp/child_cookies.txt
```
Expected: 200, 307.

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: complete parent/child account separation implementation"
```