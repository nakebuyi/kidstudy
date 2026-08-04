# 孩子管理 - 删除孩子功能设计

**日期**: 2026-08-04
**状态**: 待实现

---

## 1. 概述

在家长模式的孩子管理页面（`/parent/children`）中新增删除孩子功能。删除孩子时，通过 Prisma 级联删除（Cascade）一并清理该孩子的登录账号、学习记录、打卡记录、宠物信息等所有关联数据。

## 2. 当前状态

- 孩子管理页面已有添加孩子功能（`POST /api/children`）
- 已展示孩子列表，支持切换当前孩子
- **缺失**：删除孩子功能

## 3. API 设计

### `DELETE /api/children/[id]`

在 `src/app/api/children/[id]/route.ts` 中新增 `DELETE` 处理器。

- **鉴权**：仅家长角色（`role === "parent"`）
- **校验**：child 必须属于当前家长（`parentId === session.user.id`）
- **级联删除**：利用 Prisma 已有的 `onDelete: Cascade`，删除 Child 记录时自动清理：

| 关联数据 | 级联路径 |
|---------|---------|
| ChildAccount（登录账号） | Child → ChildAccount (Cascade) |
| LearningRecord（学习记录） | Child → LearningRecord (Cascade) |
| CheckInRecord → CheckInTask（打卡记录） | Child → CheckInRecord (Cascade) → CheckInTask (Cascade) |

- **响应**：
  - `204 No Content` — 成功
  - `401` — 未登录
  - `403` — 无权操作（非家长角色）
  - `404` — 孩子不存在
  - `500` — 删除失败

## 4. 前端设计

### 4.1 删除按钮

每个孩子卡片右下角新增红色删除按钮（`variant="destructive"`）。

### 4.2 确认对话框

使用 shadcn/ui `Dialog` 组件，要求用户输入孩子姓名以确认删除：

- 展示警告信息：操作不可撤销，列出将被删除的数据
- 输入框：需输入孩子姓名完全匹配（忽略首尾空格）
- 确认按钮在姓名不匹配时为 `disabled` 状态

### 4.3 删除后状态处理

- 从 `children` 列表中移除该孩子
- 若删除的是当前选中的孩子，自动切换到列表第一个；若列表为空，`child` 设为 `null`

### 4.4 ChildContext 新增方法

```typescript
removeChild: (childId: string) => Promise<void>;
```

- 调用 `DELETE /api/children/{id}`
- 成功后更新 `childrenList` 和 `child` 状态

## 5. 数据流

```
用户点击删除 → 弹出确认对话框 → 输入姓名 → 确认
  → DELETE /api/children/{id}
    → 后端验证 session（家长角色）
    → 验证 child 归属
    → prisma.child.delete (Cascade)
    → 204 No Content
  → ChildContext.removeChild(id)
    → 从 children 列表移除
    → 若为当前 child，自动切换
  → UI 更新
```

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| 未登录 | 后端 401，前端跳转登录页 |
| 非家长角色 | 后端 403，前端提示"无权操作" |
| 孩子不存在 | 后端 404，前端提示"孩子不存在或已被删除" |
| 网络异常 | 前端 catch，提示"网络错误，请重试" |
| 姓名不匹配 | 确认按钮 disabled，前端不发起请求 |

## 7. 涉及文件

| 文件 | 改动 |
|------|------|
| `src/app/api/children/[id]/route.ts` | 新增 — DELETE 处理器 |
| `src/app/parent/children/page.tsx` | 修改 — 删除按钮 + 确认对话框 |
| `src/store/ChildContext.tsx` | 修改 — 新增 `removeChild` 方法 |
| `src/app/api/children/[id]/route.test.ts` | 新增 — 后端测试 |
| `src/app/parent/children/page.test.tsx` | 修改 — 补充删除相关测试 |

## 8. 测试计划

### 后端测试

- `DELETE` 成功删除孩子及级联数据（ChildAccount, LearningRecord, CheckInRecord）
- 未登录返回 401
- 非家长角色返回 403
- 删除不存在的孩子返回 404
- 删除其他家长的孩子返回 404

### 前端测试

- 删除按钮渲染
- 点击删除弹出确认对话框
- 姓名不匹配时确认按钮 disabled
- 姓名匹配后调用 API 并刷新列表
- 删除当前孩子后自动切换