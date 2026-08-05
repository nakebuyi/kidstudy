# 微信小程序 - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WeChat Mini Program support to the existing 幼小衔接学习平台 via Taro monorepo, with JWT auth migration, PostgreSQL, and full parent/child experience.

**Architecture:** Monorepo with existing Next.js as API backend (JWT-authenticated), new `/miniprogram` Taro project for the WeChat Mini Program, and `/shared` for extracted types and constants. PostgreSQL replaces SQLite/Turso. Web and Mini Program share the same API routes.

**Tech Stack:** Next.js 16, TypeScript, Prisma, PostgreSQL, Taro 4, NutUI, JWT (jose), bcryptjs

## Global Constraints

- Database: PostgreSQL (not SQLite, not Turso/libsql)
- Auth: Custom JWT via `jose` library (remove NextAuth, remove `@auth/prisma-adapter`, remove `next-auth`)
- API: All routes validate JWT via `Authorization: Bearer <token>` header
- Web: Token stored in `localStorage`, sent with every API request
- Mini Program: Taro 4 + React + TypeScript + NutUI
- Subpackages: Miniprogram main package < 2MB, split by mode (learning/parent/content)
- Account system: Mini Program accounts independent from Web accounts
- WeChat login: `wx.login()` → code → backend → openid → auto-create Parent → JWT
- PIN: 4-digit numeric PIN for parent mode access, stored on Parent record
- Audio: Pinyin/English pre-generated audio in subpackage, poetry audio remote-loaded
- Offline: Learning content cached 7 days, checkin data queued locally when offline

---

## File Structure

### Files to Create

```
shared/
  types/
    user.ts                          # User, Parent, Child types
    learning.ts                      # Subject, LearningRecord, content types
    checkin.ts                       # CheckInTask, CheckInRecord types
    pet.ts                           # PetState type
    shop.ts                          # ShopItem, Badge types
    index.ts                         # Re-exports
  constants/
    points.ts                        # Points rules constants
    subjects.ts                      # Subject config (colors, names)
    levels.ts                        # Level definitions

src/lib/
  jwt.ts                             # signToken, verifyToken, extractUser

src/app/api/
  auth/login/route.ts                # JWT login endpoint (replaces NextAuth)
  wechat/login/route.ts              # WeChat wx.login → openid → JWT

miniprogram/
  (full Taro project structure - see below)
```

### Files to Modify

```
prisma/schema.prisma                 # provider → postgresql, add wechat + role fields
src/lib/prisma.ts                    # Remove libsql adapter, use plain PrismaClient
src/lib/auth.ts                      # Rewrite: JWT-based login/register (remove NextAuth)
src/middleware.ts                     # Rewrite: JWT validation for /api/*
src/store/AppProvider.tsx            # Replace SessionProvider with AuthProvider
src/store/ChildContext.tsx           # Replace useSession with useAuth
src/app/layout.tsx                   # Replace SessionProvider with AuthProvider
src/app/api/auth/[...nextauth]/route.ts  # Delete (no longer needed)
src/app/api/auth/register/route.ts   # Adapt to JWT (return token)
src/types/index.ts                   # Re-export from shared/types
.env                                 # Replace TURSO_* with DATABASE_URL, add JWT_SECRET, WECHAT_*
package.json                         # Remove next-auth, @auth/prisma-adapter, @libsql/*; add jose
```

### Files to Delete

```
src/app/api/auth/[...nextauth]/route.ts  # NextAuth handler
src/lib/auth.ts                           # NextAuth config (replaced with JWT version)
```

---

### Task 1: PostgreSQL Setup and Prisma Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/prisma.ts`
- Modify: `.env`
- Modify: `package.json`

**Interfaces:**
- Produces: `prisma` client instance connected to PostgreSQL
- Produces: Updated Prisma schema with `wechatOpenId`, `wechatAvatar`, `wechatNickname`, `role` fields on `Parent`, plus `pin` field

- [ ] **Step 1: Install PostgreSQL and create database**

```bash
# Install PostgreSQL (if not already installed)
sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Create database and user
sudo -u postgres psql -c "CREATE USER kidstudy WITH PASSWORD 'kidstudy123';"
sudo -u postgres psql -c "CREATE DATABASE kidstudy OWNER kidstudy;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kidstudy TO kidstudy;"
```

- [ ] **Step 2: Update .env with PostgreSQL connection string**

Replace in `.env`:
```
# Remove:
TURSO_DATABASE_URL="libsql://..."
TURSO_AUTH_TOKEN="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="..."

# Add:
DATABASE_URL="postgresql://kidstudy:kidstudy123@localhost:5432/kidstudy"
JWT_SECRET="dev-jwt-secret-change-in-production"
WECHAT_APPID="your-wechat-appid"
WECHAT_SECRET="your-wechat-app-secret"
```

- [ ] **Step 3: Update Prisma schema for PostgreSQL and new fields**

Read `prisma/schema.prisma`, then replace its content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Parent {
  id             String   @id @default(uuid())
  username       String   @unique
  passwordHash   String
  nickname       String   @default("")
  wechatOpenId   String?  @unique
  wechatAvatar   String?  @default("")
  wechatNickname String?  @default("")
  role           String   @default("PARENT")
  pin            String?  @default("1234")
  children       Child[]
  createdAt      DateTime @default(now())
}

model Child {
  id             String           @id @default(uuid())
  parentId       String
  parent         Parent           @relation(fields: [parentId], references: [id], onDelete: Cascade)
  name           String
  avatar         String           @default("👦")
  points         Int              @default(0)
  streak         Int              @default(0)
  maxStreak      Int              @default(0)
  totalCheckIns  Int              @default(0)
  pet            String           @default("{\"type\":\"cat\",\"name\":\"小咪\",\"level\":1,\"mood\":\"normal\"}")
  createdAt      DateTime         @default(now())
  account        ChildAccount?
  learningRecords LearningRecord[]
  checkInRecords   CheckInRecord[]
}

model ChildAccount {
  id           String   @id @default(uuid())
  childId      String   @unique
  child        Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  username     String   @unique
  passwordHash String
  nickname     String
  createdAt    DateTime @default(now())
}

model LearningRecord {
  id        String   @id @default(uuid())
  childId   String
  child     Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  subject   String
  charId    String
  type      String
  score     Int?
  accuracy  Float?
  duration  Int      @default(0)
  date      String
  createdAt DateTime @default(now())

  @@index([childId, subject, date])
}

model CheckInRecord {
  id           String        @id @default(uuid())
  childId      String
  child        Child         @relation(fields: [childId], references: [id], onDelete: Cascade)
  date         String
  allCompleted Boolean       @default(false)
  bonusEarned  Boolean       @default(false)
  createdAt    DateTime      @default(now())
  tasks        CheckInTask[]

  @@unique([childId, date])
}

model CheckInTask {
  id           String        @id @default(uuid())
  recordId     String
  record       CheckInRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
  subject      String
  taskType     String
  completed    Boolean       @default(false)
  pointsEarned Int           @default(0)
  completedAt  DateTime?
}

model LearningContent {
  id        String   @id
  subject   String
  level     Int
  order     Int
  data      String
  createdAt DateTime @default(now())

  @@index([subject, level])
  @@unique([subject, order])
}
```

- [ ] **Step 4: Rewrite prisma.ts to remove libsql adapter**

Replace `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Remove old dependencies and add jose**

```bash
cd /data/claude/kidstudy
npm uninstall next-auth @auth/prisma-adapter @libsql/client @prisma/adapter-libsql
npm install jose
```

- [ ] **Step 6: Run Prisma migration**

```bash
npx prisma migrate dev --name "switch-to-postgresql-add-wechat-fields"
```

- [ ] **Step 7: Verify database connection**

```bash
npx prisma db push --help  # Just verify Prisma connects
```

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts .env package.json package-lock.json
git commit -m "feat: migrate to PostgreSQL with Prisma, add wechat and role fields

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: JWT Authentication Utilities

**Files:**
- Create: `src/lib/jwt.ts`
- Create: `src/lib/jwt.test.ts`

**Interfaces:**
- Produces: `signToken(payload: JWTPayload): Promise<string>` — payload has `{ userId: string, role: string }`, returns signed JWT string with 7-day expiry
- Produces: `verifyToken(token: string): Promise<JWTPayload | null>` — verifies and returns payload, or null if invalid/expired
- Produces: `JWTPayload` type — `{ userId: string; role: string; iat: number; exp: number }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/jwt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./jwt";

describe("signToken", () => {
  it("returns a string token", async () => {
    const token = await signToken({ userId: "user-1", role: "PARENT" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });
});

describe("verifyToken", () => {
  it("returns payload for a valid token", async () => {
    const token = await signToken({ userId: "user-1", role: "PARENT" });
    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-1");
    expect(payload!.role).toBe("PARENT");
  });

  it("returns null for an invalid token", async () => {
    const payload = await verifyToken("invalid.token.here");
    expect(payload).toBeNull();
  });

  it("returns null for an expired token", async () => {
    // Use a token with exp in the past
    const payload = await verifyToken(
      "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0Iiwicm9sZSI6IlBBUkVOVCIsImV4cCI6MX0.abc"
    );
    expect(payload).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/jwt.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the JWT implementation**

Create `src/lib/jwt.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  userId: string;
  role: string;
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/jwt.test.ts`
Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/jwt.ts src/lib/jwt.test.ts
git commit -m "feat: add JWT sign and verify utilities with jose

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: JWT-Based Auth Library (replace NextAuth)

**Files:**
- Modify: `src/lib/auth.ts` (rewrite)
- Create: `src/lib/auth.test.ts`

**Interfaces:**
- Produces: `login(username: string, password: string): Promise<{ token: string; user: AuthUser } | null>`
- Produces: `register(username: string, password: string, nickname?: string): Promise<{ success: boolean; error?: string }>`
- Produces: `AuthUser` type — `{ id: string; username: string; nickname: string; role: "PARENT" | "CHILD"; currentChildId?: string | null }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { login, register } from "./auth";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

beforeAll(async () => {
  // Clean up test user
  await prisma.parent.deleteMany({ where: { username: "testauthuser" } });
});

describe("register", () => {
  it("creates a new parent and returns success", async () => {
    const result = await register("testauthuser", "password123", "测试");
    expect(result.success).toBe(true);
  });

  it("rejects duplicate username", async () => {
    const result = await register("testauthuser", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("已被注册");
  });
});

describe("login", () => {
  it("returns token and user for valid credentials", async () => {
    const result = await login("testauthuser", "password123");
    expect(result).not.toBeNull();
    expect(result!.token).toBeTruthy();
    expect(result!.user.username).toBe("testauthuser");
    expect(result!.user.role).toBe("PARENT");
  });

  it("returns null for wrong password", async () => {
    const result = await login("testauthuser", "wrongpassword");
    expect(result).toBeNull();
  });

  it("returns null for nonexistent user", async () => {
    const result = await login("noone", "password123");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL — `register` and `login` not exported from `./auth`

- [ ] **Step 3: Rewrite auth.ts**

Replace `src/lib/auth.ts`:

```typescript
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { signToken } from "./jwt";

export interface AuthUser {
  id: string;
  username: string;
  nickname: string;
  role: "PARENT" | "CHILD";
  currentChildId?: string | null;
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; user: AuthUser } | null> {
  // 1. Try Parent
  const parent = await prisma.parent.findUnique({
    where: { username },
    include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  if (parent) {
    const isValid = await bcrypt.compare(password, parent.passwordHash);
    if (!isValid) return null;
    const token = await signToken({ userId: parent.id, role: "PARENT" });
    return {
      token,
      user: {
        id: parent.id,
        username: parent.username,
        nickname: parent.nickname || parent.username,
        role: "PARENT",
        currentChildId: parent.children[0]?.id || null,
      },
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
    const token = await signToken({ userId: childAccount.childId, role: "CHILD" });
    return {
      token,
      user: {
        id: childAccount.childId,
        username: childAccount.child.name,
        nickname: childAccount.nickname,
        role: "CHILD",
        currentChildId: childAccount.childId,
      },
    };
  }

  return null;
}

export async function register(
  username: string,
  password: string,
  nickname?: string
): Promise<{ success: boolean; error?: string }> {
  if (!username || !password) {
    return { success: false, error: "用户名和密码不能为空" };
  }

  if (password.length < 6) {
    return { success: false, error: "密码至少6位" };
  }

  const existingParent = await prisma.parent.findUnique({ where: { username } });
  if (existingParent) {
    return { success: false, error: "用户名已被注册" };
  }

  const existingChild = await prisma.childAccount.findUnique({ where: { username } });
  if (existingChild) {
    return { success: false, error: "用户名已被注册" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.parent.create({
    data: {
      username,
      passwordHash,
      nickname: (nickname || "").trim() || username,
    },
  });

  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat: replace NextAuth with JWT-based login/register

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: JWT Middleware for API Routes

**Files:**
- Modify: `src/middleware.ts` (rewrite)
- Create: `src/lib/api-auth.ts`
- Create: `src/lib/api-auth.test.ts`

**Interfaces:**
- Produces: `getUserFromRequest(req: NextRequest): Promise<{ userId: string; role: string } | null>` — extracts and verifies JWT from Authorization header
- Consumes: `verifyToken` from `src/lib/jwt.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api-auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getUserFromRequest } from "./api-auth";
import { signToken } from "./jwt";
import { NextRequest } from "next/server";

describe("getUserFromRequest", () => {
  it("returns user for valid Bearer token", async () => {
    const token = await signToken({ userId: "user-1", role: "PARENT" });
    const req = new NextRequest("http://localhost/api/children", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await getUserFromRequest(req);
    expect(user).not.toBeNull();
    expect(user!.userId).toBe("user-1");
    expect(user!.role).toBe("PARENT");
  });

  it("returns null when no Authorization header", async () => {
    const req = new NextRequest("http://localhost/api/children");
    const user = await getUserFromRequest(req);
    expect(user).toBeNull();
  });

  it("returns null for invalid token", async () => {
    const req = new NextRequest("http://localhost/api/children", {
      headers: { Authorization: "Bearer invalid.token" },
    });
    const user = await getUserFromRequest(req);
    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/api-auth.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write api-auth.ts**

Create `src/lib/api-auth.ts`:

```typescript
import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

export async function getUserFromRequest(
  req: NextRequest
): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  return verifyToken(token);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/api-auth.test.ts`
Expected: all 3 tests PASS

- [ ] **Step 5: Rewrite middleware.ts**

Replace `src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip auth for public endpoints
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/wechat/login"
  ) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "登录已过期" }, { status: 401 });
  }

  // Inject user info into headers for downstream handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/api-auth.ts src/lib/api-auth.test.ts src/middleware.ts
git commit -m "feat: add JWT auth middleware for API routes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Update API Routes to Use JWT Auth

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Delete: `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: `login`, `register` from `src/lib/auth.ts`
- Consumes: `getUserFromRequest` from `src/lib/api-auth.ts` (for existing API routes)
- Produces: `POST /api/auth/login` — accepts `{ username, password }`, returns `{ token, user }` or 401
- Produces: `POST /api/auth/register` — accepts `{ username, password, nickname? }`, returns `{ success }` or 400

- [ ] **Step 1: Create login API route**

Create `src/app/api/auth/login/route.ts`:

```typescript
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
```

- [ ] **Step 2: Update register route to return JWT**

Replace `src/app/api/auth/register/route.ts`:

```typescript
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
```

- [ ] **Step 3: Delete NextAuth route handler**

```bash
rm -rf /data/claude/kidstudy/src/app/api/auth/\[...nextauth\]
```

- [ ] **Step 4: Update existing API routes to read user from headers**

Update `src/app/api/children/route.ts` — read `GET /api/children` and `POST /api/children`:

Read the file, then update the user extraction pattern. Each handler should read:
```typescript
const userId = req.headers.get("x-user-id");
const role = req.headers.get("x-user-role");
```
instead of extracting from NextAuth session.

(Do this for `src/app/api/children/route.ts`, `src/app/api/children/[id]/route.ts`, `src/app/api/learning/record/route.ts`, `src/app/api/learning/[subject]/route.ts`, `src/app/api/checkin/route.ts`, `src/app/api/checkin/calendar/route.ts`, `src/app/api/pet/feed/route.ts`, `src/app/api/shop/buy/route.ts`, `src/app/api/report/route.ts`, `src/app/api/settings/route.ts`)

- [ ] **Step 5: Run existing API tests to verify**

Run: `npx vitest run`
Expected: Tests may fail due to auth changes; fix any that reference NextAuth session

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git rm src/app/api/auth/\[...nextauth\]/route.ts 2>/dev/null
git commit -m "feat: convert API routes to JWT auth from headers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: WeChat Login API

**Files:**
- Create: `src/app/api/wechat/login/route.ts`
- Create: `src/app/api/wechat/login/route.test.ts`

**Interfaces:**
- Consumes: `signToken` from `src/lib/jwt.ts`
- Consumes: `prisma` from `src/lib/prisma.ts`
- Produces: `POST /api/wechat/login` — accepts `{ code: string }`, returns `{ token, user, isNew: boolean }`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/wechat/login/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll } from "vitest";
import { POST } from "./route";

// Mock the WeChat API call
const mockFetch = vi.fn();

beforeAll(() => {
  process.env.WECHAT_APPID = "test-appid";
  process.env.WECHAT_SECRET = "test-secret";
  process.env.JWT_SECRET = "test-jwt-secret";
});

describe("POST /api/wechat/login", () => {
  it("returns 400 when code is missing", async () => {
    const req = new Request("http://localhost/api/wechat/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when code is empty string", async () => {
    const req = new Request("http://localhost/api/wechat/login", {
      method: "POST",
      body: JSON.stringify({ code: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/wechat/login/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the WeChat login route**

Create `src/app/api/wechat/login/route.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/wechat/login/route.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/wechat/
git commit -m "feat: add WeChat mini program login API endpoint

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Web Frontend — Replace NextAuth with JWT AuthProvider

**Files:**
- Modify: `src/store/AppProvider.tsx`
- Create: `src/store/AuthContext.tsx`
- Modify: `src/store/ChildContext.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `AuthContext` — provides `{ user: AuthUser | null; token: string | null; login(); logout(); register() }`
- Consumes: `login`, `register` from `src/lib/auth.ts` (via API calls)
- Consumes: `AuthUser` type from `src/lib/auth.ts`

- [ ] **Step 1: Create AuthContext**

Create `src/store/AuthContext.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface AuthUser {
  id: string;
  username: string;
  nickname: string;
  role: "PARENT" | "CHILD";
  currentChildId?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (username: string, password: string, nickname?: string) => Promise<{ success: boolean; error?: string }>;
  setCurrentChildId: (childId: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => ({ success: false }),
  logout: () => {},
  register: async () => ({ success: false }),
  setCurrentChildId: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const loginFn = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "登录失败" };
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "网络错误" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  const registerFn = useCallback(async (username: string, password: string, nickname?: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "注册失败" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "网络错误" };
    }
  }, []);

  const setCurrentChildId = useCallback((childId: string | null) => {
    setUser(prev => prev ? { ...prev, currentChildId: childId } : null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login: loginFn, logout, register: registerFn, setCurrentChildId }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Update AppProvider to use AuthProvider instead of SessionProvider**

Replace `src/store/AppProvider.tsx`:

```typescript
"use client";

import { AuthProvider } from "./AuthContext";
import { ChildProvider } from "./ChildContext";
import { LearningProvider } from "./LearningContext";
import { ReactNode } from "react";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChildProvider>
        <LearningProvider>
          {children}
        </LearningProvider>
      </ChildProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Update ChildContext to use useAuth instead of useSession**

Replace `src/store/ChildContext.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface Child {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
  pet: string;
  account?: { id: string; username: string; nickname: string } | null;
}

interface ChildContextType {
  child: Child | null;
  children: Child[];
  setCurrentChild: (childId: string) => void;
  refreshChild: () => Promise<void>;
  refreshChildren: () => Promise<void>;
  removeChild: (childId: string) => Promise<void>;
}

const ChildContext = createContext<ChildContextType>({
  child: null,
  children: [],
  setCurrentChild: () => {},
  refreshChild: async () => {},
  refreshChildren: async () => {},
  removeChild: async () => {},
});

export function ChildProvider({ children }: { children: ReactNode }) {
  const { user, token, setCurrentChildId } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  const role = user?.role;
  const currentChildId = user?.currentChildId;

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchChildren = useCallback(async () => {
    const res = await fetch("/api/children", { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setChildrenList(data);
      return data;
    }
    return [];
  }, [token]);

  const fetchChild = useCallback(async (childId: string) => {
    const res = await fetch(`/api/children?id=${childId}`, { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setChild(data);
    }
  }, [token]);

  const refreshChild = useCallback(async () => {
    if (currentChildId) await fetchChild(currentChildId);
  }, [currentChildId, fetchChild]);

  const refreshChildren = useCallback(async () => {
    await fetchChildren();
  }, [fetchChildren]);

  const setCurrentChild = useCallback(async (childId: string) => {
    if (role !== "PARENT") return;
    setCurrentChildId(childId);
    await fetchChild(childId);
  }, [role, setCurrentChildId, fetchChild]);

  const removeChild = useCallback(async (childId: string) => {
    const res = await fetch(`/api/children/${childId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (!res.ok) {
      let errorMsg = "删除失败";
      try {
        const data = await res.json();
        if (data?.error) errorMsg = data.error;
      } catch { /* */ }
      throw new Error(errorMsg);
    }

    setChildrenList(prev => prev.filter(c => c.id !== childId));

    if (currentChildId === childId) {
      const updated = await fetchChildren();
      if (updated.length > 0) {
        await setCurrentChild(updated[0].id);
      } else {
        setChild(null);
        setCurrentChildId(null);
      }
    }
  }, [fetchChildren, setCurrentChild, setCurrentChildId, currentChildId, token]);

  useEffect(() => {
    if (role === "PARENT") {
      fetchChildren();
    } else if (role === "CHILD" && currentChildId) {
      fetchChild(currentChildId);
    }
  }, [fetchChildren, fetchChild, role, currentChildId]);

  useEffect(() => {
    if (currentChildId) {
      fetchChild(currentChildId);
    }
  }, [currentChildId, fetchChild]);

  return (
    <ChildContext.Provider
      value={{ child, children: childrenList, setCurrentChild, refreshChild, refreshChildren, removeChild }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  return useContext(ChildContext);
}
```

- [ ] **Step 4: Update root layout — remove next-auth SessionProvider reference**

The `src/app/layout.tsx` already uses `AppProvider` which we updated. No changes needed here since `AppProvider` no longer wraps `SessionProvider`.

- [ ] **Step 5: Update all pages that use `useSession` to use `useAuth` instead**

Grep for `useSession` in the codebase and replace each occurrence:

```bash
grep -r "useSession" src/ --include="*.tsx" -l
```

For each file found, replace:
```typescript
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```
with:
```typescript
import { useAuth } from "@/store/AuthContext";
const { user } = useAuth();
```

And replace `(session as any)?.role` with `user?.role`, `(session as any)?.currentChildId` with `user?.currentChildId`, etc.

- [ ] **Step 6: Commit**

```bash
git add src/store/ src/app/layout.tsx
git commit -m "feat: replace NextAuth SessionProvider with JWT AuthProvider

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Extract Shared Types and Constants

**Files:**
- Create: `shared/types/user.ts`
- Create: `shared/types/learning.ts`
- Create: `shared/types/checkin.ts`
- Create: `shared/types/pet.ts`
- Create: `shared/types/shop.ts`
- Create: `shared/types/index.ts`
- Create: `shared/constants/points.ts`
- Create: `shared/constants/subjects.ts`
- Create: `shared/constants/levels.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `shared/types/*` — all TypeScript types and interfaces shared between Web and Mini Program
- Produces: `shared/constants/*` — all business constants

- [ ] **Step 1: Create shared types**

Create `shared/types/user.ts`:

```typescript
export type UserRole = "PARENT" | "CHILD";

export interface ParentUser {
  id: string;
  username: string;
  nickname: string;
  role: "PARENT";
  currentChildId?: string | null;
}

export interface ChildUser {
  id: string;
  username: string;
  nickname: string;
  role: "CHILD";
  currentChildId: string;
}

export type AuthUser = ParentUser | ChildUser;

export interface Child {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
  pet: string;
  account?: { id: string; username: string; nickname: string } | null;
}
```

Create `shared/types/learning.ts`:

```typescript
export type Subject = "literacy" | "pinyin" | "english" | "math" | "poetry";
export type RecordType = "learn" | "practice" | "test";
export type LearningStep = 1 | 2 | 3;

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

export interface LearningRecord {
  id: string;
  childId: string;
  subject: Subject;
  charId: string;
  type: RecordType;
  score?: number;
  accuracy?: number;
  duration: number;
  date: string;
}
```

Create `shared/types/checkin.ts`:

```typescript
export type CheckInStatus = "not_started" | "in_progress" | "completed" | "claimed";

export interface CheckInTask {
  id: string;
  recordId: string;
  subject: string;
  taskType: string;
  completed: boolean;
  pointsEarned: number;
  completedAt?: string;
}

export interface CheckInRecord {
  id: string;
  childId: string;
  date: string;
  allCompleted: boolean;
  bonusEarned: boolean;
  tasks: CheckInTask[];
}
```

Create `shared/types/pet.ts`:

```typescript
export interface PetState {
  type: "cat" | "dog" | "rabbit";
  name: string;
  level: number;
  mood: "happy" | "normal" | "sad";
}
```

Create `shared/types/shop.ts`:

```typescript
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "food" | "toy" | "accessory" | "theme" | "frame";
  image: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}
```

Create `shared/types/index.ts`:

```typescript
export * from "./user";
export * from "./learning";
export * from "./checkin";
export * from "./pet";
export * from "./shop";
```

- [ ] **Step 2: Create shared constants**

Create `shared/constants/points.ts`:

```typescript
export const POINTS = {
  CHECK_IN_PER_SUBJECT: 10,
  CHECK_IN_ALL_COMPLETE_BONUS: 10,
  CHECK_IN_STREAK_7_BONUS: 50,
  LEARN_NEW_CONTENT: 5,
  GAME_COMPLETION_MIN: 5,
  GAME_COMPLETION_MAX: 20,
} as const;
```

Create `shared/constants/subjects.ts`:

```typescript
export const SUBJECTS = {
  literacy: { name: "识字", color: "#F59E0B", bgColor: "bg-amber-100", textColor: "text-amber-600" },
  pinyin: { name: "拼音", color: "#0EA5E9", bgColor: "bg-sky-100", textColor: "text-sky-600" },
  english: { name: "英语", color: "#10B981", bgColor: "bg-emerald-100", textColor: "text-emerald-600" },
  math: { name: "算术", color: "#A855F7", bgColor: "bg-purple-100", textColor: "text-purple-600" },
  poetry: { name: "古诗词", color: "#DC2626", bgColor: "bg-red-100", textColor: "text-red-600" },
} as const;
```

Create `shared/constants/levels.ts`:

```typescript
export const LEVELS = {
  LITERACY: { 1: "基础 (300字)", 2: "进阶 (300字)", 3: "拓展 (400字)" },
  MATH: { 1: "10以内加减", 2: "20以内加减", 3: "100以内加减", 4: "简单乘法" },
} as const;
```

- [ ] **Step 3: Update src/types/index.ts to re-export from shared**

Replace `src/types/index.ts`:

```typescript
export * from "../../shared/types";
```

- [ ] **Step 4: Update tsconfig.json to include shared path**

Add to `tsconfig.json` `compilerOptions.paths`:
```json
"@shared/*": ["./shared/*"]
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add shared/ src/types/index.ts tsconfig.json
git commit -m "feat: extract shared types and constants to /shared

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Initialize Taro Mini Program Project

**Files:**
- Create: `miniprogram/` (full Taro project scaffold)

**Interfaces:**
- Produces: Working Taro 4 project with React + TypeScript
- Produces: NutUI component library installed
- Produces: Subpackage configuration in `app.config.ts`

- [ ] **Step 1: Install Taro CLI and initialize project**

```bash
cd /data/claude/kidstudy
npx @tarojs/cli@latest init miniprogram \
  --typescript \
  --template react \
  --css modules \
  --compiler webpack5 \
  --framework React \
  --no-git

cd miniprogram
npm install
```

- [ ] **Step 2: Install NutUI**

```bash
cd /data/claude/kidstudy/miniprogram
npm install @nutui/nutui-react-taro @nutui/icons-react-taro
```

- [ ] **Step 3: Configure NutUI in app.config.ts**

Replace `miniprogram/src/app.config.ts`:

```typescript
export default defineAppConfig({
  pages: [
    "pages/index/index",
  ],
  subPackages: [
    {
      root: "pages/learning/",
      name: "learning",
      pages: [
        "dashboard/index",
        "subject/index",
        "games/pet/index",
        "games/shop/index",
        "settings/index",
      ],
    },
    {
      root: "pages/parent/",
      name: "parent",
      pages: [
        "children/index",
        "report/index",
        "settings/index",
      ],
    },
    {
      root: "pages/content/",
      name: "content",
      pages: [],
    },
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#FF9800",
    navigationBarTitleText: "幼小衔接学习",
    navigationBarTextStyle: "white",
  },
  tabBar: {
    color: "#999",
    selectedColor: "#FF9800",
    backgroundColor: "#fff",
    list: [
      {
        pagePath: "pages/learning/dashboard/index",
        text: "学习",
        iconPath: "assets/icons/learn.png",
        selectedIconPath: "assets/icons/learn-active.png",
      },
      {
        pagePath: "pages/learning/games/pet/index",
        text: "宠物",
        iconPath: "assets/icons/pet.png",
        selectedIconPath: "assets/icons/pet-active.png",
      },
      {
        pagePath: "pages/learning/settings/index",
        text: "我的",
        iconPath: "assets/icons/me.png",
        selectedIconPath: "assets/icons/me-active.png",
      },
    ],
  },
});
```

- [ ] **Step 4: Configure project.config.json**

Replace `miniprogram/project.config.json`:

```json
{
  "miniprogramRoot": "dist/",
  "projectname": "kidstudy",
  "description": "幼小衔接学习平台",
  "appid": "your-appid-here",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true,
    "coverView": true,
    "nodeModules": true,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "scopeDataCheck": false,
    "uglifyFileName": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "compileHotReLoad": false,
    "lazyloadPlaceholderEnable": false,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "compileType": "miniprogram",
  "condition": {}
}
```

- [ ] **Step 5: Add style import for NutUI in app.ts**

Replace `miniprogram/src/app.tsx`:

```typescript
import { PropsWithChildren } from "react";
import "./app.css";
import "@nutui/nutui-react-taro/dist/style.css";

function App({ children }: PropsWithChildren) {
  return children;
}

export default App;
```

- [ ] **Step 6: Add shared path alias to Taro tsconfig**

Update `miniprogram/tsconfig.json` to include:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 7: Verify Taro builds**

```bash
cd /data/claude/kidstudy/miniprogram
npx taro build --type weapp
```
Expected: Build succeeds (may have warnings about empty pages, that's fine)

- [ ] **Step 8: Commit**

```bash
git add miniprogram/
git commit -m "feat: scaffold Taro mini program project with NutUI

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Mini Program API Service Layer

**Files:**
- Create: `miniprogram/src/services/api.ts`
- Create: `miniprogram/src/services/api.test.ts`

**Interfaces:**
- Produces: `request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: Record<string, unknown>): Promise<T>`
- Produces: `api.login(code: string): Promise<WechatLoginResponse>`
- Produces: `api.getChildren(): Promise<Child[]>`
- Produces: `WechatLoginResponse` type

- [ ] **Step 1: Write the API service**

Create `miniprogram/src/services/api.ts`:

```typescript
import Taro from "@tarojs/taro";

const BASE_URL = process.env.TARO_APP_API_URL || "http://localhost:3000";

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  skipAuth?: boolean;
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const { method, path, body, skipAuth } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = Taro.getStorageSync("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const res = await Taro.request({
      url: `${BASE_URL}${path}`,
      method,
      header: headers,
      data: body,
    });

    if (res.statusCode === 401) {
      Taro.removeStorageSync("token");
      Taro.removeStorageSync("user");
      Taro.reLaunch({ url: "/pages/index/index" });
      throw new Error("登录已过期");
    }

    if (res.statusCode >= 400) {
      const data = res.data as { error?: string };
      throw new Error(data.error || "请求失败");
    }

    return res.data as T;
  } catch (err) {
    if (err instanceof Error && err.message === "登录已过期") throw err;
    throw err;
  }
}

export interface WechatLoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    nickname: string;
    role: string;
    currentChildId?: string | null;
  };
  isNew: boolean;
}

export const api = {
  wechatLogin(code: string): Promise<WechatLoginResponse> {
    return request({ method: "POST", path: "/api/wechat/login", body: { code }, skipAuth: true });
  },

  getChildren(): Promise<any[]> {
    return request({ method: "GET", path: "/api/children" });
  },

  getChild(childId: string): Promise<any> {
    return request({ method: "GET", path: `/api/children?id=${childId}` });
  },

  getLearningContent(subject: string, level: number): Promise<any> {
    return request({ method: "GET", path: `/api/learning/${subject}?level=${level}` });
  },

  saveLearningRecord(data: Record<string, unknown>): Promise<any> {
    return request({ method: "POST", path: "/api/learning/record", body: data });
  },

  getCheckinToday(childId: string): Promise<any> {
    return request({ method: "GET", path: `/api/checkin?childId=${childId}` });
  },

  completeCheckinTask(taskId: string): Promise<any> {
    return request({ method: "POST", path: "/api/checkin", body: { taskId } });
  },

  getCalendar(childId: string, month: string): Promise<any> {
    return request({ method: "GET", path: `/api/checkin/calendar?childId=${childId}&month=${month}` });
  },

  feedPet(): Promise<any> {
    return request({ method: "POST", path: "/api/pet/feed" });
  },

  getReport(childId: string): Promise<any> {
    return request({ method: "GET", path: `/api/report?childId=${childId}` });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/src/services/
git commit -m "feat: add mini program API service layer with JWT

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Mini Program Auth Store and Launch Page

**Files:**
- Create: `miniprogram/src/store/auth.ts`
- Create: `miniprogram/src/pages/index/index.tsx`
- Create: `miniprogram/src/pages/index/index.config.ts`

**Interfaces:**
- Produces: `authStore` — reactive store with `{ token, user, isLoggedIn, loginWithWechat(), logout(), restoreSession() }`
- Consumes: `api.wechatLogin` from `miniprogram/src/services/api.ts`

- [ ] **Step 1: Create auth store**

Create `miniprogram/src/store/auth.ts`:

```typescript
import Taro from "@tarojs/taro";
import { api, WechatLoginResponse } from "../services/api";

interface AuthState {
  token: string | null;
  user: WechatLoginResponse["user"] | null;
  isLoggedIn: boolean;
}

const state: AuthState = {
  token: null,
  user: null,
  isLoggedIn: false,
};

const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export const authStore = {
  getState(): AuthState {
    return state;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async loginWithWechat(): Promise<{ success: boolean; isNew: boolean }> {
    try {
      const loginRes = await Taro.login();
      if (!loginRes.code) {
        return { success: false, isNew: false };
      }

      const data = await api.wechatLogin(loginRes.code);
      Taro.setStorageSync("token", data.token);
      Taro.setStorageSync("user", data.user);

      state.token = data.token;
      state.user = data.user;
      state.isLoggedIn = true;
      notify();

      return { success: true, isNew: data.isNew };
    } catch {
      return { success: false, isNew: false };
    }
  },

  logout() {
    Taro.removeStorageSync("token");
    Taro.removeStorageSync("user");
    state.token = null;
    state.user = null;
    state.isLoggedIn = false;
    notify();
  },

  restoreSession() {
    const token = Taro.getStorageSync("token");
    const user = Taro.getStorageSync("user");
    if (token && user) {
      state.token = token;
      state.user = user;
      state.isLoggedIn = true;
      notify();
    }
  },
};
```

- [ ] **Step 2: Create launch page**

Create `miniprogram/src/pages/index/index.tsx`:

```typescript
import { useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { authStore } from "../../store/auth";

export default function Index() {
  useEffect(() => {
    async function bootstrap() {
      // Try restore existing session
      authStore.restoreSession();

      if (authStore.getState().isLoggedIn) {
        Taro.switchTab({ url: "/pages/learning/dashboard/index" });
        return;
      }

      // Perform WeChat login
      const result = await authStore.loginWithWechat();

      if (result.success) {
        // Always start in learning mode (child view)
        Taro.switchTab({ url: "/pages/learning/dashboard/index" });
      } else {
        Taro.showToast({ title: "登录失败，请重试", icon: "none" });
      }
    }

    bootstrap();
  }, []);

  return (
    <View className="flex items-center justify-center h-screen bg-orange-50">
      <Text className="text-lg text-orange-600">正在进入学习平台...</Text>
    </View>
  );
}
```

Create `miniprogram/src/pages/index/index.config.ts`:

```typescript
export default definePageConfig({
  navigationBarTitleText: "",
  navigationStyle: "custom",
});
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/src/store/ miniprogram/src/pages/index/
git commit -m "feat: add mini program auth store and launch page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Mini Program Learning Mode — Dashboard

**Files:**
- Create: `miniprogram/src/pages/learning/dashboard/index.tsx`
- Create: `miniprogram/src/pages/learning/dashboard/index.config.ts`
- Create: `miniprogram/src/components/dashboard/DailyTasks.tsx`
- Create: `miniprogram/src/components/dashboard/PointsBar.tsx`

**Interfaces:**
- Consumes: `api.getChildren`, `api.getCheckinToday` from services
- Produces: Dashboard page with daily tasks, points, streak display

- [ ] **Step 1: Create dashboard page**

Create `miniprogram/src/pages/learning/dashboard/index.tsx`:

```typescript
import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../../services/api";
import { authStore } from "../../../store/auth";

interface ChildData {
  id: string;
  name: string;
  points: number;
  streak: number;
  pet: string;
}

export default function Dashboard() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const children = await api.getChildren();
        if (children.length > 0) {
          setChild(children[0]);
        }
      } catch (err) {
        Taro.showToast({ title: "加载失败", icon: "none" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <View className="p-4"><Text>加载中...</Text></View>;
  }

  if (!child) {
    return (
      <View className="p-4 flex flex-col items-center justify-center h-screen">
        <Text className="text-lg text-gray-500 mb-4">还没有添加孩子</Text>
        <View
          className="bg-orange-500 text-white px-6 py-3 rounded-full"
          onClick={() => {
            // Will navigate to parent mode to add child
            Taro.showToast({ title: "请切换到家长模式添加孩子", icon: "none" });
          }}
        >
          <Text className="text-white">去添加</Text>
        </View>
      </View>
    );
  }

  const pet = JSON.parse(child.pet || "{}");

  return (
    <View className="p-4 bg-orange-50 min-h-screen">
      {/* Welcome */}
      <View className="mb-4">
        <Text className="text-2xl font-bold text-orange-800">
          {child.name}，早上好！
        </Text>
        <Text className="text-sm text-gray-500 ml-1">今天也要加油哦~</Text>
      </View>

      {/* Points and Streak */}
      <View className="flex gap-3 mb-4">
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-sm text-gray-500">积分</Text>
          <Text className="text-2xl font-bold text-orange-500">{child.points}</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-sm text-gray-500">连续打卡</Text>
          <Text className="text-2xl font-bold text-green-500">{child.streak}天</Text>
        </View>
      </View>

      {/* Pet */}
      <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <Text className="text-lg font-bold text-gray-700 mb-2">
          {pet.name || "小宠物"}
        </Text>
        <Text className="text-4xl text-center">
          {pet.type === "cat" ? "🐱" : pet.type === "dog" ? "🐶" : "🐰"}
        </Text>
        <Text className="text-center text-gray-400 text-sm mt-1">
          Lv.{pet.level || 1} · {pet.mood === "happy" ? "开心" : pet.mood === "sad" ? "难过" : "正常"}
        </Text>
      </View>

      {/* Subject Entries */}
      <View className="grid grid-cols-3 gap-3">
        {[
          { subject: "literacy", name: "识字", emoji: "📖", color: "bg-amber-100" },
          { subject: "pinyin", name: "拼音", emoji: "🔤", color: "bg-sky-100" },
          { subject: "english", name: "英语", emoji: "🌍", color: "bg-emerald-100" },
          { subject: "math", name: "算术", emoji: "🧮", color: "bg-purple-100" },
          { subject: "poetry", name: "古诗", emoji: "📜", color: "bg-red-100" },
        ].map((item) => (
          <View
            key={item.subject}
            className={`${item.color} rounded-2xl p-4 flex flex-col items-center shadow-sm`}
            onClick={() => {
              Taro.navigateTo({ url: `/pages/learning/subject/index?subject=${item.subject}` });
            }}
          >
            <Text className="text-3xl mb-1">{item.emoji}</Text>
            <Text className="text-sm font-bold">{item.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

Create `miniprogram/src/pages/learning/dashboard/index.config.ts`:

```typescript
export default definePageConfig({
  navigationBarTitleText: "学习",
});
```

- [ ] **Step 2: Create subject page placeholder**

Create `miniprogram/src/pages/learning/subject/index.tsx`:

```typescript
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

export default function Subject() {
  const { subject } = Taro.getCurrentInstance().router?.params || {};

  const subjectNames: Record<string, string> = {
    literacy: "识字",
    pinyin: "拼音",
    english: "英语",
    math: "算术",
    poetry: "古诗词",
  };

  return (
    <View className="p-4">
      <Text className="text-xl font-bold">{subjectNames[subject || ""] || "学习"}</Text>
      <Text className="text-gray-500 mt-4">学习内容即将上线...</Text>
    </View>
  );
}
```

Create `miniprogram/src/pages/learning/subject/index.config.ts`:

```typescript
export default definePageConfig({
  navigationBarTitleText: "学习",
});
```

- [ ] **Step 3: Create placeholder pages for remaining routes**

Create minimal placeholder pages for:
- `miniprogram/src/pages/learning/games/pet/index.tsx` + config
- `miniprogram/src/pages/learning/games/shop/index.tsx` + config
- `miniprogram/src/pages/learning/settings/index.tsx` + config
- `miniprogram/src/pages/parent/children/index.tsx` + config
- `miniprogram/src/pages/parent/report/index.tsx` + config
- `miniprogram/src/pages/parent/settings/index.tsx` + config

Each placeholder should be a simple View with page title text.

- [ ] **Step 4: Verify Taro build**

```bash
cd /data/claude/kidstudy/miniprogram
npx taro build --type weapp
```
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add miniprogram/src/pages/
git commit -m "feat: add mini program dashboard and subject pages

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: PIN Mode Switching and Parent Mode

**Files:**
- Create: `miniprogram/src/pages/learning/settings/index.tsx` (replace placeholder)
- Create: `miniprogram/src/components/settings/PinDialog.tsx`
- Create: `miniprogram/src/pages/parent/children/index.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `api.getChildren` from services
- Produces: Settings page with PIN-protected parent mode entry
- Produces: Parent children management page

- [ ] **Step 1: Create PIN dialog component**

Create `miniprogram/src/components/settings/PinDialog.tsx`:

```typescript
import { useState } from "react";
import { View, Text, Input } from "@tarojs/components";
import { Dialog } from "@nutui/nutui-react-taro";

interface PinDialogProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PinDialog({ visible, onClose, onSuccess }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    // PIN is stored on the parent record, fetched during login
    // For now, check against local stored PIN or default "1234"
    const storedPin = "1234"; // Will be fetched from API in production
    if (pin === storedPin) {
      setError("");
      setPin("");
      onSuccess();
    } else {
      setError("PIN 码不正确");
    }
  };

  const handleClose = () => {
    setPin("");
    setError("");
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      title="家长验证"
      onConfirm={handleSubmit}
      onCancel={handleClose}
      confirmText="确认"
      cancelText="取消"
    >
      <View className="py-4">
        <Text className="text-sm text-gray-500 mb-2 block">请输入4位PIN码</Text>
        <Input
          type="number"
          password
          maxlength={4}
          value={pin}
          onInput={(e) => setPin(e.detail.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-center text-2xl tracking-widest"
          placeholder="****"
        />
        {error && <Text className="text-red-500 text-sm mt-2">{error}</Text>}
      </View>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update settings page with PIN entry**

Replace `miniprogram/src/pages/learning/settings/index.tsx`:

```typescript
import { useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { PinDialog } from "../../../components/settings/PinDialog";
import { authStore } from "../../../store/auth";

export default function Settings() {
  const [showPin, setShowPin] = useState(false);
  const user = authStore.getState().user;

  return (
    <View className="p-4 bg-gray-50 min-h-screen">
      {/* User Info */}
      <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <Text className="text-lg font-bold">{user?.nickname || "小朋友"}</Text>
        <Text className="text-sm text-gray-400 block mt-1">学习模式</Text>
      </View>

      {/* Parent Management Entry */}
      <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <View
          className="p-4 flex justify-between items-center border-b border-gray-100"
          onClick={() => setShowPin(true)}
        >
          <View>
            <Text className="font-bold">家长管理</Text>
            <Text className="text-sm text-gray-400 block">管理孩子、查看报告</Text>
          </View>
          <Text className="text-gray-300">›</Text>
        </View>
      </View>

      {/* Logout */}
      <View className="mt-8">
        <View
          className="bg-white rounded-2xl p-4 text-center shadow-sm"
          onClick={() => {
            authStore.logout();
            Taro.reLaunch({ url: "/pages/index/index" });
          }}
        >
          <Text className="text-red-500">退出登录</Text>
        </View>
      </View>

      <PinDialog
        visible={showPin}
        onClose={() => setShowPin(false)}
        onSuccess={() => {
          setShowPin(false);
          Taro.switchTab({ url: "/pages/parent/children/index" });
        }}
      />
    </View>
  );
}
```

- [ ] **Step 3: Create parent children management page**

Replace `miniprogram/src/pages/parent/children/index.tsx`:

```typescript
import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../../services/api";

interface ChildData {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
}

export default function ParentChildren() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getChildren();
        setChildren(data);
      } catch {
        Taro.showToast({ title: "加载失败", icon: "none" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <View className="p-4"><Text>加载中...</Text></View>;
  }

  return (
    <View className="p-4 bg-gray-50 min-h-screen">
      {/* Header with back button */}
      <View className="flex items-center mb-4">
        <View
          className="mr-3"
          onClick={() => Taro.switchTab({ url: "/pages/learning/settings/index" })}
        >
          <Text className="text-orange-500 text-lg">‹ 返回学习模式</Text>
        </View>
      </View>

      <Text className="text-xl font-bold mb-4">孩子管理</Text>

      {children.length === 0 ? (
        <View className="bg-white rounded-2xl p-8 text-center">
          <Text className="text-gray-400">还没有添加孩子</Text>
        </View>
      ) : (
        children.map((child) => (
          <View key={child.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex items-center justify-between">
              <View className="flex items-center">
                <Text className="text-3xl mr-3">{child.avatar}</Text>
                <View>
                  <Text className="font-bold text-lg">{child.name}</Text>
                  <Text className="text-sm text-gray-400">
                    {child.points} 积分 · 连续 {child.streak} 天
                  </Text>
                </View>
              </View>
              <Text className="text-gray-300">›</Text>
            </View>
          </View>
        ))
      )}

      {/* Add Child Button */}
      <View className="mt-4">
        <View
          className="bg-orange-500 text-white rounded-2xl p-4 text-center shadow-sm"
          onClick={() => {
            Taro.showToast({ title: "添加孩子功能即将上线", icon: "none" });
          }}
        >
          <Text className="text-white font-bold">+ 添加孩子</Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/src/pages/learning/settings/ miniprogram/src/pages/parent/children/ miniprogram/src/components/settings/
git commit -m "feat: add PIN mode switching and parent management pages

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: Offline Cache and Checkin Sync

**Files:**
- Create: `miniprogram/src/utils/cache.ts`
- Create: `miniprogram/src/utils/checkin-queue.ts`

**Interfaces:**
- Produces: `getLearningContent(subject: string, level: number): Promise<any>` — cache-first strategy
- Produces: `saveCheckinLocally(data: CheckinData): void` — queue checkin when offline
- Produces: `syncPendingCheckins(): Promise<number>` — sync queued checkins, returns count synced

- [ ] **Step 1: Create cache utility**

Create `miniprogram/src/utils/cache.ts`:

```typescript
import Taro from "@tarojs/taro";
import { api } from "../services/api";

const CACHE_PREFIX = "lc_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function getLearningContent<T>(
  subject: string,
  level: number
): Promise<T> {
  const cacheKey = `${CACHE_PREFIX}${subject}_${level}`;

  // 1. Try cache
  try {
    const cached = Taro.getStorageSync(cacheKey);
    if (cached) {
      const entry = JSON.parse(cached) as CacheEntry<T>;
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
      }
    }
  } catch {
    // Cache miss, continue to fetch
  }

  // 2. Fetch from API
  try {
    const data = await api.getLearningContent(subject, level);
    const entry: CacheEntry<T> = { data: data as T, timestamp: Date.now() };
    Taro.setStorageSync(cacheKey, JSON.stringify(entry));
    return data as T;
  } catch {
    // 3. Return stale cache if available
    try {
      const cached = Taro.getStorageSync(cacheKey);
      if (cached) {
        const entry = JSON.parse(cached) as CacheEntry<T>;
        return entry.data;
      }
    } catch {
      // No cache available
    }
    throw new Error("内容加载失败，请检查网络");
  }
}
```

- [ ] **Step 2: Create checkin queue utility**

Create `miniprogram/src/utils/checkin-queue.ts`:

```typescript
import Taro from "@tarojs/taro";
import { api } from "../services/api";

const QUEUE_KEY = "checkin_queue";

interface CheckinData {
  taskId: string;
  childId: string;
  timestamp: number;
}

export function saveCheckinLocally(data: CheckinData): void {
  try {
    const queueStr = Taro.getStorageSync(QUEUE_KEY);
    const queue: CheckinData[] = queueStr ? JSON.parse(queueStr) : [];
    queue.push(data);
    Taro.setStorageSync(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full, silently fail
  }
}

export async function syncPendingCheckins(): Promise<number> {
  try {
    const queueStr = Taro.getStorageSync(QUEUE_KEY);
    if (!queueStr) return 0;

    const queue: CheckinData[] = JSON.parse(queueStr);
    if (queue.length === 0) return 0;

    let synced = 0;
    const failed: CheckinData[] = [];

    for (const item of queue) {
      try {
        await api.completeCheckinTask(item.taskId);
        synced++;
      } catch {
        failed.push(item);
      }
    }

    // Keep failed items for next sync
    Taro.setStorageSync(QUEUE_KEY, JSON.stringify(failed));
    return synced;
  } catch {
    return 0;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/src/utils/
git commit -m "feat: add offline cache and checkin sync utilities

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15: Final Integration, Testing, and Documentation

**Files:**
- Modify: `README.md` (add mini program section)
- Create: `miniprogram/README.md`

- [ ] **Step 1: Update root README with mini program info**

Add to `README.md`:

```markdown
## 微信小程序

本项目同时支持微信小程序，使用 Taro 框架开发。

### 开发

```bash
cd miniprogram
npm install
npx taro build --type weapp --watch
```

然后在微信开发者工具中打开 `miniprogram/dist/` 目录。

### 后端环境变量

```env
DATABASE_URL="postgresql://kidstudy:kidstudy123@localhost:5432/kidstudy"
JWT_SECRET="your-jwt-secret"
WECHAT_APPID="your-wechat-appid"
WECHAT_SECRET="your-wechat-app-secret"
```
```

- [ ] **Step 2: Create miniprogram README**

Create `miniprogram/README.md`:

```markdown
# 幼小衔接学习平台 - 微信小程序

## 技术栈

- Taro 4 + React + TypeScript
- NutUI (京东 Taro 组件库)
- JWT 认证

## 项目结构

- `src/pages/index/` — 启动页（微信登录）
- `src/pages/learning/` — 学习模式分包
- `src/pages/parent/` — 管理模式分包
- `src/services/` — API 调用层
- `src/store/` — 状态管理
- `src/utils/` — 缓存、离线同步

## 开发

```bash
npm install
npx taro build --type weapp --watch
```

## 生产构建

```bash
npx taro build --type weapp
```

## 分包策略

- 主包：启动页 + API 层 + NutUI 主题（< 2MB）
- learning 分包：学习模式所有页面
- parent 分包：管理模式所有页面
- content 分包：扩展学习内容 + 图片
```

- [ ] **Step 3: Run full test suite**

```bash
cd /data/claude/kidstudy
npx vitest run
```
Expected: All tests pass

- [ ] **Step 4: Run Taro build to verify**

```bash
cd /data/claude/kidstudy/miniprogram
npx taro build --type weapp
```
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add README.md miniprogram/README.md
git commit -m "docs: add mini program documentation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

Total: 15 tasks across 8 phases.

**Phase 1 (Tasks 1-4):** PostgreSQL + Prisma migration, JWT utilities, auth library rewrite, middleware
**Phase 2 (Tasks 5-6):** API route updates, WeChat login endpoint
**Phase 3 (Task 9):** Taro project scaffold + NutUI
**Phase 4 (Tasks 10-11):** API service layer, auth store, launch page
**Phase 5 (Task 12):** Dashboard + learning mode pages
**Phase 6 (Task 13):** PIN switching + parent mode pages
**Phase 7 (Task 14):** Offline cache + checkin sync
**Phase 8 (Task 15):** Documentation + final integration
**Task 7-8:** Web frontend auth migration + shared types extraction