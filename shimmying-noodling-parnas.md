# 幼小衔接学习平台 - 详细需求文档

## 1. 项目概述

### 1.1 项目定位
面向 5-7 岁幼小衔接阶段儿童的在线学习平台，采用工作台（Dashboard）风格布局，融合每日打卡、分科学习和积分养成游戏，为家长提供学习进度跟踪和报告功能。

### 1.2 技术选型
- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: React Context + useReducer
- **数据存储**: 本地 JSON 文件（内置内容）+ 浏览器 IndexedDB / localStorage（用户数据）
- **部署**: Vercel / 静态导出

### 1.3 用户角色

| 角色 | 描述 |
|------|------|
| **家长** | 主账号，管理孩子档案，查看学习报告，设置学习计划 |
| **孩子** | 子账号，归属于家长账号，进行每日学习和游戏 |

---

## 2. 功能模块

### 2.1 工作台首页（Dashboard）

**入口**: 登录后默认进入

**布局**: 左侧导航 + 右侧内容区的工作台样式

**功能**:
- 顶部：日期、天气、欢迎语（"小明，早上好！今天也要加油哦~"）
- 今日任务卡片：展示当日 5 科打卡任务完成情况
- 学习进度概览：本周各科完成率环形图
- 积分余额 & 连续打卡天数展示
- 快捷入口：各科学习入口、游戏入口
- 学习小贴士 / 每日一句（古诗词）

### 2.2 五大学习模块

每个模块独立导航页面，结构统一：

#### 2.2.1 识字模块
- **内容**: 按难度分级（基础 300 字 → 进阶 300 字 → 拓展 400 字，共 1000 字）
- **学习流程**:
  - 字卡展示：汉字 + 拼音 + 笔画动画 + 组词 + 配图
  - 跟写练习：描红/笔画顺序练习
  - 认读测试：四选一选择正确汉字
- **学习记录**: 已学字数、掌握程度（认识/会写）

#### 2.2.2 拼音模块
- **内容**: 声母(23个) + 韵母(24个) + 整体认读音节(16个)
- **学习流程**:
  - 发音示范（音频播放）
  - 拼读练习：声母+韵母组合拼读
  - 声调练习：四声识别
  - 拼写测试：听音选拼音
- **学习记录**: 已学音节数、拼读准确率

#### 2.2.3 英语模块
- **内容**: 基础词汇（动物、水果、颜色、数字、身体部位、家庭成员等分类）+ 简单句型
- **学习流程**:
  - 单词卡：英文 + 中文 + 图片 + 发音
  - 跟读练习（利用浏览器语音识别）
  - 配对游戏：单词-图片连线
  - 听力测试：听音选图
- **学习记录**: 已学单词数、掌握程度

#### 2.2.4 算数模块
- **内容**: 10以内加减 → 20以内加减 → 100以内加减 → 简单乘法（九九乘法表）
- **学习流程**:
  - 数数练习：实物计数动画
  - 计算练习：竖式计算、填空
  - 口算挑战：限时答题
  - 应用题：图文结合的生活场景题
- **学习记录**: 正确率、答题速度

#### 2.2.5 古诗词模块
- **内容**: 精选 50 首适合幼小衔接的古诗（咏鹅、静夜思、春晓等）
- **学习流程**:
  - 诗词展示：原文 + 拼音 + 注释 + 译文
  - 朗诵播放：专业配音音频
  - 跟读/背诵模式
  - 诗词填空：缺字补全
  - 诗词配对：上句对下句
- **学习记录**: 已学诗词数、背诵数量

### 2.3 每日打卡任务系统

**核心机制**:
- 每日自动生成 5 个打卡任务（每科 1 个）
- 任务内容每日轮换，难度递进
- 完成打卡获得积分（每科 10 分，全部完成额外奖励 10 分，共 60 分/天）

**任务类型**（每科轮换）:
| 科目 | 任务类型 |
|------|----------|
| 识字 | 认读 3 个新字 / 书写练习 2 个字 / 字词配对 |
| 拼音 | 拼读 3 个音节 / 声调练习 / 听音辨音 |
| 英语 | 学习 3 个新单词 / 跟读练习 / 单词配对 |
| 算数 | 完成 10 道口算 / 应用题挑战 / 数数练习 |
| 古诗词 | 朗读 1 首古诗 / 诗词填空 / 诗句配对 |

**打卡日历**:
- 月视图日历，标注打卡日期
- 连续打卡天数统计
- 补签机制：连续打卡 7 天获得 1 张补签卡

### 2.4 积分与养成系统（寓教于乐）

**积分获取**:
| 行为 | 积分 |
|------|------|
| 完成每日打卡（单科） | +10 |
| 每日全部打卡完成 | +10（额外） |
| 连续打卡 7 天 | +50 |
| 完成一次游戏 | +5~20 |
| 学习新内容（每科） | +5 |

**养成系统（积分消耗）**:
- **宠物/伙伴系统**: 孩子有一只虚拟宠物（可选小猫、小狗、小兔子等）
  - 积分喂养宠物（食物、玩具、装扮）
  - 宠物随着学习进度成长进化
  - 宠物会有心情变化（不学习时心情低落，学习时开心）
- **装扮系统**: 用积分兑换工作台主题皮肤、头像框、宠物装扮
- **成就徽章**: 达成里程碑自动获得（学完100字/背完10首诗/连续打卡30天等）

### 2.5 家长中心

**功能**:
- **孩子管理**: 创建/切换孩子档案（支持多个孩子）
- **学习报告**: 
  - 日报：今日学习内容、打卡情况、得分
  - 周报：本周各科进度、学习时长趋势
  - 学习建议：薄弱科目提醒
- **学习设置**:
  - 每日学习目标（各科题量/字数）
  - 学习时间段限制
  - 游戏时间限制
- **护眼设置**: 定时休息提醒、使用时长限制

---

## 3. 页面与导航结构

### 3.1 路由规划

```
/login                    # 登录页（家长登录）
/register                 # 注册页
/dashboard                # 工作台首页（孩子视角）
  /dashboard/tasks        # 今日打卡任务
  /dashboard/rewards      # 积分商城/养成
  /dashboard/calendar     # 打卡日历
/learning                 # 学习模块
  /learning/literacy      # 识字
  /learning/pinyin        # 拼音
  /learning/english       # 英语
  /learning/math          # 算数
  /learning/poetry        # 古诗词
/games                    # 游戏中心
  /games/pet              # 宠物养成
  /games/shop             # 装扮商店
/parent                   # 家长中心
  /parent/report          # 学习报告
  /parent/children        # 孩子管理
  /parent/settings        # 学习设置
```

### 3.2 工作台布局

```
┌──────────────────────────────────────────────────┐
│  Logo   识字  拼音  英语  算数  古诗词  游戏  │ 👤家长 │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│  宠物  │        主内容区域                        │
│  展示  │        (Dashboard / 学习 / 游戏)         │
│  区域  │                                         │
│        │                                         │
│  积分  │                                         │
│  打卡  │                                         │
│        │                                         │
├────────┴─────────────────────────────────────────┤
│  底部：学习提示 / 进度条 / 护眼提醒              │
└──────────────────────────────────────────────────┘
```

- **顶部导航**: 横向排列，当前模块高亮，图标+文字
- **左侧边栏**: 宠物形象、积分余额、连续打卡天数、快捷任务
- **主内容区**: 根据路由切换内容
- **底部状态栏**: 当前学习提示、护眼倒计时

---

## 4. 数据模型

### 4.1 用户与孩子
```typescript
// 家长账户
interface Parent {
  id: string;
  username: string;
  password: string; // 哈希存储
  avatar?: string;
  createdAt: Date;
}

// 孩子档案
interface Child {
  id: string;
  parentId: string;
  name: string;
  avatar: string;
  age: number;
  // 学习进度
  points: number;           // 积分余额
  streak: number;           // 连续打卡天数
  maxStreak: number;        // 最高连续打卡记录
  totalCheckIns: number;    // 累计打卡次数
  makeupCards: number;      // 补签卡数量
  // 宠物
  pet: PetState;
  // 装扮
  theme: string;            // 工作台主题
  avatarFrame: string;      // 头像框
  // 设置
  dailyGoal: DailyGoal;     // 每日目标
  screenTimeLimit: number;  // 每日使用时长限制(分钟)
}
```

### 4.2 学习记录
```typescript
interface LearningRecord {
  id: string;
  childId: string;
  subject: Subject;          // 'literacy' | 'pinyin' | 'english' | 'math' | 'poetry'
  type: 'learn' | 'practice' | 'test';
  contentId: string;         // 学习内容ID
  score?: number;            // 得分
  accuracy?: number;         // 正确率
  duration: number;          // 学习时长(秒)
  createdAt: Date;
}

interface CheckInRecord {
  id: string;
  childId: string;
  date: string;              // YYYY-MM-DD
  tasks: CheckInTask[];      // 5个任务
  allCompleted: boolean;
  bonusEarned: boolean;
  createdAt: Date;
}

interface CheckInTask {
  subject: Subject;
  taskType: string;          // 任务类型
  completed: boolean;
  score: number;
  completedAt?: Date;
}
```

### 4.3 学习内容
```typescript
// 识字
interface LiteracyContent {
  id: string;
  char: string;            // 汉字
  pinyin: string;          // 拼音
  radical: string;         // 部首
  strokes: number;         // 笔画数
  strokeOrder: string;     // 笔顺
  words: string[];         // 组词
  sentences: string[];     // 例句
  imageUrl: string;        // 配图
  audioUrl: string;        // 发音
  level: 1 | 2 | 3;       // 难度等级
  order: number;           // 学习顺序
}

// 拼音
interface PinyinContent {
  id: string;
  pinyin: string;          // 拼音
  type: 'initial' | 'final' | 'whole';  // 声母/韵母/整体认读
  audioUrl: string;
  examples: string[];      // 例字
  level: number;
  order: number;
}

// 英语
interface EnglishContent {
  id: string;
  word: string;
  chinese: string;
  category: string;        // 分类
  imageUrl: string;
  audioUrl: string;
  sentences: string[];     // 例句
  level: number;
  order: number;
}

// 算数
interface MathContent {
  id: string;
  type: 'addition' | 'subtraction' | 'multiplication' | 'word_problem';
  question: string;
  answer: number;
  options?: number[];      // 选择题选项
  imageUrl?: string;       // 配图
  level: number;           // 1=10以内 2=20以内 3=100以内 4=乘法
  order: number;
}

// 古诗词
interface PoetryContent {
  id: string;
  title: string;
  author: string;
  dynasty: string;         // 朝代
  content: string;         // 原文
  pinyin: string;          // 带拼音
  translation: string;     // 译文
  annotation: string;      // 注释
  audioUrl: string;        // 朗诵音频
  level: number;
  order: number;
}
```

### 4.4 宠物与装扮
```typescript
interface PetState {
  type: string;            // 宠物类型
  name: string;            // 宠物名字
  level: number;           // 等级(1-10)
  mood: 'happy' | 'normal' | 'sad';
  hunger: number;          // 饱食度(0-100)
  lastFedAt: Date;
  accessory: string;       // 佩戴的装扮
}

interface ShopItem {
  id: string;
  type: 'food' | 'accessory' | 'theme' | 'frame';
  name: string;
  description: string;
  price: number;           // 积分价格
  imageUrl: string;
  requiredLevel?: number;  // 需要的宠物等级
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;       // 获得条件描述
  earnedAt?: Date;
}
```

---

## 5. UI/UX 设计规范

### 5.1 视觉风格
- **整体风格**: 明亮、温暖、童趣、圆角设计
- **配色**: 柔和暖色调为主，各科不同主题色
  - 识字: 橙黄色 🟠
  - 拼音: 天蓝色 🔵
  - 英语: 草绿色 🟢
  - 算数: 紫粉色 🟣
  - 古诗词: 中国红 🔴
- **字体**: 标题使用圆体/卡通字体，正文使用清晰易读字体
- **图标**: 大图标 + 文字，方便孩子识别
- **动画**: 适度的微交互动画（按钮反馈、完成动画、积分飞入等）

### 5.2 响应式设计
- 优先适配平板（iPad 尺寸，1024x768）
- 桌面端（1920x1080）完整工作台布局
- 移动端（375x812）简化布局，折叠导航

### 5.3 无障碍设计
- 大按钮（最小 48x48px 触摸区域）
- 高对比度文字
- 语音反馈（答对/答错音效）
- 错误友好提示

---

## 6. 技术架构

### 6.1 项目结构
```
kidstudy/
├── public/
│   ├── images/           # 图片资源
│   ├── audio/            # 音频资源
│   └── data/             # 静态学习内容 JSON
├── src/
│   ├── app/              # Next.js App Router 页面
│   │   ├── layout.tsx    # 根布局
│   │   ├── page.tsx      # 首页/登录
│   │   ├── dashboard/    # 工作台
│   │   ├── learning/     # 学习模块
│   │   ├── games/        # 游戏中心
│   │   └── parent/       # 家长中心
│   ├── components/       # 通用组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   ├── layout/       # 布局组件
│   │   ├── learning/     # 学习相关组件
│   │   ├── games/        # 游戏相关组件
│   │   └── dashboard/    # 工作台组件
│   ├── hooks/            # 自定义 Hooks
│   ├── lib/              # 工具函数
│   │   ├── storage.ts    # 本地存储封装
│   │   ├── checkin.ts    # 打卡逻辑
│   │   ├── points.ts     # 积分逻辑
│   │   └── content.ts    # 内容加载
│   ├── store/            # 状态管理
│   │   ├── auth.tsx      # 认证状态
│   │   ├── child.tsx     # 当前孩子状态
│   │   └── learning.tsx  # 学习状态
│   ├── types/            # TypeScript 类型定义
│   └── styles/           # 全局样式
├── content/              # 学习内容数据
│   ├── literacy.json     # 识字内容
│   ├── pinyin.json       # 拼音内容
│   ├── english.json      # 英语内容
│   ├── math.json         # 算数内容
│   └── poetry.json       # 古诗词内容
├── tailwind.config.ts
├── next.config.js
└── package.json
```

### 6.2 数据存储方案
- **学习内容**: JSON 文件静态导入（内置固定内容）
- **用户数据**: localStorage（MVP阶段），后续可迁移到 IndexedDB 或后端 API
- **状态管理**: React Context 管理全局状态（当前用户、孩子、积分等）

### 6.3 关键交互流程

**每日学习流程**:
```
登录 → 选择孩子 → 工作台首页
  → 查看今日任务
  → 进入某科学习页面
  → 完成学习内容 → 获得积分
  → 返回工作台 → 该科任务标记完成
  → 全部完成 → 额外奖励 → 宠物开心动画
```

**积分养成流程**:
```
学习/打卡 → 获得积分 → 进入宠物页面
  → 喂养宠物（消耗积分） → 宠物成长
  → 积分商城兑换装扮 → 宠物/工作台换装
```

---

## 7. 开发阶段规划

### 第一阶段：基础框架 + 工作台
- Next.js 项目初始化 + Tailwind + shadcn/ui
- 工作台布局（导航 + 侧边栏 + 内容区）
- 登录/注册页面（家长账号）
- 孩子管理（增删切换）
- 路由框架搭建

### 第二阶段：学习内容 + 打卡
- 5 科学习内容数据准备（各 20-30 条初始内容）
- 识字模块页面 + 学习流程
- 拼音模块页面 + 学习流程
- 英语模块页面 + 学习流程
- 算数模块页面 + 学习流程
- 古诗词模块页面 + 学习流程
- 每日打卡任务生成 + 完成逻辑

### 第三阶段：积分 + 养成
- 积分系统
- 宠物养成页面
- 积分商城/装扮
- 成就徽章系统
- 打卡日历

### 第四阶段：家长中心 + 优化
- 学习报告（日报/周报）
- 学习设置
- 护眼模式
- 动画效果优化
- 响应式适配

---

## 8. 待确认事项

1. **音频资源**: 拼音发音、英语单词发音、古诗词朗诵等音频资源如何获取？（TTS 生成 / 预录制 / 第三方 API）
2. **图片资源**: 汉字配图、英语单词配图等图片资源如何获取？（AI 生成 / 图库 / 设计师绘制）
3. **内容量**: 初始阶段各科准备多少内容量？（建议 MVP 阶段每科 20-30 条，后续扩展）
4. **多语言**: 是否需要英文版/中文版切换？
5. **部署方式**: Vercel 部署 / 静态导出 / 自建服务器？