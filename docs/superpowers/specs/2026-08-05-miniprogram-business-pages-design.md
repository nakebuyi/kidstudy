# 小程序业务页面与组件开发 — 设计文档

**日期**: 2026-08-05
**状态**: 设计完成，待评审

---

## 1. 概述

在现有小程序基础设施（API 层、认证、缓存、离线同步）之上，完成 5 个占位业务页面和支撑组件/hooks 的开发，将小程序从框架阶段推进到可完整使用的 MVP。

## 2. 范围

### 2.1 需要重构的页面（5 个）

| 页面 | 当前状态 | 目标 |
|------|---------|------|
| `pages/learning/subject` | 占位 ("即将上线") | 5 科目 2 步学习流程（认知→测试） |
| `pages/learning/games/pet` | 占位 ("宠物") | 宠物展示、喂养、多宠物选择 |
| `pages/learning/games/shop` | 占位 ("积分商城") | 分类商品展示、积分购买 |
| `pages/parent/report` | 占位 ("学习报告") | 今日概况、周进度、趋势 |
| `pages/parent/settings` | 占位 ("家长设置") | 学习目标、时长、护眼设置 |

### 2.2 新增组件/hooks

| 模块 | 内容 |
|------|------|
| `components/learning/` | ProgressSteps、QuizOptions、ContentCard |
| `components/games/` | PetDisplay、ShopItem |
| `components/dashboard/` | SubjectCard（从 dashboard 页抽取） |
| `hooks/useLearning.ts` | 学习流程状态机 |
| `assets/icons/` | tabBar 6 个图标 |

### 2.3 Web 端同步改动

| 改动 | 说明 |
|------|------|
| 宠物页增加选择 | 小猫🐱、小狗🐶、小兔🐰 三种可选 |
| 孩子头像增加选择 | 男孩👦、女孩👧 两种可选 |

## 3. 架构

### 3.1 组件化 + 配置驱动（方案 B）

```
LearningFlow (通用骨架：进度条、步骤切换、内容加载)
  ├── SubjectConfig (每个科目配置：名称、颜色、emoji、步骤)
  └── StepRenderer (根据配置 + 科目渲染当前步骤)
        ├── LiteracyStep    (识字：认读→测试)
        ├── PinyinStep      (拼音：识记→测试)
        ├── EnglishStep     (英语：认读→测试)
        ├── MathStep        (算术：理解→测试)
        └── PoetryStep      (古诗：诵读→测试)
```

### 3.2 目录结构

```
miniprogram/src/
├── pages/learning/subject/
│   ├── index.tsx             # 学习流程骨架 + 配置驱动
│   ├── index.scss
│   └── steps/                # 各科目 Step 组件
│       ├── LiteracyStep.tsx
│       ├── PinyinStep.tsx
│       ├── EnglishStep.tsx
│       ├── MathStep.tsx
│       └── PoetryStep.tsx
├── pages/learning/games/pet/
│   ├── index.tsx
│   └── index.scss
├── pages/learning/games/shop/
│   ├── index.tsx
│   └── index.scss
├── pages/parent/report/
│   ├── index.tsx
│   └── index.scss
├── pages/parent/settings/
│   ├── index.tsx
│   └── index.scss
├── components/
│   ├── learning/
│   │   ├── ProgressSteps.tsx
│   │   ├── QuizOptions.tsx
│   │   └── ContentCard.tsx
│   ├── games/
│   │   ├── PetDisplay.tsx
│   │   └── ShopItem.tsx
│   └── dashboard/
│       └── SubjectCard.tsx
├── hooks/
│   └── useLearning.ts
└── assets/
    └── icons/                # tabBar 图标
```

## 4. 学科学习页（核心功能）

### 4.1 流程状态机

```
States:  loading → learn → quiz → complete
              ↑         ↓        ↓
              └── error ─┘   (自动循环直到内容耗尽)
```

### 4.2 useLearning hook

```typescript
function useLearning(subject: string, childId: string) {
  return {
    state: "loading" | "learn" | "quiz" | "complete" | "error",
    items: ContentItem[],
    currentIndex: number,
    currentItem: ContentItem,
    progress: { done: number, total: number },
    loadContent(),
    goToQuiz(),
    submitAnswer(correct: boolean),
    retry(),
  };
}
```

- 内容加载优先走 `utils/cache.ts` 缓存（7 天 TTL），缓存未命中则调 API
- 每道测试题通过 `api.saveLearningRecord` 实时记录
- 最后一题完成后调用 `api.completeCheckinTask` 完成打卡

### 4.3 5 科目 2 步设计

| 科目 | Step 1（认知） | Step 2（测试） |
|------|---------------|---------------|
| 识字 | 大字展示 + 拼音 + 组词 + 例句 | 看拼音选汉字（4 选 1） |
| 拼音 | 拼音展示 + 例字 + 发音提示 | 看汉字选拼音（4 选 1） |
| 英语 | 单词 + emoji + 中文 + 例句 | 看中文选英文（4 选 1） |
| 算术 | 题目展示 + 解题提示 | 选择答案（4 选 1 选项） |
| 古诗 | 诗题 + 作者 + 原文 + 译文 | 诗句填空（4 选 1 字） |

### 4.4 通用学习组件

- **ProgressSteps**: 两步进度条，当前步骤高亮，已完成步骤绿色
- **QuizOptions**: 4 选项按钮网格（2×2），点击后绿/红反馈，800ms 自动下一题
- **ContentCard**: 圆角卡片容器，统一 padding 和阴影，使用 NutUI 主题色

### 4.5 边界状态

- 内容耗尽 → "🎉 学完了" + 返回按钮
- 打卡已完成 → "✅ 今日已打卡" + 积分展示（只读）
- 加载失败 → 错误提示 + 重试按钮
- 未知科目 → "未知科目" 提示

## 5. 宠物养成页

### 5.1 宠物选择

支持三种宠物类型（新增小狗🐶、小兔🐰，保留小猫🐱）：

| 类型 | emoji | 默认名称 |
|------|-------|---------|
| cat | 🐱 | 小咪 |
| dog | 🐶 | 旺财 |
| rabbit | 🐰 | 小兔 |

- 首次进入时如无宠物，展示选择界面
- Web 端同步增加此选择功能

### 5.2 页面布局

- 宠物展示区：大 emoji + 名字 + 类型标签 + 等级 + 心情
- 状态区：等级进度条
- 喂养区：3 个食物按钮（小鱼干 5 积分、肉骨头 10 积分、蛋糕 20 积分）
- 底部显示当前积分余额
- 积分不足时按钮置灰

### 5.3 数据流

- 读取 `child.pet` JSON 字段获取宠物状态
- 调用 `api.feedPet()` 喂养，成功后刷新数据

## 6. 积分商城页

### 6.1 分类

复用 Web 端商品列表（硬编码），分 4 类：

| 分类 | 商品 |
|------|------|
| 宠物食物 | 小鱼干(10)、肉骨头(20)、蛋糕(30) |
| 宠物装扮 | 蝴蝶结(50)、小帽子(80)、太阳镜(100) |
| 工作台主题 | 星空主题(150)、花园主题(150) |
| 头像框 | 金色(200)、彩虹(200) |

### 6.2 页面布局

- 顶栏显示当前积分
- 按分类排列，每个分类 2 列网格
- 每个商品卡片：emoji + 名称 + 描述 + 价格按钮
- 积分不足时按钮置灰 + "积分不足"

### 6.3 数据流

- 读取 `child.points` 显示积分
- 调用 `api.buyItem()` 购买，成功后刷新积分

## 7. 学习报告页

### 7.1 数据来源

调用 `api.getReport(childId)`，与 Web 端共用同一 API。

### 7.2 页面布局

- 今日概况：3 个统计卡片（完成打卡数、连续天数、当前积分）
- 本周各科进度：每科进度条，薄弱科目橙色提醒
- 本周学习趋势：每日一条进度条 + 完成标记

### 7.3 边界状态

- 无数据 → "本周暂无学习记录"
- 加载中 → "加载中..."
- API 错误 → 静默处理（不阻断使用）

## 8. 家长设置页

### 8.1 设置项

| 设置项 | 范围 | 默认值 |
|--------|------|--------|
| 每科每日学习数量 | 1-20 | 5 |
| 每日使用时长（分钟） | 10-240 | 60 |
| 护眼提醒间隔（分钟） | 5-60 | 20 |
| 护眼休息时长（分钟） | 1-15 | 5 |

### 8.2 页面布局

- 使用 NutUI InputNumber 组件
- 底部保存按钮
- 保存成功/失败提示

### 8.3 数据流

- 加载：`api.getSettings()` → 填充表单
- 保存：`api` POST settings → 提示成功/失败

## 9. 孩子头像

### 9.1 改动

在创建/编辑孩子时增加头像选择：

| 头像 | emoji |
|------|-------|
| 男孩 | 👦 |
| 女孩 | 👧 |

- 小程序端：`pages/parent/children` 创建表单中增加选择
- Web 端：`parent/children` 页面同步增加
- 数据库 `Child.avatar` 字段已支持字符串存储，无需迁移

## 10. TabBar 图标

需要创建 6 个图标文件（PNG，建议 81×81 像素）：

| 图标 | 路径 |
|------|------|
| 学习（默认） | `assets/icons/learn.png` |
| 学习（激活） | `assets/icons/learn-active.png` |
| 宠物（默认） | `assets/icons/pet.png` |
| 宠物（激活） | `assets/icons/pet-active.png` |
| 我的（默认） | `assets/icons/me.png` |
| 我的（激活） | `assets/icons/me-active.png` |

使用纯色简单 SVG 图标转换为 PNG 占位，后续可替换为设计稿。

## 11. 技术约束

- 使用 NutUI 组件库（已安装），不引入额外 UI 库
- 遵循 Taro 4 跨平台兼容规则（不使用 DOM API）
- 页面文件保持在 200 行以内，复杂逻辑抽到 hooks/components
- 所有 API 调用通过现有的 `services/api.ts`，不新增接口
- 学习内容加载优先走 `utils/cache.ts` 缓存策略

## 12. 不在范围内

- 语音朗读功能（Taro 环境需特殊处理，后续单独做）
- 手写描红组件（Step 2 书写练习，后续追加）
- 打卡日历页（`pages/learning/calendar` 未注册）
- 成就徽章系统
- 内容分包（`pages/content/` 暂为空）