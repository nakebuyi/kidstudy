# 小程序语音朗读、成就徽章、打卡日历 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小程序添加 3 个功能：语音朗读（播放远程 MP3）、成就徽章（前端计算）、打卡日历（月份网格）

**Architecture:** 三个功能相互独立，可并行执行。语音朗读复用 Web 端已生成的 MP3 音频文件和映射 JSON；成就徽章与 Web 端逻辑一致，纯前端计算；打卡日历调用已有 API。遵循现有小程序代码模式：BEM SCSS + px + `@tarojs/components`。

**Tech Stack:** Taro 4.2.1, React + TypeScript, InnerAudioContext

## Global Constraints

- 使用 `@tarojs/components`（View/Text），不引入 NutUI 组件
- SCSS 使用 BEM 命名，px 单位（Taro 自动转换）
- 音频播放使用 `Taro.createInnerAudioContext()`，不依赖 Web Audio API
- 页面文件保持在 200 行以内
- 遵循现有代码风格（从 `PinDialog.tsx`、`dashboard/index.tsx` 等参考）

---

### Task 1: 复制音频映射 + 创建 SpeakAudio 组件

**Files:**
- Create: `miniprogram/src/data/english-audio-map.json`（从 `src/lib/data/english-audio-map.json` 复制）
- Create: `miniprogram/src/data/pinyin-audio-map.json`（从 `src/lib/data/pinyin-audio-map.json` 复制）
- Create: `miniprogram/src/data/poetry-audio-map.json`（从 `src/lib/data/poetry-audio-map.json` 复制）
- Create: `miniprogram/src/components/learning/SpeakAudio.tsx`
- Create: `miniprogram/src/components/learning/SpeakAudio.scss`

**Interfaces:**
- Produces: `SpeakAudio({ text, kind, dir?, map? })` — 朗读按钮组件
- Produces: `AudioMap = Record<string, Record<string, string>>` — 音频映射类型
- Consumes: 3 个 JSON 音频映射文件

- [ ] **Step 1: 复制音频映射 JSON 文件**

```bash
cp src/lib/data/english-audio-map.json miniprogram/src/data/english-audio-map.json
cp src/lib/data/pinyin-audio-map.json miniprogram/src/data/pinyin-audio-map.json
cp src/lib/data/poetry-audio-map.json miniprogram/src/data/poetry-audio-map.json
```

- [ ] **Step 2: 创建 SpeakAudio 组件**

```tsx
// miniprogram/src/components/learning/SpeakAudio.tsx
import { useRef, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./SpeakAudio.scss";

export type AudioMap = Record<string, Record<string, string>>;

function resolveSlug(map: AudioMap, kind: string, text: string): string | undefined {
  return (map[kind] ?? map[kind + "s"])?.[text];
}

interface SpeakAudioProps {
  text: string;
  kind: "word" | "sentence" | "pinyin" | "char" | "poetry";
  dir?: string;
  map?: AudioMap;
}

export function SpeakAudio({
  text,
  kind,
  dir = "en",
  map,
}: SpeakAudioProps) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<Taro.InnerAudioContext | null>(null);

  if (!map) return null;
  const slug = resolveSlug(map, kind, text);
  if (!slug) return null;

  const src = `https://kidstudy.zhangwenguang.com/audio/${dir}/${kind}/${slug}.mp3`;

  const handlePlay = () => {
    if (speaking) return;
    try {
      if (!audioRef.current) {
        audioRef.current = Taro.createInnerAudioContext();
        audioRef.current.onEnded(() => setSpeaking(false));
        audioRef.current.onError(() => setSpeaking(false));
      }
      audioRef.current.src = src;
      audioRef.current.play();
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <View className="speak-audio" onClick={handlePlay}>
      <Text className="speak-audio-icon">{speaking ? "🔊" : "🔈"}</Text>
      <Text className="speak-audio-text">{speaking ? "播放中..." : "朗读"}</Text>
    </View>
  );
}
```

```scss
// miniprogram/src/components/learning/SpeakAudio.scss
.speak-audio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #FFF3E0;
  border-radius: 20px;
  padding: 8px 16px;
  margin-top: 8px;
}

.speak-audio-icon {
  font-size: 28px;
}

.speak-audio-text {
  font-size: 24px;
  color: #E65100;
}
```

- [ ] **Step 3: 更新学习组件 index barrel**

```typescript
// miniprogram/src/components/learning/index.ts
export { ProgressSteps } from "./ProgressSteps";
export { QuizOptions } from "./QuizOptions";
export { ContentCard } from "./ContentCard";
export { SpeakAudio } from "./SpeakAudio";
```

- [ ] **Step 4: 验证 TS 编译**

```bash
cd miniprogram && npx tsc --noEmit 2>&1 | grep -E "^src/|^config/" | head -10
```
Expected: 无项目级错误

- [ ] **Step 5: 提交**

```bash
git add miniprogram/src/data/ miniprogram/src/components/learning/SpeakAudio.tsx miniprogram/src/components/learning/SpeakAudio.scss miniprogram/src/components/learning/index.ts
git commit -m "feat: add SpeakAudio component and audio maps to mini-program"
```

---

### Task 2: 集成 SpeakAudio 到各科学习步骤

**Files:**
- Modify: `miniprogram/src/pages/learning/subject/steps/LiteracyStep.tsx`
- Modify: `miniprogram/src/pages/learning/subject/steps/PinyinStep.tsx`
- Modify: `miniprogram/src/pages/learning/subject/steps/EnglishStep.tsx`
- Modify: `miniprogram/src/pages/learning/subject/steps/PoetryStep.tsx`

**Interfaces:**
- Consumes: `SpeakAudio` from `components/learning`, 3 audio maps from `data/`

- [ ] **Step 1: 英语步骤 — 添加单词朗读 + 例句朗读**

```tsx
// 在 EnglishLearn 的 import 中增加:
import { ContentCard, QuizOptions, SpeakAudio } from "../../../../components/learning";
import englishAudioMap from "../../../../data/english-audio-map.json";

// 在单词展示区域后添加:
<View className="step-center">
  <SpeakAudio text={item.word} kind="word" map={englishAudioMap} />
</View>

// 在每条例句后添加朗读按钮:
<View key={s} className="step-sentence">
  <Text>{s}</Text>
  <SpeakAudio text={s} kind="sentence" map={englishAudioMap} />
</View>
```

- [ ] **Step 2: 拼音步骤 — 添加拼音朗读 + 例字朗读**

```tsx
// 在 PinyinLearn 的 import 中增加:
import { ContentCard, QuizOptions, SpeakAudio } from "../../../../components/learning";
import pinyinAudioMap from "../../../../data/pinyin-audio-map.json";

// 在拼音展示旁添加:
<SpeakAudio text={item.pinyin} kind="pinyin" dir="zh" map={pinyinAudioMap} />

// 在每个例字后添加:
<View key={ex} className="step-example-item">
  <Text className="step-example-char">{ex}</Text>
  <SpeakAudio text={ex} kind="char" dir="zh" map={pinyinAudioMap} />
</View>
```

- [ ] **Step 3: 古诗步骤 — 添加全文朗读**

```tsx
// 在 PoetryLearn 的 import 中增加:
import { ContentCard, QuizOptions, SpeakAudio } from "../../../../components/learning";
import poetryAudioMap from "../../../../data/poetry-audio-map.json";

// 原文卡片后添加:
<SpeakAudio text={item.content} kind="poetry" dir="zh" map={poetryAudioMap} />
```

- [ ] **Step 4: 识字步骤 — 添加拼音朗读**

```tsx
// 在 LiteracyLearn 的 import 中增加:
import { ContentCard, QuizOptions, SpeakAudio } from "../../../../components/learning";
import pinyinAudioMap from "../../../../data/pinyin-audio-map.json";

// 在大字展示区域添加:
<SpeakAudio text={item.pinyin} kind="pinyin" dir="zh" map={pinyinAudioMap} />
```

- [ ] **Step 5: 验证 TS 编译**

```bash
cd miniprogram && npx tsc --noEmit 2>&1 | grep -E "^src/|^config/" | head -10
```
Expected: 无项目级错误

- [ ] **Step 6: 提交**

```bash
git add miniprogram/src/pages/learning/subject/steps/
git commit -m "feat: add SpeakAudio to literacy, pinyin, english, poetry steps"
```

---

### Task 3: 创建 BadgesDisplay 组件 + 集成到仪表盘

**Files:**
- Create: `miniprogram/src/components/dashboard/BadgesDisplay.tsx`
- Create: `miniprogram/src/components/dashboard/BadgesDisplay.scss`
- Modify: `miniprogram/src/pages/learning/dashboard/index.tsx`

**Interfaces:**
- Produces: `BadgesDisplay({ points, streak, maxStreak, totalCheckIns })` — 徽章展示组件
- Consumes: `ChildData.points`, `ChildData.streak`, `ChildData.maxStreak`, `ChildData.totalCheckIns`

- [ ] **Step 1: 创建 BadgesDisplay 组件**

```tsx
// miniprogram/src/components/dashboard/BadgesDisplay.tsx
import { View, Text } from "@tarojs/components";
import "./BadgesDisplay.scss";

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (stats: Stats) => boolean;
}

interface Stats {
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
}

const BADGES: BadgeDef[] = [
  { id: "first_checkin", name: "初次打卡", icon: "🌟", description: "完成第一次打卡", check: (s) => s.totalCheckIns >= 1 },
  { id: "streak_3", name: "连续3天", icon: "🔥", description: "连续打卡3天", check: (s) => s.streak >= 3 },
  { id: "streak_7", name: "周冠军", icon: "👑", description: "连续打卡7天", check: (s) => s.streak >= 7 },
  { id: "streak_30", name: "月度之星", icon: "🏆", description: "连续打卡30天", check: (s) => s.maxStreak >= 30 },
  { id: "points_100", name: "积分达人", icon: "💰", description: "累计获得100积分", check: (s) => s.points >= 100 },
  { id: "points_500", name: "积分富豪", icon: "💎", description: "累计获得500积分", check: (s) => s.points >= 500 },
  { id: "checkin_10", name: "坚持10天", icon: "📅", description: "累计打卡10天", check: (s) => s.totalCheckIns >= 10 },
  { id: "checkin_50", name: "坚持50天", icon: "🎖️", description: "累计打卡50天", check: (s) => s.totalCheckIns >= 50 },
];

interface BadgesDisplayProps {
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
}

export function BadgesDisplay({ points, streak, maxStreak, totalCheckIns }: BadgesDisplayProps) {
  const stats: Stats = { points, streak, maxStreak, totalCheckIns };
  const earned = BADGES.filter((b) => b.check(stats));
  const locked = BADGES.filter((b) => !b.check(stats));

  return (
    <View className="badges-display">
      <Text className="badges-display-title">🏅 成就徽章</Text>

      {earned.length > 0 && (
        <View className="badges-display-list">
          {earned.map((b) => (
            <View key={b.id} className="badges-display-item">
              <Text className="badges-display-icon">{b.icon}</Text>
              <Text className="badges-display-name">{b.name}</Text>
            </View>
          ))}
        </View>
      )}

      {locked.length > 0 && (
        <View className="badges-display-list">
          {locked.slice(0, 6).map((b) => (
            <View key={b.id} className="badges-display-item badges-display-item-locked">
              <Text className="badges-display-icon badges-display-icon-locked">{b.icon}</Text>
              <Text className="badges-display-name badges-display-name-locked">{b.name}</Text>
            </View>
          ))}
        </View>
      )}

      {earned.length === 0 && locked.length === 0 && (
        <Text className="badges-display-empty">开始学习，解锁徽章！</Text>
      )}
    </View>
  );
}
```

```scss
// miniprogram/src/components/dashboard/BadgesDisplay.scss
.badges-display {
  background: #FFFFFF;
  border-radius: 24px;
  padding: 24px;
  margin-top: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.badges-display-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
  display: block;
}

.badges-display-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.badges-display-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 72px;
}

.badges-display-item-locked {
  opacity: 0.4;
}

.badges-display-icon {
  font-size: 36px;
}

.badges-display-icon-locked {
  filter: grayscale(1);
}

.badges-display-name {
  font-size: 20px;
  color: #555;
  text-align: center;
}

.badges-display-name-locked {
  color: #CCC;
}

.badges-display-empty {
  font-size: 24px;
  color: #A0A0A0;
  text-align: center;
  display: block;
  padding: 16px 0;
}
```

- [ ] **Step 2: 集成到仪表盘**

在 `miniprogram/src/pages/learning/dashboard/index.tsx` 中：

```tsx
// 在 import 中增加:
import { BadgesDisplay } from "../../../components/dashboard/BadgesDisplay";

// 在 subject 区域后添加（</View> 闭合 5 科网格之后）:
<BadgesDisplay
  points={child.points}
  streak={child.streak}
  maxStreak={child.maxStreak}
  totalCheckIns={child.totalCheckIns}
/>
```

- [ ] **Step 3: 验证 TS 编译**

```bash
cd miniprogram && npx tsc --noEmit 2>&1 | grep -E "^src/|^config/" | head -10
```
Expected: 无项目级错误

- [ ] **Step 4: 提交**

```bash
git add miniprogram/src/components/dashboard/BadgesDisplay.tsx miniprogram/src/components/dashboard/BadgesDisplay.scss miniprogram/src/pages/learning/dashboard/index.tsx
git commit -m "feat: add BadgesDisplay component to mini-program dashboard"
```

---

### Task 4: 创建打卡日历页面

**Files:**
- Create: `miniprogram/src/pages/learning/calendar/index.tsx`
- Create: `miniprogram/src/pages/learning/calendar/index.scss`
- Modify: `miniprogram/src/app.config.ts`（注册日历页）
- Modify: `miniprogram/src/pages/learning/dashboard/index.tsx`（添加入口）

**Interfaces:**
- Consumes: `api.getCalendar(childId, month)` from `services/api.ts`
- Consumes: `ChildData.streak`, `ChildData.maxStreak`

- [ ] **Step 1: 注册日历页面**

在 `miniprogram/src/app.config.ts` 的 `learning` 分包 pages 中增加：

```typescript
pages: [
  "dashboard/index",
  "calendar/index",  // ← 新增
  "subject/index",
  "games/pet/index",
  "games/shop/index",
  "settings/index",
],
```

- [ ] **Step 2: 创建日历页面**

```tsx
// miniprogram/src/pages/learning/calendar/index.tsx
import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, ChildData } from "../../../services/api";
import "./index.scss";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function Calendar() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const children = await api.getChildren();
      if (children && children.length > 0) {
        setChild(children[0]);
        const data = await api.getCalendar(children[0].id, "");
        // API returns { dates: string[] } — all completed check-in dates
        const dates = Array.isArray(data) ? data.map((d: any) => d.date ?? d) : (data?.dates ?? []);
        setAllDates(dates);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Filter dates for current month (client-side, no re-fetch needed)
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const checkinDates = allDates.filter((d) => d.startsWith(monthStr));

  if (loading) {
    return (
      <View className="calendar-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  return (
    <View className="calendar-page">
      {/* Back */}
      <View className="calendar-back" onClick={() => Taro.switchTab({ url: "/pages/learning/dashboard/index" })}>
        <Text className="calendar-back-text">‹ 返回工作台</Text>
      </View>

      {/* Month header */}
      <View className="calendar-header">
        <View className="calendar-nav" onClick={prevMonth}>
          <Text className="calendar-nav-arrow">‹</Text>
        </View>
        <Text className="calendar-nav-title">{year}年{month + 1}月</Text>
        <View className="calendar-nav" onClick={nextMonth}>
          <Text className="calendar-nav-arrow">›</Text>
        </View>
      </View>

      {/* Weekday labels */}
      <View className="calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <Text key={w} className="calendar-weekday">{w}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View className="calendar-grid">
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`empty-${i}`} className="calendar-day calendar-day-empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isCheckedIn = checkinDates.includes(dateStr);
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          let cls = "calendar-day";
          if (isCheckedIn) cls += " calendar-day-checked";
          if (isToday) cls += " calendar-day-today";
          if (isFuture) cls += " calendar-day-future";

          return (
            <View key={day} className={cls}>
              <Text className="calendar-day-text">
                {isCheckedIn ? "✅" : day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Stats */}
      <View className="calendar-stats">
        <View className="calendar-stat">
          <Text className="calendar-stat-value orange">{child?.streak ?? 0}</Text>
          <Text className="calendar-stat-label">连续打卡</Text>
        </View>
        <View className="calendar-stat">
          <Text className="calendar-stat-value blue">{child?.maxStreak ?? 0}</Text>
          <Text className="calendar-stat-label">最高纪录</Text>
        </View>
        <View className="calendar-stat">
          <Text className="calendar-stat-value green">{checkinDates.length}</Text>
          <Text className="calendar-stat-label">本月打卡</Text>
        </View>
      </View>
    </View>
  );
}
```

```scss
// miniprogram/src/pages/learning/calendar/index.scss
.calendar-page {
  min-height: 100vh;
  background: #FFF8F0;
  padding: 24px 20px;
}

.calendar-back {
  margin-bottom: 20px;
}

.calendar-back-text {
  font-size: 30px;
  color: #FF9800;
  font-weight: bold;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
}

.calendar-nav {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #FFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.calendar-nav-arrow {
  font-size: 36px;
  color: #FF9800;
  font-weight: bold;
}

.calendar-nav-title {
  font-size: 34px;
  font-weight: bold;
  color: #333;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.calendar-weekday {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #888;
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  background: #FFF;
  border-radius: 24px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.calendar-day-empty {
  background: transparent;
}

.calendar-day-text {
  font-size: 28px;
  color: #333;
  font-weight: bold;
}

.calendar-day-checked {
  background: #E8F5E9;
}

.calendar-day-checked .calendar-day-text {
  font-size: 22px;
  color: #4CAF50;
}

.calendar-day-today {
  background: #FFF3E0;
  border: 2px solid #FF9800;
}

.calendar-day-today .calendar-day-text {
  color: #E65100;
}

.calendar-day-future .calendar-day-text {
  color: #DDD;
}

.calendar-stats {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.calendar-stat {
  flex: 1;
  background: #FFF;
  border-radius: 16px;
  padding: 20px 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.calendar-stat-value {
  font-size: 36px;
  font-weight: bold;
  display: block;
}

.calendar-stat-value.orange { color: #FF9800; }
.calendar-stat-value.blue { color: #0EA5E9; }
.calendar-stat-value.green { color: #10B981; }

.calendar-stat-label {
  font-size: 22px;
  color: #A0A0A0;
  display: block;
  margin-top: 4px;
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.page-loading-text {
  font-size: 28px;
  color: #A0A0A0;
}
```

- [ ] **Step 3: 在仪表盘添加日历入口**

在 `miniprogram/src/pages/learning/dashboard/index.tsx` 中，在宠物卡片和科目网格之间添加：

```tsx
{/* Calendar entry */}
<View
  className="dashboard-calendar-entry"
  onClick={() => Taro.navigateTo({ url: "/pages/learning/calendar/index" })}
>
  <Text className="dashboard-calendar-entry-text">📅 打卡日历 ›</Text>
</View>
```

在仪表盘 SCSS 中增加样式：

```scss
// 在 dashboard/index.scss 末尾增加
.dashboard-calendar-entry {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 20px;
  margin-top: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.dashboard-calendar-entry-text {
  font-size: 28px;
  color: #FF9800;
  font-weight: bold;
  display: block;
  text-align: center;
}
```

- [ ] **Step 4: 验证 TS 编译**

```bash
cd miniprogram && npx tsc --noEmit 2>&1 | grep -E "^src/|^config/" | head -10
```
Expected: 无项目级错误

- [ ] **Step 5: 提交**

```bash
git add miniprogram/src/pages/learning/calendar/ miniprogram/src/app.config.ts miniprogram/src/pages/learning/dashboard/
git commit -m "feat: add calendar page to mini-program"
```

---

### Task 5: 最终集成验证

- [ ] **Step 1: 运行 Web 测试**

```bash
cd /data/claude/kidstudy && npx vitest run 2>&1 | tail -10
```
Expected: 31 test files, 233 tests passing

- [ ] **Step 2: 验证小程序 TS 编译**

```bash
cd miniprogram && npx tsc --noEmit 2>&1 | grep -E "^src/|^config/" | head -10
```
Expected: 无项目级错误

- [ ] **Step 3: 构建小程序**

```bash
cd miniprogram && npx taro build --type weapp 2>&1 | tail -10
```
Expected: 构建成功（CSS 警告可忽略）

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: complete mini-program audio, badges, and calendar features"
```

- [ ] **Step 5: 推送**

```bash
git push
```