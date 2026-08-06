# 小程序语音朗读、成就徽章、打卡日历 — 设计文档

**日期**: 2026-08-06
**状态**: 设计完成

---

## 1. 语音朗读（小程序）

### 1.1 架构

利用 Web 服务器已生成的 MP3 音频文件，小程序通过 `Taro.createInnerAudioContext()` 远程播放。

```
Web 服务器                      小程序
─────────                      ────────
public/audio/
├── en/word/{slug}.mp3  ───→   Taro.createInnerAudioContext().src = "https://.../audio/en/word/{slug}.mp3"
├── en/sentence/{slug}.mp3 ─→  (同上)
├── zh/pinyin/{slug}.mp3   ─→  (同上)
├── zh/char/{slug}.mp3     ─→  (同上)
└── zh/poetry/{slug}.mp3   ─→  (同上)

src/lib/data/*-audio-map.json  ─→  miniprogram/src/data/*-audio-map.json (复制)
```

### 1.2 AudioMap 数据

将 Web 端的 3 个音频映射 JSON 文件复制到小程序：

| 源文件 | 目标文件 |
|--------|---------|
| `src/lib/data/english-audio-map.json` | `miniprogram/src/data/english-audio-map.json` |
| `src/lib/data/pinyin-audio-map.json` | `miniprogram/src/data/pinyin-audio-map.json` |
| `src/lib/data/poetry-audio-map.json` | `miniprogram/src/data/poetry-audio-map.json` |

### 1.3 SpeakAudio 组件

新增 `miniprogram/src/components/learning/SpeakAudio.tsx`：

```typescript
interface SpeakAudioProps {
  text: string;
  kind: "word" | "sentence" | "pinyin" | "char" | "poetry";
  dir?: string;  // 默认 "en"
  map?: AudioMap; // 默认 englishAudioMap
}
```

- 解析 slug，不匹配则返回 null（不渲染）
- 点击时创建 InnerAudioContext，播放 `/audio/{dir}/{kind}/{slug}.mp3`
- 播放中显示 "🔊"，播放完毕恢复
- 复用同一个 InnerAudioContext 实例

### 1.4 集成到各科学习步骤

在 5 个科目的 `LearnStep` 组件中加入朗读按钮：

| 科目 | 位置 | 朗读内容 | map |
|------|------|---------|-----|
| 识字 | 大字展示旁 | 拼音+例字(可选) | pinyinAudioMap |
| 拼音 | 拼音展示旁 | 拼音+例字 | pinyinAudioMap |
| 英语 | 单词展示旁 | 单词+例句 | englishAudioMap |
| 算术 | 不添加 | — | — |
| 古诗 | 原文旁 | 全诗 | poetryAudioMap |

### 1.5 边界状态

- 文本不在 map 中 → 不渲染按钮（静默降级）
- 网络错误 → catch 静默处理，不阻断学习流程
- 音频文件不存在 → InnerAudioContext 触发 onError，静默处理

---

## 2. 成就徽章（小程序）

### 2.1 架构

前端纯计算，不持久化。徽章数据从 `Child` 对象的 `{ points, streak, maxStreak, totalCheckIns }` 实时计算。

### 2.2 徽章定义

与 Web 端一致的 8 个徽章：

| ID | 名称 | 图标 | 条件 |
|----|------|------|------|
| first_checkin | 初次打卡 | 🌟 | totalCheckIns >= 1 |
| streak_3 | 连续3天 | 🔥 | streak >= 3 |
| streak_7 | 周冠军 | 👑 | streak >= 7 |
| streak_30 | 月度之星 | 🏆 | maxStreak >= 30 |
| points_100 | 积分达人 | 💰 | points >= 100 |
| points_500 | 积分富豪 | 💎 | points >= 500 |
| checkin_10 | 坚持10天 | 📅 | totalCheckIns >= 10 |
| checkin_50 | 坚持50天 | 🎖️ | totalCheckIns >= 50 |

### 2.3 BadgesDisplay 组件

新增 `miniprogram/src/components/dashboard/BadgesDisplay.tsx`：

```typescript
interface BadgesDisplayProps {
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
}
```

- 计算已解锁和未解锁徽章
- 已解锁：彩色 + 正常透明度
- 未解锁：灰度 + 半透明 + 带 tooltip 提示条件
- 全部锁定 → 显示 "开始学习，解锁徽章！"

### 2.4 集成到学习仪表盘

在 `pages/learning/dashboard/index.tsx` 中 child 数据加载后，将 BadgesDisplay 添加到页面底部。

---

## 3. 打卡日历（小程序）

### 3.1 页面注册

- 新建 `pages/learning/calendar/index.tsx` + `index.scss`
- 注册到 `app.config.ts` 的 `learning` 分包 pages 中
- 在仪表盘添加入口按钮 "📅 打卡日历"

### 3.2 页面布局

```
┌──────────────────────────────┐
│  ← 2026年8月 →               │
│ 日 一 二 三 四 五 六           │
│        1  2  3  4  5  6       │
│  7  8  9 10 11 12 13          │
│ 14 15 16 17 18 19 20          │
│ 21 22 23 24 25 26 27          │
│ 28 29 30 31                   │
│                               │
│ ┌──────┬──────┬──────┐       │
│ │连续5天│最高7天│本月8天│       │
│ └──────┴──────┴──────┘       │
└──────────────────────────────┘
```

- 打勾日：绿色背景 + ✅
- 今天：橙色背景 + 橙色边框
- 未来日：灰色文字
- 月份切换：左右箭头

### 3.3 数据来源

调用 `api.getCalendar(childId, month)` — 已存在于 `services/api.ts`

### 3.4 统计卡片

- 连续打卡天数（child.streak）
- 最高纪录（child.maxStreak）
- 本月打卡数（dates.length）

### 3.5 边界状态

- 加载中 → "加载中..."
- 无数据 → 正常显示空日历网格
- API 错误 → 静默处理，显示空日历

---

## 4. 文件变更清单

### 4.1 语音朗读

| 操作 | 文件 |
|------|------|
| 新增 | `miniprogram/src/data/english-audio-map.json` (复制) |
| 新增 | `miniprogram/src/data/pinyin-audio-map.json` (复制) |
| 新增 | `miniprogram/src/data/poetry-audio-map.json` (复制) |
| 新增 | `miniprogram/src/components/learning/SpeakAudio.tsx` |
| 新增 | `miniprogram/src/components/learning/SpeakAudio.scss` |
| 修改 | `miniprogram/src/pages/learning/subject/steps/LiteracyStep.tsx` |
| 修改 | `miniprogram/src/pages/learning/subject/steps/PinyinStep.tsx` |
| 修改 | `miniprogram/src/pages/learning/subject/steps/EnglishStep.tsx` |
| 修改 | `miniprogram/src/pages/learning/subject/steps/PoetryStep.tsx` |

### 4.2 成就徽章

| 操作 | 文件 |
|------|------|
| 新增 | `miniprogram/src/components/dashboard/BadgesDisplay.tsx` |
| 新增 | `miniprogram/src/components/dashboard/BadgesDisplay.scss` |
| 修改 | `miniprogram/src/pages/learning/dashboard/index.tsx` |

### 4.3 打卡日历

| 操作 | 文件 |
|------|------|
| 新增 | `miniprogram/src/pages/learning/calendar/index.tsx` |
| 新增 | `miniprogram/src/pages/learning/calendar/index.scss` |
| 修改 | `miniprogram/src/app.config.ts` |
| 修改 | `miniprogram/src/pages/learning/dashboard/index.tsx` |

---

## 5. 不在范围内

- 识字模块的预生成音频（后续可追加）
- 徽章数据库持久化（保持前端计算）
- 徽章解锁动画通知
- 算术科目的朗读（算术以数字和符号为主，不适合朗读）

## 6. 技术约束

- 所有组件使用 `@tarojs/components`（View/Text），不引入 NutUI
- 音频播放使用 `Taro.createInnerAudioContext()`，不依赖 Web Audio API
- SCSS 使用 BEM 命名，px 单位
- 页面文件保持在 200 行以内
- 遵循现有小程序的代码风格