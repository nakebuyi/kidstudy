# Parent/Child Account Separation Design

**Date:** 2026-08-01
**Status:** Draft

## 1. Overview

Separate parent accounts from child accounts so that:
- **Parent accounts** have access to the parent center (child management, reports, settings)
- **Child accounts** have their own login, see daily learning tasks, check-in, points, and pet
- Registration requires a nickname

## 2. Data Model Changes

### 2.1 New Model: `ChildAccount`

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

### 2.2 Modified Model: `Parent`

Add `nickname` field:

```prisma
model Parent {
  // ... existing fields ...
  nickname     String   // NEW: display name for the parent
}
```

### 2.3 `Child` Model

Unchanged. Continues to store learning data (points, streak, pet, check-ins).

### 2.4 Relationship Diagram

```
Parent (1) ──< (N) Child (1) ── (1) ChildAccount
                                   ├── username
                                   ├── passwordHash
                                   └── nickname
```

## 3. Auth Changes

### 3.1 Login Flow

Login searches both `Parent` and `ChildAccount` tables:

1. Try `Parent.findUnique({ username })` → if found & password matches → role = `parent`
2. Try `ChildAccount.findUnique({ username })` → if found & password matches → role = `child`
3. Neither → return error

Session token stores `role`:

```typescript
// JWT callback
token.role = user.role;        // "parent" | "child"
token.nickname = user.nickname;
token.childId = user.childId;  // only for child accounts
```

### 3.2 Registration

**Parent registration** (`/api/auth/register`):
- Fields: `username`, `password`, `nickname` (NEW)
- Creates `Parent` record with `nickname`

**Child account creation** (`/api/children/[id]/account`):
- New endpoint, parent-only
- Fields: `username`, `password`, `nickname`
- Creates `ChildAccount` linked to existing `Child`

### 3.3 Middleware

Update `middleware.ts` to enforce role-based access:

| Route | Parent | Child |
|-------|--------|-------|
| `/dashboard` | redirect `/parent` | ✅ |
| `/dashboard/*` | redirect `/parent` | ✅ |
| `/learning/*` | read-only preview | ✅ |
| `/games/*` | redirect `/parent` | ✅ |
| `/parent/*` | ✅ | redirect `/dashboard` |

## 4. UI Changes

### 4.1 Registration Page

Add `nickname` field:

```
┌─────────────────────────┐
│      📝 注册账号         │
│                         │
│  昵称  [______________] │  ← NEW
│  用户名 [______________] │
│  密码  [______________] │
│                         │
│  [ 注册 ]               │
└─────────────────────────┘
```

### 4.2 TopNav (role-based)

| Element | Parent | Child |
|---------|--------|-------|
| 学习科目 tabs | ✅ | ✅ |
| 家长中心 link | ✅ | ❌ |
| 退出 button | ✅ | ✅ |

### 4.3 Sidebar (role-based)

| Element | Parent | Child |
|---------|--------|-------|
| 孩子切换器 dropdown | ✅ | ❌ |
| 宠物展示 | ✅ | ✅ |
| 积分展示 | ✅ | ✅ |
| 打卡天数 | ✅ | ✅ |

### 4.4 Parent Center

Parent's default page after login. Shows:
- Child list with quick actions (add, manage accounts)
- Links to reports, settings, children management

### 4.5 Child Dashboard

Child's default page after login. Shows:
- Daily learning tasks
- Check-in tasks
- Points and streak summary
- Pet status

## 5. API Routes

### 5.1 New Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/children/[id]/account` | parent | Create child login account |
| DELETE | `/api/children/[id]/account` | parent | Remove child login account |

### 5.2 Modified Routes

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/auth/register` | Add `nickname` field |
| POST | `/api/auth/[...nextauth]` | Search both Parent + ChildAccount |

## 6. Child Account Creation Flow

```
Parent login → 家长中心 → 孩子管理 → 点击孩子 → "创建登录账号"
                                              ↓
                                    填写: 用户名 + 密码 + 昵称
                                              ↓
                                    创建 ChildAccount 记录
                                              ↓
                                    显示账号信息给家长
```

## 7. Migration Plan

1. **Prisma schema**: Add `nickname` to `Parent`, add `ChildAccount` model
2. **Migration**: `prisma db push` (SQLite/Turso auto-handles)
3. **Existing data**: Existing `Parent` records get default nickname = username
4. **Existing Child records**: No `ChildAccount` created automatically; parent creates them on demand

## 8. Scope

### In Scope
- ChildAccount model and login
- Role-based navigation (TopNav, Sidebar)
- Registration with nickname
- Parent center default page
- Child dashboard with tasks
- Middleware role enforcement

### Out of Scope
- Parent "read-only preview" of child learning (future)
- Nickname editing after registration (future)
- Multiple child accounts per Child (not needed)