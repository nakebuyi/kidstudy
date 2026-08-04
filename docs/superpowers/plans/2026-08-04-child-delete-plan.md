# 孩子管理 - 删除孩子功能 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在家长模式孩子管理页面新增删除孩子功能，后端级联删除孩子及其所有关联数据（账号、学习记录、打卡记录、宠物）。

**Architecture:** 新增 `DELETE /api/children/[id]` API 端点利用 Prisma 已有的 `onDelete: Cascade` 一次性删除 Child 及关联的 ChildAccount、LearningRecord、CheckInRecord/CheckInTask。前端通过 ChildContext 的 `removeChild` 方法调用 API，UI 使用 shadcn/ui Dialog 进行姓名输入二次确认。

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma + SQLite, Vitest, React Testing Library, shadcn/ui

## Global Constraints

- 仅家长角色（`role === "parent"`）可删除孩子
- 删除前需输入孩子姓名确认（忽略首尾空格，完全匹配）
- 删除当前选中孩子后自动切换到列表第一个，列表为空则 child 为 null
- 所有 API 响应遵循现有模式：`NextResponse.json({ error: "..." }, { status: N })`
- 前端测试使用 jsdom 环境，mock 模式与现有 `page.test.tsx` 一致

---

### Task 1: DELETE /api/children/[id] 后端 API

**Files:**
- Create: `src/app/api/children/[id]/route.ts`
- Create: `src/app/api/children/[id]/route.test.ts`

**Interfaces:**
- Consumes: `auth()` from `@/lib/auth` (returns session with `user.id` and `role`), `prisma` from `@/lib/prisma`
- Produces: `DELETE(req, { params })` handler — responds 204 on success, 401/403/404/500 on error

- [ ] **Step 1: 编写后端测试文件**

```typescript
/// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock prisma
const mockChildFindFirst = vi.fn();
const mockChildDelete = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: {
      findFirst: (...args: unknown[]) => mockChildFindFirst(...args),
      delete: (...args: unknown[]) => mockChildDelete(...args),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const child = prisma.child as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function deleteReq(childId: string): Request {
  return new Request(`http://localhost/api/children/${childId}`, {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("DELETE /api/children/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
    expect(child.findFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when role is child", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1" }, role: "child" });
    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when child does not exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue(null);
    const res = await DELETE(deleteReq("nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("孩子不存在");
  });

  it("returns 404 when child belongs to another parent", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue(null); // findFirst with parentId filter returns null
    const res = await DELETE(deleteReq("c2"), {
      params: Promise.resolve({ id: "c2" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 204 and deletes child on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue({
      id: "c1",
      parentId: "p1",
      name: "小明",
      avatar: "👦",
      points: 100,
      streak: 5,
      maxStreak: 10,
      totalCheckIns: 3,
      pet: "{}",
      createdAt: new Date(),
    });
    mockChildDelete.mockResolvedValue({ id: "c1" });

    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(204);
    expect(child.findFirst).toHaveBeenCalledWith({
      where: { id: "c1", parentId: "p1" },
    });
    expect(child.delete).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
  });

  it("returns 500 when prisma delete throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue({
      id: "c1",
      parentId: "p1",
      name: "小明",
      avatar: "👦",
      points: 0,
      streak: 0,
      maxStreak: 0,
      totalCheckIns: 0,
      pet: "{}",
      createdAt: new Date(),
    });
    mockChildDelete.mockRejectedValue(new Error("DB error"));

    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("删除失败");
  });
});
```

- [ ] **Step 2: 运行测试验证全部失败**

```bash
npx vitest run src/app/api/children/[id]/route.test.ts
```

预期：6 个测试全部 FAIL（模块不存在或导出缺失）

- [ ] **Step 3: 实现 DELETE 处理器**

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if ((session as any).role !== "parent") {
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

  try {
    await prisma.child.delete({ where: { id: childId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 运行测试验证全部通过**

```bash
npx vitest run src/app/api/children/[id]/route.test.ts
```

预期：6 个测试全部 PASS

- [ ] **Step 5: 提交**

```bash
git add src/app/api/children/[id]/route.ts src/app/api/children/[id]/route.test.ts
git commit -m "feat: add DELETE /api/children/[id] with cascade deletion"
```

---

### Task 2: ChildContext 新增 removeChild 方法

**Files:**
- Modify: `src/store/ChildContext.tsx`

**Interfaces:**
- Consumes: `DELETE /api/children/[id]` (from Task 1), `session` from `useSession()`
- Produces: `removeChild: (childId: string) => Promise<void>` added to `ChildContextType`

- [ ] **Step 1: 为 ChildContext 编写测试**

在 `src/store/ChildContext.test.tsx` 中新增 `describe("removeChild", ...)` block。

**注意**：`removeChild` 在删除当前孩子后会调用 `fetchChildren()` 刷新列表，因此测试需要在 mock fetch 链中预留刷新调用的响应。

```typescript
// 在 src/store/ChildContext.test.tsx 中新增 describe block

describe("removeChild", () => {
  it("removes child from list and switches to first remaining child when current is deleted", async () => {
    const mockUpdate = vi.fn();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "p1" }, role: "parent", currentChildId: "c1" },
      update: mockUpdate,
    });

    const initialList = [
      { id: "c1", name: "小明", avatar: "👦", points: 10, streak: 2, pet: "{}" },
      { id: "c2", name: "小红", avatar: "👧", points: 20, streak: 3, pet: "{}" },
    ];
    const afterDeleteList = [
      { id: "c2", name: "小红", avatar: "👧", points: 20, streak: 3, pet: "{}" },
    ];

    global.fetch = vi
      .fn()
      // 初始 fetchChildren（Provider mount 时 useEffect 触发）
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialList),
      })
      // DELETE call for c1
      .mockResolvedValueOnce({ ok: true, status: 204 })
      // removeChild 内部的 fetchChildren 刷新
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(afterDeleteList),
      });

    const { result } = renderHook(() => useChild(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.removeChild("c1");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/children/c1", {
      method: "DELETE",
    });
    expect(result.current.children).toHaveLength(1);
    expect(result.current.children[0].id).toBe("c2");
  });

  it("sets child to null when deleting the only child", async () => {
    const mockUpdate = vi.fn();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "p1" }, role: "parent", currentChildId: "c1" },
      update: mockUpdate,
    });

    const initialList = [
      { id: "c1", name: "小明", avatar: "👦", points: 10, streak: 2, pet: "{}" },
    ];

    global.fetch = vi
      .fn()
      // 初始 fetchChildren
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialList),
      })
      // DELETE call
      .mockResolvedValueOnce({ ok: true, status: 204 })
      // removeChild 内部的 fetchChildren 刷新（空列表）
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

    const { result } = renderHook(() => useChild(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.removeChild("c1");
    });

    expect(result.current.children).toHaveLength(0);
    expect(result.current.child).toBeNull();
  });

  it("does not modify state when DELETE fails", async () => {
    const mockUpdate = vi.fn();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "p1" }, role: "parent", currentChildId: "c1" },
      update: mockUpdate,
    });

    const initialList = [
      { id: "c1", name: "小明", avatar: "👦", points: 10, streak: 2, pet: "{}" },
    ];

    global.fetch = vi
      .fn()
      // 初始 fetchChildren
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialList),
      })
      // DELETE call fails
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useChild(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.removeChild("c1");
    });

    // Children list should remain unchanged
    expect(result.current.children).toHaveLength(1);
    expect(result.current.children[0].id).toBe("c1");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/store/ChildContext.test.tsx
```

预期：新增的 removeChild 测试 FAIL（`result.current.removeChild is not a function`）

- [ ] **Step 3: 实现 removeChild 方法**

在 `ChildContext.tsx` 中修改：

```typescript
// 在 ChildContextType 接口中新增：
interface ChildContextType {
  child: Child | null;
  children: Child[];
  setCurrentChild: (childId: string) => void;
  refreshChild: () => Promise<void>;
  refreshChildren: () => Promise<void>;
  removeChild: (childId: string) => Promise<void>;  // 新增
}

// 在 ChildContext 默认值中新增：
const ChildContext = createContext<ChildContextType>({
  child: null,
  children: [],
  setCurrentChild: () => {},
  refreshChild: async () => {},
  refreshChildren: async () => {},
  removeChild: async () => {},  // 新增
});

// 在 ChildProvider 内部新增 removeChild 实现：
const removeChild = useCallback(async (childId: string) => {
  const res = await fetch(`/api/children/${childId}`, { method: "DELETE" });
  if (!res.ok) return;

  // 乐观更新：从本地列表中移除
  setChildrenList(prev => prev.filter(c => c.id !== childId));

  // 若删除的是当前选中的孩子，需要切换
  const currentChildId = (session as any)?.currentChildId;
  if (currentChildId === childId) {
    const updated = await fetchChildren();
    if (updated.length > 0) {
      await setCurrentChild(updated[0].id);
    } else {
      setChild(null);
    }
  }
}, [fetchChildren, setCurrentChild, session]);

// 在 Provider value 中新增 removeChild：
<ChildContext.Provider
  value={{
    child,
    children: childrenList,
    setCurrentChild,
    refreshChild,
    refreshChildren,
    removeChild,
  }}
>
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/store/ChildContext.test.tsx
```

预期：所有测试 PASS

- [ ] **Step 5: 提交**

```bash
git add src/store/ChildContext.tsx src/store/ChildContext.test.tsx
git commit -m "feat: add removeChild to ChildContext for child deletion"
```

---

### Task 3: 前端删除按钮 + 确认对话框

**Files:**
- Modify: `src/app/parent/children/page.tsx`
- Modify: `src/app/parent/children/page.test.tsx`

**Interfaces:**
- Consumes: `useChild()` from `@/store/ChildContext` (now includes `removeChild`)
- Produces: Delete button on each child card, confirmation dialog with name input

- [ ] **Step 1: 补充前端测试**

在 `src/app/parent/children/page.test.tsx` 中新增：

```typescript
// 新增导入
import userEvent from "@testing-library/user-event";
// 在 lucide-react mock 中新增 Trash2：
vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  Check: () => <span>✓</span>,
  Trash2: () => <span>🗑</span>,
}));

// 新增 describe block
describe("ChildrenPage delete", () => {
  it("renders delete button on each child card", () => {
    const children = [
      { ...baseChild, id: "c1", name: "小明" },
      { ...baseChild, id: "c2", name: "小红" },
    ];
    mockUseChild.mockReturnValue({
      child: children[0],
      children,
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    const deleteButtons = screen.getAllByText("🗑");
    expect(deleteButtons).toHaveLength(2);
  });

  it("opens confirmation dialog when delete button is clicked", async () => {
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    const deleteBtn = screen.getByText("🗑");
    await userEvent.click(deleteBtn);

    expect(screen.getByText(/确认删除孩子/)).toBeInTheDocument();
    expect(screen.getByText(/此操作不可撤销/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入孩子姓名/)).toBeInTheDocument();
  });

  it("disables confirm button when name does not match", async () => {
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    await userEvent.click(screen.getByText("🗑"));

    const input = screen.getByPlaceholderText(/请输入孩子姓名/);
    await userEvent.type(input, "小红"); // 不匹配

    const confirmBtn = screen.getByText("确认删除").closest("button");
    expect(confirmBtn).toBeDisabled();
  });

  it("enables confirm button when name matches", async () => {
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    await userEvent.click(screen.getByText("🗑"));

    const input = screen.getByPlaceholderText(/请输入孩子姓名/);
    await userEvent.type(input, "小明");

    const confirmBtn = screen.getByText("确认删除").closest("button");
    expect(confirmBtn).not.toBeDisabled();
  });

  it("calls removeChild and closes dialog on confirm", async () => {
    const mockRemoveChild = vi.fn().mockResolvedValue(undefined);
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: mockRemoveChild,
    });

    render(<ChildrenPage />);
    await userEvent.click(screen.getByText("🗑"));

    const input = screen.getByPlaceholderText(/请输入孩子姓名/);
    await userEvent.type(input, "小明");

    await userEvent.click(screen.getByText("确认删除"));

    expect(mockRemoveChild).toHaveBeenCalledWith("c1");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/app/parent/children/page.test.tsx
```

预期：新增的 5 个测试 FAIL（删除按钮未渲染等）

- [ ] **Step 3: 实现删除按钮和确认对话框**

修改 `src/app/parent/children/page.tsx`：

```typescript
"use client";

import { useState } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Check, Trash2 } from "lucide-react";

export default function ChildrenPage() {
  const { child, children, setCurrentChild, refreshChildren, removeChild } = useChild();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  // 账号创建相关状态（保持不变）
  const [accountChildId, setAccountChildId] = useState<string | null>(null);
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountNickname, setAccountNickname] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");

  // 删除相关状态
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteChild = async () => {
    if (!deleteTarget || deleteConfirmName.trim() !== deleteTarget.name) return;
    setDeleteLoading(true);
    try {
      await removeChild(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmName("");
    } catch {
      // 错误已在 removeChild 中处理
    } finally {
      setDeleteLoading(false);
    }
  };

  // ... handleCreateAccount, handleAddChild 保持不变 ...

  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ... 标题和添加孩子区域保持不变 ... */}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">👶 孩子管理</h1>
          <Button onClick={() => setShowAdd(!showAdd)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            添加孩子
          </Button>
        </div>

        {/* ... showAdd 表单保持不变 ... */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((c) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                child?.id === c.id ? "ring-2 ring-orange-400" : ""
              }`}
              onClick={() => setCurrentChild(c.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-4xl">{c.avatar}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg">{c.name}</span>
                    {child?.id === c.id && (
                      <Badge variant="default" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        当前
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    🌟 {c.points} 积分 · 🔥 {c.streak} 天
                  </div>
                  <div className="mt-2">
                    {c.account ? (
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        👤 登录账号：{c.account.nickname}（{c.account.username}）
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccountChildId(c.id);
                          setAccountUsername("");
                          setAccountPassword("");
                          setAccountNickname(c.name);
                          setAccountMessage("");
                        }}
                      >
                        🔑 创建登录账号
                      </Button>
                    )}
                  </div>
                </div>
                {/* 删除按钮 */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: c.id, name: c.name });
                    setDeleteConfirmName("");
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ... 空状态和 accountMessage 保持不变 ... */}

        {/* 删除确认对话框 */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmName(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>⚠️ 确认删除孩子</DialogTitle>
              <DialogDescription className="space-y-2">
                <p>此操作不可撤销！将删除以下所有数据：</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>孩子的登录账号</li>
                  <li>所有学习记录</li>
                  <li>所有打卡记录</li>
                  <li>宠物信息和积分</li>
                </ul>
                <p className="pt-2">
                  请输入孩子姓名 <strong>"{deleteTarget?.name}"</strong> 以确认删除：
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="请输入孩子姓名"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmName("");
                }}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteChild}
                disabled={deleteConfirmName.trim() !== deleteTarget?.name || deleteLoading}
              >
                {deleteLoading ? "删除中..." : "确认删除"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DesktopLayout>
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/app/parent/children/page.test.tsx
```

预期：所有测试 PASS

- [ ] **Step 5: 运行完整测试套件确认无回归**

```bash
npx vitest run
```

- [ ] **Step 6: 提交**

```bash
git add src/app/parent/children/page.tsx src/app/parent/children/page.test.tsx
git commit -m "feat: add delete child button with confirmation dialog"
```

---

### Task 4: 集成验证

- [ ] **Step 1: 构建验证**

```bash
npx tsc --noEmit
```

无类型错误。

- [ ] **Step 2: 完整测试**

```bash
npx vitest run
```

所有测试通过。

- [ ] **Step 3: 手动验证清单**

由于本项目为纯前端 + API 结构，启动开发服务器后验证：
1. 登录家长账号 → 进入 `/parent/children`
2. 每个孩子卡片显示红色删除按钮
3. 点击删除按钮 → 弹出确认对话框
4. 输入错误姓名 → 确认按钮 disabled
5. 输入正确姓名 → 点击确认删除 → 孩子从列表消失
6. 删除当前选中孩子 → 自动切换到第一个孩子
7. 删除最后一个孩子 → 列表为空

- [ ] **Step 4: 最终提交（如有修改）**

```bash
git add -A
git commit -m "chore: final integration verification for child delete feature"
```