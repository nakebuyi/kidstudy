# 幼小衔接学习平台 — MVP 需求规格

> 基于原始需求文档 `shimmying-noodling-parnas.md` 精简重构，聚焦 MVP 可交付范围。

## 1. MVP 范围

**一句话定义**: 一个可登录的学习平台，孩子完成每日识字打卡，家长查看学习情况。移动端和桌面端均可访问。

### 1.1 MVP 包含

| 模块 | 范围 |
|------|------|
| 认证 | 家长注册/登录（NextAuth.js Credentials），孩子档案创建/切换 |
| 工作台 | 日期问候、今日任务、积分/打卡天数、快捷入口 |
| 识字模块 | 字卡展示 → 跟写描红 → 认读选择，3 个难度等级 |
| 打卡系统 | 每日生成识字任务，完成打卡，打卡日历 |
| 积分系统 | 打卡+10，学习+5，连续7天+50，积分关联宠物等级 |
| 宠物 | 简单展示（固定形象，等级随积分自动成长），不含喂养和商城 |
| 家长中心 | 孩子管理 + 周报（打卡天数、已学字数、积分、学习时长） |

### 1.2 MVP 不包含（后续阶段）

拼音、英语、算数、古诗词模块；宠物喂养/装扮；积分商城；成就徽章；补签卡；护眼模式；学习设置；日报；学习建议。

## 2. 技术选型

| 层 | 选型 | 说明 |
|----|------|------|
| 框架 | Next.js 14+ App Router | — |
| 语言 | TypeScript | — |
| 样式 | Tailwind CSS + shadcn/ui | — |
| 认证 | NextAuth.js Credentials Provider | 家长密码 bcrypt 哈希 |
| 数据库 | SQLite + Prisma ORM | 文件数据库，零配置 |
| 状态管理 | React Context + useReducer | 管理当前孩子、积分等全局状态 |
| 语音 | Web Speech API | 浏览器内置 TTS，免费 |
| 图标/插图 | emoji + CSS 图标 + 简单 SVG | 零外部依赖 |
| 部署 | Vercel | — |

## 3. 用户系统

### 3.1 用户流程

```
打开网站 → 注册/登录（家长）→ 创建孩子档案 → 进入工作台 → 开始学习
```

- 一个家长可管理多个孩子
- 登录后默认进入最近活跃的孩子档案
- 顶部导航可切换孩子
- Session 用 JWT（存家长 ID + 当前孩子 ID），切换孩子时更新 session

### 3.2 数据模型（4 张表 + 1 个 JSON 字段）

```
Parent（家长）
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String
  children      Child[]
  createdAt     DateTime

Child（孩子档案）
  id            String   @id @default(uuid())
  parentId      String
  parent        Parent   @relation(fields: [parentId])
  name          String
  avatar        String   // emoji 头像
  points        Int      @default(0)
  streak        Int      @default(0)    // 连续打卡天数
  maxStreak     Int      @default(0)
  totalCheckIns Int      @default(0)
  pet           String   // JSON: { type, name, level, mood }
  createdAt     DateTime

LearningRecord（学习记录）
  id            String   @id @default(uuid())
  childId       String
  child         Child    @relation(fields: [childId])
  charId        String   // 对应 literacy.json 中的汉字 ID
  type          String   // "learn" | "practice" | "test"
  score         Int?
  accuracy      Float?
  duration      Int      // 秒
  createdAt     DateTime

CheckInRecord（打卡记录）
  id            String   @id @default(uuid())
  childId       String
  child         Child    @relation(fields: [childId])
  date          String   // YYYY-MM-DD
  charId        String   // 当日学习的汉字 ID
  completed     Boolean  @default(false)
  pointsEarned  Int      @default(0)
  createdAt     DateTime
```

### 3.3 识字内容（静态 JSON）

不存数据库，从 `content/literacy.json` 加载，MVP 阶段准备 30 个汉字（基础级 10 个 + 进阶级 10 个 + 拓展级 10 个）：

```typescript
interface LiteracyContent {
  id: string;
  char: string;
  pinyin: string;
  radical: string;
  strokes: number;
  words: string[];
  sentences: string[];
  emoji: string;      // 表情符号配图
  level: 1 | 2 | 3;
  order: number;
}
```

## 4. 路由结构

```
/login                          # 登录
/register                       # 注册
/dashboard                      # 工作台首页
/dashboard/calendar             # 打卡日历
/learning/literacy              # 字表总览
/learning/literacy/[id]         # 单字学习（字卡+跟写+测试）
/learning/literacy/result       # 学习结果
/parent                         # 家长中心首页
/parent/children                # 孩子管理
/parent/report                  # 学习报告
```

## 5. 工作台布局 & 移动端适配

### 5.1 桌面端（≥768px）

```
┌──────────────────────────────────────────────┐
│  Logo    识字    拼音(灰)  英语(灰)  ...   👤家长 │  ← 顶部导航
├────────┬─────────────────────────────────────┤
│ 🐱小咪  │                                     │
│  Lv.3  │        主内容区                       │
│ 😊开心  │    （今日任务 / 学习 / 日历）         │
│        │                                     │
│ ⭐150分 │                                     │
│ 🔥连续7天│                                     │
├────────┴─────────────────────────────────────┤
│  💡 每日一句：千里之行，始于足下      👁️ 休息一下  │  ← 底部状态栏
└──────────────────────────────────────────────┘
```

- 左侧边栏 240px 固定，显示宠物、积分、打卡天数
- 顶部导航：当前模块高亮，未开放模块灰色+锁定图标
- 底部状态栏：每日一句 + 护眼提示

### 5.2 手机端（<768px）

```
┌─────────────────┐
│ 👤 切换孩子  积分150 │  ← 紧凑顶部栏
├─────────────────┤
│                 │
│   主内容区       │  ← 全屏内容，可滚动
│                 │
├─────────────────┤
│ 🏠工作台 📚学习 📅日历 👤家长 │  ← 底部Tab导航
└─────────────────┘
```

关键变化：
- 去掉侧边栏，宠物状态集成到工作台卡片
- 去掉顶部学科导航，学科入口作为大卡片放在工作台
- 底部 4 个 Tab：工作台、学习、日历、家长
- 顶部栏只保留孩子切换 + 积分

### 5.3 布局组件

```
src/components/layout/
├── DesktopLayout.tsx    # 顶部导航 + 侧边栏 + 底部栏
├── MobileLayout.tsx     # 顶部栏 + 内容区 + 底部Tab
└── useLayout.ts         # 监听 window.innerWidth，返回布局类型
```

内容组件（`TodayTasks`、`LearningCard`、`Calendar`）在两个布局中复用，不写两套。

## 6. 识字模块

### 6.1 路由

```
/learning/literacy              → 字表总览页
/learning/literacy/[id]         → 单字学习页（三步流程）
/learning/literacy/result       → 学习结果页
```

### 6.2 字表总览页

- 3 个难度 Tab（基础 / 进阶 / 拓展）
- 汉字网格：已学=绿色✅，学习中=橙色📖，未学=灰色🔒
- 顶部进度条：已学 X / 总数 Y
- 移动端 3 列网格，桌面端 6 列

### 6.3 单字学习页（三步流程）

**步骤 1 — 字卡展示**：
- 大字汉字 + 拼音 + 部首/笔画/组词/例句
- 发音按钮（Web Speech API TTS）
- emoji 配图

**步骤 2 — 跟写练习**：
- Canvas 显示灰色汉字底图
- 用户描红，检测覆盖率 ≥60% 即完成
- 设"跳过"按钮，不强求完成
- 不做严格笔画顺序检测

**步骤 3 — 认读测试**：
- 4 个汉字选项
- 听音选择正确汉字（Web Speech API 朗读目标字）
- 选择后立即反馈正确/错误

### 6.4 学习结果页

- 显示得分（+5）
- 正确率
- 打卡状态更新
- "继续学习" / "返回工作台"按钮

### 6.5 移动端适配

- 单字学习页全屏沉浸式，移动端和桌面端体验一致
- Canvas 响应式调整大小
- 所有按钮满足 48px 最小触摸区域

## 7. 打卡系统

### 7.1 任务生成

- MVP 只有识字 1 科，每天生成 1 个打卡任务
- 任务内容：学习 1 个新字（按 order 顺序从未学字中取）
- 完成标准：完成该字的"字卡 + 跟写 + 测试"三步
- 每日首次登录时自动生成

### 7.2 打卡日历

- 月视图日历，打卡日期 ✅ 标记
- 今天高亮边框
- 可左右切换月份
- 显示连续打卡天数和累计打卡天数
- 不做补签功能

### 7.3 打卡状态机

```
未开始 → 进行中 → 已完成 → 已领取积分（自动发放）
```

- 每日 0 点重置
- 积分自动发放，无需手动领取
- 连续天数 = 连续打卡日期数，中断归零

## 8. 积分系统

### 8.1 积分规则

| 行为 | 积分 |
|------|------|
| 完成每日打卡 | +10 |
| 连续打卡 7 天 | +50 |
| 学习完成 1 个字 | +5 |

### 8.2 积分用途

- 积分累积影响宠物等级（自动，每 100 分升一级，最高 10 级）
- 宠物等级和心情在侧边栏/工作台卡片展示
- 不做积分商城、装扮兑换、成就徽章

## 9. 宠物展示

- 宠物数据存储在 Child 表的 pet JSON 字段
- 类型：猫/狗/兔（创建孩子时选择）
- 等级 = Math.min(10, Math.floor(points / 100) + 1)
- 心情：连续打卡 3 天以上 = happy，今天已打卡 = normal，今天未打卡 = sad
- 仅展示，不做喂养/换装/商城

## 10. 家长中心

### 10.1 家长中心首页

- 当前孩子信息（姓名、头像、积分、打卡天数）
- 快捷入口：孩子管理 / 学习报告
- 退出登录

### 10.2 孩子管理

- 列表展示所有孩子（头像 + 姓名 + 积分）
- 添加孩子（姓名 + 选择 emoji 头像）
- 切换当前活跃孩子
- 删除孩子（确认弹窗，级联删除学习记录和打卡记录）

### 10.3 学习报告（周报）

```
┌──────────────────────────────┐
│  本周学习报告（7/28 - 7/31） │
├──────────────────────────────┤
│  📚 本周打卡: 4/7 天          │
│  🔤 新学汉字: 4 个            │
│  ⭐ 获得积分: 60 分           │
│  🔥 当前连续: 15 天           │
│  [打卡日历回顾]              │
│  [每日学习时长条形图]         │
└──────────────────────────────┘
```

- 打卡日历回顾：本周每天打卡状态
- 学习时长：CSS 柱状图，横轴日期纵轴分钟
- 不做学习建议、趋势分析、薄弱科目提醒

## 11. 页面路由 & 权限

| 路由 | 权限 | 说明 |
|------|------|------|
| `/login` | 未登录 | 登录页 |
| `/register` | 未登录 | 注册页 |
| `/dashboard` | 已登录 | 工作台 |
| `/dashboard/calendar` | 已登录 | 打卡日历 |
| `/learning/literacy` | 已登录 | 字表总览 |
| `/learning/literacy/[id]` | 已登录 | 单字学习 |
| `/learning/literacy/result` | 已登录 | 学习结果 |
| `/parent` | 已登录 | 家长中心 |
| `/parent/children` | 已登录 | 孩子管理 |
| `/parent/report` | 已登录 | 学习报告 |

- 未登录访问任何页面 → 重定向到 `/login`
- 已登录访问 `/login` 或 `/register` → 重定向到 `/dashboard`
- 中间件 (`middleware.ts`) 统一处理

## 12. 开发阶段

### 第一阶段：基础框架（预计 3-5 天）

- Next.js 项目初始化 + Tailwind + shadcn/ui
- Prisma + SQLite 配置，数据模型创建
- NextAuth.js 配置（Credentials Provider）
- 登录/注册页面
- 中间件权限控制
- 两套布局壳（DesktopLayout + MobileLayout）

### 第二阶段：识字模块（预计 3-5 天）

- 30 字学习内容 JSON 准备
- 字表总览页
- 单字学习页（字卡 + 描红 + 测试）
- 学习结果页
- Web Speech API 集成

### 第三阶段：打卡 + 积分 + 宠物（预计 2-3 天）

- 打卡任务生成 API
- 打卡日历页面
- 积分计算逻辑
- 宠物展示组件
- 工作台首页整合

### 第四阶段：家长中心（预计 2-3 天）

- 孩子管理（CRUD）
- 学习报告（周报）
- 家长中心首页

## 13. 后续扩展方向

- 拼音、英语、算数、古诗词模块（复用识字模块的页面结构）
- 宠物喂养 + 积分商城 + 装扮系统
- 成就徽章
- 补签卡
- 护眼模式 + 学习设置
- 日报 + 学习建议 + 趋势分析
- PWA 离线支持