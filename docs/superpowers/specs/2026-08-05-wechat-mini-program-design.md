# 微信小程序 - 设计文档

> **状态：已确认** — 2026-08-05 继续讨论完成，架构与细节全部确认

## 1. 决策记录

| 决策点 | 结论 |
|--------|------|
| 技术方案 | **Taro**（React + TypeScript），复用现有代码 |
| 覆盖范围 | **全平台**（家长端 + 孩子端） |
| 登录方式 | 小程序端**仅微信登录**（`wx.login` → openid） |
| 家长/孩子模式 | **设置页切换**，家长入口需 PIN 验证 |
| 账号体系 | 小程序**独立注册**，不和 Web 端账号互通 |
| 项目结构 | **Monorepo**：现有 Next.js 作为 API 后端 + `/miniprogram` 放 Taro 项目 |
| 数据库 | **PostgreSQL**，本机部署 |
| UI 组件库 | **NutUI**（京东 Taro 组件库） |
| 登录流程 | **一登到底**，自动创建账号，后补信息 |
| API 认证 | **全量迁移到 JWT**，Web 端和小程序统一认证 |
| 音频方案 | **本地预生成 + 远程动态加载** |
| 离线能力 | **基础离线**（内容缓存 + 打卡暂存） |

## 2. 整体架构

```
┌──────────────────────┐
│  微信小程序            │
│  (Taro + React)       │
│                       │
│  ┌─────────────────┐  │
│  │ 学习模式 (孩子)   │  │
│  │ - Dashboard      │  │         HTTPS/JWT
│  │ - 五大学习模块    │  │  ──────────────────────►
│  │ - 打卡/积分/宠物  │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ 管理模式 (家长)   │  │
│  │ - 孩子管理       │  │
│  │ - 学习报告       │  │
│  │ - 设置/PIN切换   │  │
│  └─────────────────┘  │
│                       │
│  本地缓存层            │
│  ┌─────────────────┐  │
│  │ 学习内容缓存     │  │
│  │ 打卡数据暂存     │  │
│  │ 音频文件缓存     │  │
│  └─────────────────┘  │
└──────────────────────┘
                               ┌──────────────────────────┐
                               │  Next.js API 后端         │
                               │  (JWT 认证，统一入口)      │
                               │                          │
                               │  /api/auth/*              │
                               │  /api/wechat/login (新增) │
                               │  /api/children/*          │
                               │  /api/learning/*          │
                               │  /api/checkin/*           │
                               │  /api/pet/*               │
                               │  /api/shop/*              │
                               │  /api/report/*            │
                               │                          │
                               │  Prisma + PostgreSQL       │
                               └──────────────────────────┘

┌──────────────────────┐
│  Web 端 (保留)        │── JWT 登录 ──►
│  家长管理              │
└──────────────────────┘
```

- **Web 端**：保留，JWT 登录（用户名密码），家长管理用
- **小程序端**：微信登录，独立账号体系，家长和孩子在同一设备上操作
- **后端共用**：同一套 API，统一 JWT 认证，新增微信登录接口

## 3. 项目结构

```
kidstudy/
├── src/                         # 现有 Next.js（API 后端 + Web 前端）
│   ├── app/
│   │   ├── api/                 # API 路由（统一 JWT 认证）
│   │   │   ├── auth/            # 登录/注册（JWT 改造）
│   │   │   ├── wechat/          # 新增：微信相关接口
│   │   │   │   ├── login/       #   wx.login → openid → JWT
│   │   │   │   └── route.ts
│   │   │   ├── children/        # 保持不变，加 JWT 校验
│   │   │   ├── learning/        # 保持不变
│   │   │   ├── checkin/         # 保持不变
│   │   │   ├── pet/             # 保持不变
│   │   │   ├── shop/            # 保持不变
│   │   │   └── report/          # 保持不变
│   │   ├── (web)/               # Web 前端页面（域名分组）
│   │   │   ├── dashboard/
│   │   │   ├── learning/
│   │   │   ├── parent/
│   │   │   └── ...
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── auth.ts              # 改造：JWT 签发/验证（替代 NextAuth）
│   │   ├── jwt.ts               # 新增：JWT 工具函数
│   │   └── ...
│   ├── store/                   # 保持不变
│   ├── types/                   # 提取到 shared/，这里 re-export
│   └── middleware.ts            # 改造：JWT 校验中间件
│
├── miniprogram/                 # 新增：Taro 项目
│   ├── src/
│   │   ├── app.config.ts        # Taro 全局配置 + 分包配置
│   │   ├── app.tsx              # 入口：微信登录 → 模式判断
│   │   ├── pages/
│   │   │   ├── index/           # 启动页（登录中/跳转逻辑）
│   │   │   ├── dashboard/       # 学习模式：工作台首页
│   │   │   ├── learning/        # 学习模式：五大科目
│   │   │   ├── games/           # 学习模式：宠物/商城
│   │   │   ├── settings/        # 学习模式：我的/PIN验证
│   │   │   └── parent/          # 管理模式：孩子管理/报告/设置
│   │   ├── components/
│   │   │   ├── ui/              # NutUI 封装 + 儿童化主题
│   │   │   ├── learning/        # 学习组件（字卡、拼音卡等）
│   │   │   ├── dashboard/       # 工作台组件
│   │   │   └── games/           # 宠物/游戏组件
│   │   ├── hooks/               # 适配版 hooks（useAuth, useLearning 等）
│   │   ├── services/            # API 调用层（wx.request + JWT）
│   │   ├── store/               # 状态管理（本地状态 + 缓存）
│   │   └── utils/               # 工具函数（缓存、离线、音频）
│   ├── config/
│   │   ├── index.ts             # 环境配置
│   │   └── dev.ts / prod.ts     # 开发/生产环境
│   ├── project.config.json      # 微信小程序配置
│   └── package.json
│
├── shared/                      # 新增：共享代码
│   ├── types/                   # 从 src/types 提取
│   │   ├── user.ts              #   Parent, Child, User
│   │   ├── learning.ts          #   LearningRecord, SubjectContent
│   │   ├── checkin.ts           #   CheckInTask, CheckInRecord
│   │   ├── pet.ts               #   PetState
│   │   ├── shop.ts              #   ShopItem, Badge
│   │   └── index.ts
│   └── constants/
│       ├── points.ts            #   积分规则
│       ├── subjects.ts          #   科目配置（颜色、名称）
│       └── levels.ts            #   难度等级定义
│
├── content/                     # 学习内容 JSON（共享）
│   ├── literacy.json
│   ├── pinyin.json
│   ├── english.json
│   ├── math.json
│   └── poetry.json
│
├── audio/                       # 新增：预生成音频
│   ├── pinyin/                  # 拼音发音（本地打包）
│   ├── english/                 # 英语单词发音（本地打包）
│   └── poetry/                  # 古诗词朗诵（远程加载）
│
├── prisma/
│   └── schema.prisma            # 改造：provider → postgresql
└── package.json
```

## 4. 后端改造

### 4.1 JWT 认证体系

替换 NextAuth，自建 JWT 认证：

```
┌──────────┐                    ┌──────────────────┐
│  客户端    │  POST /api/auth/   │  API 后端         │
│  (Web/    │  login             │                  │
│   小程序)  │  {username, pwd}   │  验证凭据          │
│           │ ─────────────────► │  签发 JWT          │
│           │                    │  (userId, role,    │
│           │  {token, user}     │   exp: 7d)         │
│           │ ◄───────────────── │                    │
│           │                    │                    │
│           │  GET /api/xxx      │                    │
│           │  Authorization:    │  middleware         │
│           │  Bearer <token>    │  验证 JWT           │
│           │ ─────────────────► │  注入 req.user      │
│           │                    │                    │
└──────────┘                    └──────────────────┘
```

**核心文件**：
- `src/lib/jwt.ts` — `signToken(payload)`, `verifyToken(token)`, `extractUser(req)`
- `src/lib/auth.ts` — 改造：`login()`, `register()` 改用 JWT 返回 token
- `src/middleware.ts` — 改造：拦截 `/api/*`，校验 `Authorization` header，注入 `req.user`

**Web 端适配**：登录后 token 存 `localStorage`，所有 API 请求加 `Authorization` header。现有 `useAuth` / `AuthContext` 改为基于 JWT + localStorage 而不是 session cookie。

### 4.2 微信登录接口

新增 `POST /api/wechat/login`：

```
小程序 wx.login() → code
    ↓
POST /api/wechat/login { code }
    ↓
后端用 code 调微信接口获取 openid
    ↓
查 User 表, openid 存在?
    ├─ 是 → 签发 JWT，返回 { token, user, isNew: false }
    └─ 否 → 自动创建 User (Parent) + 生成默认昵称头像
            → 签发 JWT，返回 { token, user, isNew: true }
```

**Prisma Schema 变更**：
- `User` 表新增 `wechatOpenId` 字段（可选、唯一）
- `User` 表新增 `wechatAvatar`、`wechatNickname` 字段
- `User` 表新增 `role` 字段枚举：`PARENT` | `CHILD`

### 4.3 数据库迁移

- `prisma/schema.prisma`：`provider = "postgresql"`
- 新增迁移文件，保留现有数据
- 开发环境 PostgreSQL 连接串：`DATABASE_URL="postgresql://localhost:5432/kidstudy"`

## 5. 小程序前端

### 5.1 页面路由与分包策略

微信小程序主包限制 2MB，按用户模式拆分：

```
主包 (必须 < 2MB)
├── pages/index/          # 启动页（登录逻辑）
├── components/ui/        # NutUI 二次封装 + 主题
├── shared/types/         # 类型定义
├── shared/constants/     # 常量
└── services/api.ts       # API 调用层（核心）

分包 - 学习模式 (learning)
├── pages/dashboard/      # 工作台首页
├── pages/learning/       # 五大科目学习页
├── pages/games/          # 宠物/商城
├── pages/settings/       # 我的/PIN验证
├── audio/pinyin/         # 拼音发音（本地预生成）
├── audio/english/        # 英语单词发音（本地预生成）
└── content/part1.json    # 学习内容（低级别，高频）

分包 - 管理模式 (parent)
├── pages/parent/         # 孩子管理/报告/设置

分包 - 扩展内容 (content)
├── content/part2.json    # 学习内容（高级别，低频）
├── audio/poetry/         # 古诗词朗诵（可选本地缓存）
└── images/               # 图片资源
```

### 5.2 启动流程

```
用户打开小程序
    ↓
pages/index (启动页)
    ↓
wx.login() → 获取 code
    ↓
POST /api/wechat/login { code }
    ↓
后端返回 { token, user, isNew }
    ↓
存储 token 到本地
    ↓
isNew? → 直接进入学习模式（默认孩子视角）
  否   → 根据上次选择进入对应模式
    ↓
redirectTo dashboard 或 parent
```

### 5.3 模式切换

学习模式中，底部 tab 包含「我的」页，内有「家长管理」入口：

```
学习模式「我的」页
    ↓
点击「家长管理」
    ↓
弹出 PIN 码输入框（4 位数字）
    ↓
PIN 正确 → switchTab 到管理模式
    ↓
管理模式中，顶部有「返回学习模式」按钮
    ↓
切回学习模式不需要 PIN（只出不用验）
```

### 5.4 组件适配策略

shadcn/ui 组件无法直接用于 Taro（依赖 DOM）。策略：

| 原 shadcn/ui 组件 | 小程序替代方案 |
|-------------------|---------------|
| Button | NutUI Button + 儿童化样式 |
| Card | Taro View + 自定义样式 |
| Input / Label | NutUI Input / Form |
| Tabs | NutUI Tabs |
| Avatar / Badge | NutUI Avatar / Badge |
| Progress | NutUI Progress |
| Dialog / Sheet | NutUI Dialog / Popup |
| DropdownMenu | NutUI Popup + 自定义 |
| Tooltip | Taro View + 自定义动画 |

**儿童化主题**：在 NutUI 基础上覆写 CSS 变量（圆角、颜色、字号），统一暖色调 + 大圆角 + 大字号，保持和 Web 端视觉一致。

## 6. 数据流与离线策略

### 6.1 API 调用层

统一封装 `wx.request`，所有请求自动带 JWT 和错误处理：

```
┌─────────────────────────────────────────┐
│  services/api.ts                        │
│                                         │
│  request<T>(method, path, body?) → T    │
│                                         │
│  1. 从 storage 读取 token               │
│  2. 设置 Authorization header           │
│  3. wx.request 发起请求                 │
│  4. 401 → 清除 token → 跳转登录         │
│  5. 网络错误 → 检查离线缓存 → 返回缓存   │
│  6. 成功 → 返回数据                     │
└─────────────────────────────────────────┘
```

### 6.2 离线方案

```
┌──────────────────────────────────────┐
│  utils/cache.ts                      │
│                                      │
│  getLearningContent(subject, level)  │
│    ├─ 有缓存且未过期 → 返回缓存       │
│    ├─ 有网络 → 请求 → 写入缓存 → 返回 │
│    └─ 无网络无缓存 → 友好提示         │
│                                      │
│  saveCheckinLocally(data)            │
│    └─ 打卡数据暂存本地队列            │
│                                      │
│  syncPendingCheckins()               │
│    └─ 联网时批量提交暂存数据          │
└──────────────────────────────────────┘
```

**缓存策略**：
- 学习内容（文字 + 图片）：首次加载后缓存，设置 7 天过期
- 音频文件：拼音/英语基础发音打包进分包（本地直接读），古诗词在线播放时缓存
- 打卡数据：联网时直接提交；断网时存 `wx.setStorageSync`，联网后批量同步
- 用户状态（积分、宠物）：始终从 API 获取，不做本地缓存（避免数据不一致）

### 6.3 状态管理

小程序端使用轻量 reactive store 方案（Taro 事件系统 + 本地存储），不引入 MobX/Redux：

```
store/
├── auth.ts        # 登录状态：token, user, currentMode
├── child.ts       # 当前活动孩子
├── learning.ts    # 当前学习进度（页面级，用完即弃）
└── pet.ts         # 宠物状态（仅在游戏页使用）
```

## 7. 测试与部署

### 7.1 测试策略

- **后端 API 测试**：沿用现有 vitest + API route 测试，新增微信登录流程测试
- **小程序端**：Taro 官方测试工具（Jest + `@tarojs/test-utils`），覆盖核心页面和 API 调用层
- **端到端**：微信开发者工具手动测试为主，自动化成本高暂不引入

### 7.2 部署

- **后端**：Next.js 部署到 Vercel 或本机服务器，PostgreSQL 本机运行
- **小程序**：Taro build → 微信开发者工具上传 → 提交审核
- **环境变量**：小程序端 `appid`、后端 `WECHAT_APPID` + `WECHAT_SECRET` + `JWT_SECRET`

### 7.3 审核与发布

- 教育类目小程序需要《教育类目资质》（办学许可证或教育部门备案）
- 后端 API 需要 HTTPS（SSL 证书）
- 域名需要 ICP 备案
- 微信小程序后台配置服务器域名白名单（request 合法域名）

## 8. 实施顺序

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **1. 基础设施** | PostgreSQL 安装 + Prisma 迁移 + JWT 改造 | 无 |
| **2. 后端 API** | 微信登录接口 + 现有 API 加 JWT 校验 | 阶段 1 |
| **3. Taro 骨架** | 项目初始化 + NutUI + 主包 + 分包配置 | 无 |
| **4. 启动与登录** | 启动页 + wx.login 流程 + token 管理 | 阶段 2, 3 |
| **5. 学习模式** | Dashboard + 五大科目 + 打卡 + 宠物 | 阶段 4 |
| **6. 管理模式** | 孩子管理 + 报告 + PIN 切换 | 阶段 4 |
| **7. 离线与缓存** | 内容缓存 + 打卡暂存 + 音频 | 阶段 5 |
| **8. 测试与发布** | 全链路测试 + 审核提交 | 阶段 1-7 |