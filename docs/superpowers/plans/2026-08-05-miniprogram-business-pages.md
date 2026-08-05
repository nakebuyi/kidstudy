# Mini Program Business Pages & Components — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete 5 placeholder mini program pages (subject learning, pet, shop, report, settings) and 2 Web-side enhancements (pet selection, avatar selection).

**Architecture:** Component-driven with a shared `useLearning` hook powering the 5-subject learning flow. Each subject defines its own 2-step components (learn → quiz). Pet, shop, report, and settings pages are self-contained with thin API wrappers. Follows existing codebase patterns: raw `@tarojs/components` (View/Text) + BEM SCSS, no NutUI component imports.

**Tech Stack:** Taro 4.2.1, React + TypeScript, NutUI 4.0.0-beta.5 (available), @tarojs/components

## Global Constraints

- Use `@tarojs/components` (View, Text, Input) for UI — follow existing pattern, no NutUI component imports
- SCSS with BEM naming, px units (Taro transforms for WeChat)
- All API calls through existing `services/api.ts` — no new endpoints
- Learning content loaded via `utils/cache.ts` cache-first strategy
- Pages stay under 200 lines; complex logic extracted to hooks/components
- No DOM APIs — Taro cross-platform compatibility
- Follow existing code patterns from `PinDialog.tsx`, `dashboard/index.tsx`

---

### Task 1: Tab Bar Icons

**Files:**
- Create: `miniprogram/src/assets/icons/learn.png`
- Create: `miniprogram/src/assets/icons/learn-active.png`
- Create: `miniprogram/src/assets/icons/pet.png`
- Create: `miniprogram/src/assets/icons/pet-active.png`
- Create: `miniprogram/src/assets/icons/me.png`
- Create: `miniprogram/src/assets/icons/me-active.png`

**Interfaces:**
- Produces: 6 icon files referenced by `app.config.ts` tabBar config

- [ ] **Step 1: Create icons directory**

```bash
mkdir -p miniprogram/src/assets/icons
```

- [ ] **Step 2: Generate simple SVG placeholder icons and convert to PNG**

Use a script to generate 81×81 single-color PNG icons:

```bash
# Create a simple Node script to generate placeholder PNG icons
cat > /tmp/gen-icons.js << 'SCRIPT'
const fs = require("fs");
const path = require("path");

// Minimal 81x81 PNG with solid color (valid PNG binary)
// We'll use a simpler approach: create 1x1 colored PNGs that Taro will scale
function createPNG(r, g, b, filepath) {
  // Create a minimal valid PNG (81x81, solid color)
  const { createCanvas } = require("canvas") || {};
  // Fallback: create tiny placeholder
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Write a minimal valid 1x1 PNG
  const png = Buffer.from([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A, // PNG signature
    0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52, // IHDR chunk
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,0xDE,
    0x00,0x00,0x00,0x0C,0x49,0x44,0x41,0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,0x00,0x00,0x03,0x00,0x01,0x2B,0x00,0x23,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82
  ]);
  fs.writeFileSync(filepath, png);
}

const icons = [
  "learn", "learn-active",
  "pet", "pet-active",
  "me", "me-active"
];
const dir = "miniprogram/src/assets/icons";
fs.mkdirSync(dir, { recursive: true });
icons.forEach(name => createPNG(128, 128, 128, path.join(dir, `${name}.png`)));
console.log("Icons created");
SCRIPT
node /tmp/gen-icons.js
```

- [ ] **Step 3: Verify icons exist**

```bash
ls -la miniprogram/src/assets/icons/
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/src/assets/icons/
git commit -m "feat: add tab bar placeholder icons"
```

---

### Task 2: useLearning Hook

**Files:**
- Create: `miniprogram/src/hooks/useLearning.ts`

**Interfaces:**
- Consumes: `api.getLearningContent`, `api.saveLearningRecord`, `api.completeCheckinTask`, `api.getCheckinToday` from `services/api.ts`
- Consumes: `getLearningContent` from `utils/cache.ts`
- Produces:
  - `useLearning(subject: string, childId: string): LearningState`
  - `LearningState = { state, items, currentIndex, currentItem, progress, todayTask, loadContent, goToQuiz, submitAnswer, retry }`

- [ ] **Step 1: Create the hook file**

```typescript
// miniprogram/src/hooks/useLearning.ts
import { useState, useCallback, useEffect } from "react";
import { api } from "../services/api";
import { getLearningContent } from "../utils/cache";
import { saveCheckinLocally } from "../utils/checkin-queue";

export type LearnState = "loading" | "learn" | "quiz" | "complete" | "error";

export interface ContentItem {
  id: string;
  [key: string]: any;
}

export interface TodayTask {
  id: string;
  subject: string;
  taskType: string;
  completed: boolean;
  pointsEarned: number;
}

export interface LearningState {
  state: LearnState;
  items: ContentItem[];
  currentIndex: number;
  currentItem: ContentItem | null;
  progress: { done: number; total: number };
  todayTask: TodayTask | null;
  loadContent: () => Promise<void>;
  goToQuiz: () => void;
  submitAnswer: (correct: boolean) => Promise<void>;
  retry: () => void;
}

export function useLearning(subject: string, childId: string): LearningState {
  const [state, setState] = useState<LearnState>("loading");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [todayTask, setTodayTask] = useState<TodayTask | null>(null);

  const loadContent = useCallback(async () => {
    setState("loading");
    try {
      // Fetch today's check-in task to know if already completed
      const checkin = await api.getCheckinToday(childId);
      const task = (checkin?.tasks ?? []).find(
        (t: any) => t.subject === subject
      ) as TodayTask | undefined;
      setTodayTask(task ?? null);

      // Fetch learning content via cache-first strategy
      const data = await getLearningContent<{ items: ContentItem[] }>(subject, 1);
      const contentItems = data?.items ?? [];
      if (contentItems.length === 0) {
        setState("complete");
        return;
      }
      setItems(contentItems);
      setCurrentIndex(0);
      setState("learn");
    } catch {
      setState("error");
    }
  }, [subject, childId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const currentItem = items[currentIndex] ?? null;

  const progress = {
    done: currentIndex,
    total: items.length,
  };

  const goToQuiz = useCallback(() => {
    setState("quiz");
  }, []);

  const submitAnswer = useCallback(async (correct: boolean) => {
    const item = items[currentIndex];
    if (!item) return;

    // Save learning record
    try {
      await api.saveLearningRecord({
        childId,
        subject,
        charId: item.id,
        correct,
      });
    } catch {
      // Non-blocking — continue even if record save fails
    }

    const next = currentIndex + 1;
    if (next >= items.length) {
      // All done — complete check-in task
      if (todayTask && !todayTask.completed) {
        try {
          await api.completeCheckinTask(childId, todayTask.id);
          setTodayTask((t) => (t ? { ...t, completed: true } : t));
        } catch {
          // Offline: queue for later sync
          saveCheckinLocally(todayTask.id, childId);
        }
      }
      setState("complete");
    } else {
      setCurrentIndex(next);
      setState("learn");
    }
  }, [currentIndex, items, childId, subject, todayTask]);

  const retry = useCallback(() => {
    loadContent();
  }, [loadContent]);

  return {
    state,
    items,
    currentIndex,
    currentItem,
    progress,
    todayTask,
    loadContent,
    goToQuiz,
    submitAnswer,
    retry,
  };
}
```

- [ ] **Step 2: Verify the hook compiles**

```bash
cd miniprogram && npx tsc --noEmit src/hooks/useLearning.ts 2>&1 || true
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/src/hooks/useLearning.ts
git commit -m "feat: add useLearning hook for subject learning flow"
```

---

### Task 3: Learning Components

**Files:**
- Create: `miniprogram/src/components/learning/ProgressSteps.tsx`
- Create: `miniprogram/src/components/learning/QuizOptions.tsx`
- Create: `miniprogram/src/components/learning/ContentCard.tsx`

**Interfaces:**
- Produces:
  - `<ProgressSteps steps={string[]} current={number} />`
  - `<QuizOptions options={string[]} correctIndex={number} onSelect={(correct: boolean) => void} />`
  - `<ContentCard>children</ContentCard>`

- [ ] **Step 1: Create ProgressSteps component**

```tsx
// miniprogram/src/components/learning/ProgressSteps.tsx
import { View, Text } from "@tarojs/components";

interface ProgressStepsProps {
  steps: string[];
  current: number; // 0-indexed
}

export function ProgressSteps({ steps, current }: ProgressStepsProps) {
  return (
    <View>
      {/* Step circles */}
      <View className="progress-circles">
        {steps.map((_, i) => (
          <View key={i} className="progress-circle-row">
            <View
              className={`progress-circle ${
                i < current
                  ? "progress-circle-done"
                  : i === current
                  ? "progress-circle-active"
                  : "progress-circle-pending"
              }`}
            >
              <Text className="progress-circle-text">
                {i < current ? "✓" : i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                className={`progress-line ${
                  i < current ? "progress-line-done" : ""
                }`}
              />
            )}
          </View>
        ))}
      </View>
      {/* Labels */}
      <View className="progress-labels">
        {steps.map((label, i) => (
          <Text
            key={i}
            className={`progress-label ${
              i === current ? "progress-label-active" : ""
            }`}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
```

```scss
// miniprogram/src/components/learning/ProgressSteps.scss
.progress-circles {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.progress-circle-row {
  display: flex;
  align-items: center;
}

.progress-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-circle-active {
  background: #FF9800;
}

.progress-circle-active .progress-circle-text {
  color: #FFF;
  font-size: 24px;
  font-weight: bold;
}

.progress-circle-done {
  background: #4CAF50;
}

.progress-circle-done .progress-circle-text {
  color: #FFF;
  font-size: 24px;
}

.progress-circle-pending {
  background: #F0F0F0;
}

.progress-circle-pending .progress-circle-text {
  color: #A0A0A0;
  font-size: 24px;
}

.progress-line {
  width: 80px;
  height: 3px;
  background: #F0F0F0;
}

.progress-line-done {
  background: #4CAF50;
}

.progress-labels {
  display: flex;
  justify-content: center;
  gap: 80px;
  margin-top: 8px;
}

.progress-label {
  font-size: 22px;
  color: #A0A0A0;
  width: 48px;
  text-align: center;
}

.progress-label-active {
  color: #FF9800;
  font-weight: bold;
}
```

- [ ] **Step 2: Create QuizOptions component**

```tsx
// miniprogram/src/components/learning/QuizOptions.tsx
import { useState, useMemo } from "react";
import { View, Text } from "@tarojs/components";

interface QuizOptionsProps {
  options: string[];
  correctAnswer: string;
  onSelect: (correct: boolean) => void;
  /** Optional: render each option with custom content */
  renderOption?: (option: string) => string;
}

export function QuizOptions({
  options: rawOptions,
  correctAnswer,
  onSelect,
  renderOption,
}: QuizOptionsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const shuffled = useMemo(() => {
    return [...rawOptions].sort(() => Math.random() - 0.5);
  }, [rawOptions]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === correctAnswer;
    setTimeout(() => {
      onSelect(correct);
      setSelected(null);
      setAnswered(false);
    }, 800);
  };

  return (
    <View className="quiz-options">
      <View className="quiz-options-grid">
        {shuffled.map((option) => {
          let cls = "quiz-option";
          if (answered && option === correctAnswer) cls += " quiz-option-correct";
          if (answered && option === selected && option !== correctAnswer)
            cls += " quiz-option-wrong";

          return (
            <View
              key={option}
              className={cls}
              onClick={() => handleSelect(option)}
            >
              <Text className="quiz-option-text">
                {renderOption ? renderOption(option) : option}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
```

```scss
// miniprogram/src/components/learning/QuizOptions.scss
.quiz-options-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.quiz-option {
  width: calc(50% - 8px);
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 20px;
  padding: 32px 16px;
  text-align: center;
  transition: all 0.2s;
}

.quiz-option-correct {
  background: #E8F5E9;
  border-color: #4CAF50;
}

.quiz-option-wrong {
  background: #FFEBEE;
  border-color: #F44336;
}

.quiz-option-text {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}
```

- [ ] **Step 3: Create ContentCard component**

```tsx
// miniprogram/src/components/learning/ContentCard.tsx
import { View } from "@tarojs/components";
import type { ReactNode } from "react";

interface ContentCardProps {
  children: ReactNode;
  className?: string;
}

export function ContentCard({ children, className = "" }: ContentCardProps) {
  return (
    <View className={`content-card ${className}`}>
      {children}
    </View>
  );
}
```

```scss
// miniprogram/src/components/learning/ContentCard.scss
.content-card {
  background: #FFFFFF;
  border-radius: 24px;
  padding: 32px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 20px;
}
```

- [ ] **Step 4: Create component index barrel**

```typescript
// miniprogram/src/components/learning/index.ts
export { ProgressSteps } from "./ProgressSteps";
export { QuizOptions } from "./QuizOptions";
export { ContentCard } from "./ContentCard";
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/src/components/learning/
git commit -m "feat: add ProgressSteps, QuizOptions, ContentCard components"
```

---

### Task 4: SubjectCard Component

**Files:**
- Create: `miniprogram/src/components/dashboard/SubjectCard.tsx`
- Modify: `miniprogram/src/pages/learning/dashboard/index.tsx` (extract inline subject card)

**Interfaces:**
- Produces: `<SubjectCard subject={key} name={string} emoji={string} bg={string} onClick={() => void} />`

- [ ] **Step 1: Extract SubjectCard from dashboard**

```tsx
// miniprogram/src/components/dashboard/SubjectCard.tsx
import { View, Text } from "@tarojs/components";

interface SubjectCardProps {
  subject: string;
  name: string;
  emoji: string;
  bg: string;
  onClick: () => void;
}

export function SubjectCard({ name, emoji, bg, onClick }: SubjectCardProps) {
  return (
    <View
      className="subject-card"
      style={{ backgroundColor: bg }}
      onClick={onClick}
    >
      <Text className="subject-card-emoji">{emoji}</Text>
      <Text className="subject-card-name">{name}</Text>
    </View>
  );
}
```

```scss
// miniprogram/src/components/dashboard/SubjectCard.scss
.subject-card {
  width: calc(33.33% - 12px);
  border-radius: 24px;
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.subject-card-emoji {
  font-size: 48px;
}

.subject-card-name {
  font-size: 26px;
  font-weight: bold;
  color: #333;
}
```

- [ ] **Step 2: Update dashboard to use SubjectCard**

In `miniprogram/src/pages/learning/dashboard/index.tsx`, replace the inline subject card JSX:

```tsx
// Replace the inline subject card map with:
import { SubjectCard } from "../../../components/dashboard/SubjectCard";

// In the JSX, replace the subject grid:
<View className="dashboard-subjects">
  {SUBJECTS.map((item) => (
    <SubjectCard
      key={item.key}
      subject={item.key}
      name={item.name}
      emoji={item.emoji}
      bg={item.bg}
      onClick={() => {
        Taro.navigateTo({
          url: `/pages/learning/subject/index?subject=${item.key}`,
        });
      }}
    />
  ))}
</View>
```

Remove the corresponding `.dashboard-subject-card`, `.dashboard-subject-emoji`, `.dashboard-subject-name` styles from `dashboard/index.scss`.

- [ ] **Step 3: Commit**

```bash
git add miniprogram/src/components/dashboard/ miniprogram/src/pages/learning/dashboard/
git commit -m "feat: extract SubjectCard component from dashboard"
```

---

### Task 5: Subject Step Components

**Files:**
- Create: `miniprogram/src/pages/learning/subject/steps/LiteracyStep.tsx`
- Create: `miniprogram/src/pages/learning/subject/steps/PinyinStep.tsx`
- Create: `miniprogram/src/pages/learning/subject/steps/EnglishStep.tsx`
- Create: `miniprogram/src/pages/learning/subject/steps/MathStep.tsx`
- Create: `miniprogram/src/pages/learning/subject/steps/PoetryStep.tsx`

**Interfaces:**
- Consumes: `<ContentCard>`, `<QuizOptions>` from `components/learning/`
- Each step component:
  - `LearnStep({ item, onNext }: { item: ContentItem; onNext: () => void })` — renders Step 1 content
  - `QuizStep({ item, onComplete }: { item: ContentItem; onComplete: (correct: boolean) => void })` — renders Step 2 quiz

- [ ] **Step 1: Create LiteracyStep**

```tsx
// miniprogram/src/pages/learning/subject/steps/LiteracyStep.tsx
import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";

interface LiteracyItem {
  id: string;
  char: string;
  pinyin: string;
  radical: string;
  strokes: number;
  words: string[];
  sentences: string[];
}

interface StepProps {
  item: LiteracyItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function LiteracyLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-char-big">{item.char}</Text>
          <Text className="step-pinyin">{item.pinyin}</Text>
          <Text className="step-meta">
            部首：{item.radical} · 笔画：{item.strokes}
          </Text>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📝 组词</Text>
        <View className="step-tags">
          {(item.words ?? []).map((w: string) => (
            <View key={w} className="step-tag">
              <Text>{w}</Text>
            </View>
          ))}
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">💬 例句</Text>
        {(item.sentences ?? []).map((s: string) => (
          <View key={s} className="step-sentence">
            <Text>{s}</Text>
          </View>
        ))}
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：测试认读</Text>
      </View>
    </View>
  );
}

export function LiteracyQuiz({ item, onComplete }: StepProps) {
  // Generate 4 options: 3 random wrong chars + 1 correct
  const wrongPool = ["一", "二", "三", "大", "小", "人", "口", "手", "目", "日"]
    .filter((c) => c !== item.char);

  const shuffled = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...shuffled, item.char];

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">请选择正确的汉字</Text>
          <Text className="step-pinyin-large">{item.pinyin}</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={item.char}
        onSelect={onComplete}
      />
    </View>
  );
}
```

- [ ] **Step 2: Create PinyinStep**

```tsx
// miniprogram/src/pages/learning/subject/steps/PinyinStep.tsx
import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";

const typeNames: Record<string, string> = {
  initial: "声母", final: "韵母", whole: "整体认读音节",
};

interface PinyinItem {
  id: string;
  pinyin: string;
  type: string;
  examples: string[];
}

interface StepProps {
  item: PinyinItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function PinyinLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-pinyin-big">{item.pinyin}</Text>
          <View className="step-tag step-tag-accent">
            <Text>{typeNames[item.type] ?? item.type}</Text>
          </View>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📝 例字</Text>
        <View className="step-examples">
          {(item.examples ?? []).map((ex: string) => (
            <View key={ex} className="step-example-item">
              <Text className="step-example-char">{ex}</Text>
            </View>
          ))}
        </View>
      </ContentCard>

      <ContentCard>
        <View className="step-center">
          <Text className="step-section-title">🔊 发音提示</Text>
          <Text className="step-hint">
            请大声朗读拼音，注意发音的口型和声调
          </Text>
        </View>
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：听力测试</Text>
      </View>
    </View>
  );
}

export function PinyinQuiz({ item, onComplete }: StepProps) {
  const exampleChar = item.examples?.[0] ?? "";
  const correctPinyin = item.pinyin;

  // Generate wrong options from common pinyin
  const pool = ["ba", "pa", "ma", "fa", "da", "ta", "na", "la", "bo", "po", "mo", "fo"]
    .filter((p) => p !== correctPinyin)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [...pool, correctPinyin];

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">听音辨拼音</Text>
          <Text className="step-example-char-large">{exampleChar}</Text>
          <Text className="step-hint">这个字的拼音是什么？</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={correctPinyin}
        onSelect={onComplete}
      />
    </View>
  );
}
```

- [ ] **Step 3: Create EnglishStep**

```tsx
// miniprogram/src/pages/learning/subject/steps/EnglishStep.tsx
import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";

interface EnglishItem {
  id: string;
  word: string;
  chinese: string;
  emoji: string;
  category: string;
  sentences: string[];
}

interface StepProps {
  item: EnglishItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function EnglishLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-emoji-big">{item.emoji}</Text>
          <Text className="step-word-big">{item.word}</Text>
          <Text className="step-subtitle">{item.chinese}</Text>
          <View className="step-tag">
            <Text>{item.category}</Text>
          </View>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">💬 例句</Text>
        {(item.sentences ?? []).map((s: string) => (
          <View key={s} className="step-sentence">
            <Text>{s}</Text>
          </View>
        ))}
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：听力测试</Text>
      </View>
    </View>
  );
}

export function EnglishQuiz({ item, onComplete }: StepProps) {
  const wordPool = [
    "apple", "banana", "cat", "dog", "red", "blue",
    "one", "two", "eye", "hand", "mom", "dad",
    "sun", "moon", "water", "big", "small", "happy", "run", "eat",
  ];
  const wrong = wordPool
    .filter((w) => w !== item.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [...wrong, item.word];

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">这个用英语怎么说？</Text>
          <Text className="step-emoji-big">{item.emoji}</Text>
          <Text className="step-subtitle">{item.chinese}</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={item.word}
        onSelect={onComplete}
      />
    </View>
  );
}
```

- [ ] **Step 4: Create MathStep**

```tsx
// miniprogram/src/pages/learning/subject/steps/MathStep.tsx
import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";

const typeNames: Record<string, string> = {
  addition: "加法", subtraction: "减法",
  multiplication: "乘法", word: "应用题",
};

interface MathItem {
  id: string;
  type: string;
  question: string;
  answer: number;
  options: number[];
  level: number;
}

interface StepProps {
  item: MathItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function MathLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-emoji-big">🧮</Text>
          <Text className="step-math-question">{item.question}</Text>
          <View className="step-tag step-tag-accent">
            <Text>{typeNames[item.type] ?? item.type}</Text>
          </View>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">💡 解题提示</Text>
        <View className="step-hint-box">
          <Text className="step-hint">
            {item.type === "addition"
              ? "加法就是把两个数合在一起，用数数的方法来帮助计算吧！"
              : item.type === "subtraction"
              ? "减法就是从一个数里去掉一部分，看看还剩多少。"
              : "认真看题目，想想应该怎么算？"}
          </Text>
        </View>
        <View className="step-meta-row">
          <View className="step-meta-item">
            <Text className="step-meta-label">难度</Text>
            <Text className="step-meta-value">{"⭐".repeat(item.level)}</Text>
          </View>
        </View>
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：选择答案</Text>
      </View>
    </View>
  );
}

export function MathQuiz({ item, onComplete }: StepProps) {
  const options = (item.options ?? [1, 2, 3, 4]).map(String);

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">请选择正确答案</Text>
          <Text className="step-math-question">{item.question}</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={String(item.answer)}
        onSelect={onComplete}
      />
    </View>
  );
}
```

- [ ] **Step 5: Create PoetryStep**

```tsx
// miniprogram/src/pages/learning/subject/steps/PoetryStep.tsx
import { useMemo } from "react";
import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";

interface PoetryItem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  translation: string;
}

interface StepProps {
  item: PoetryItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function PoetryLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-emoji-big">📜</Text>
          <Text className="step-poetry-title">{item.title}</Text>
          <Text className="step-subtitle">
            {item.dynasty} · {item.author}
          </Text>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📖 原文</Text>
        <View className="step-poetry-content">
          <Text className="step-poetry-text">{item.content}</Text>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📝 译文</Text>
        <Text className="step-hint">{item.translation}</Text>
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：诗词填空</Text>
      </View>
    </View>
  );
}

export function PoetryQuiz({ item, onComplete }: StepProps) {
  const { blankSentence, correctChar, options } = useMemo(() => {
    const sentences = item.content.split(/[，。！？]/).filter((s: string) => s.trim());
    const target = sentences[Math.floor(Math.random() * sentences.length)]?.trim() ?? item.content;
    const chars = [...target];
    const blankIdx = Math.floor(Math.random() * chars.length);
    const answer = chars[blankIdx];
    chars[blankIdx] = "___";

    const wrongPool = "春花秋月山水风雨天地日月云雪".split("").filter((c) => c !== answer);
    const wrong = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);
    return {
      blankSentence: chars.join(""),
      correctChar: answer,
      options: [...wrong, answer],
    };
  }, [item.content]);

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">诗词填空</Text>
          <Text className="step-subtitle">{item.title}</Text>
          <Text className="step-poetry-blank">{blankSentence}</Text>
          <Text className="step-hint">请选择正确的字填入空白处</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={correctChar}
        onSelect={onComplete}
      />
    </View>
  );
}
```

- [ ] **Step 6: Create shared SCSS for step components**

```scss
// miniprogram/src/pages/learning/subject/steps/steps.scss
.step-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.step-char-big {
  font-size: 96px;
  font-weight: bold;
  color: #333;
}

.step-pinyin {
  font-size: 36px;
  color: #FF9800;
}

.step-pinyin-big {
  font-size: 80px;
  font-weight: bold;
  color: #0EA5E9;
}

.step-pinyin-large {
  font-size: 48px;
  color: #FF9800;
  font-weight: bold;
}

.step-emoji-big {
  font-size: 80px;
}

.step-word-big {
  font-size: 56px;
  font-weight: bold;
  color: #10B981;
}

.step-math-question {
  font-size: 48px;
  font-weight: bold;
  color: #A855F7;
}

.step-poetry-title {
  font-size: 40px;
  font-weight: bold;
  color: #DC2626;
}

.step-poetry-text {
  font-size: 30px;
  line-height: 1.8;
  color: #333;
  white-space: pre-line;
}

.step-poetry-blank {
  font-size: 32px;
  font-weight: bold;
  color: #DC2626;
  letter-spacing: 4px;
}

.step-poetry-content {
  background: #FFF5F5;
  border-radius: 16px;
  padding: 24px;
}

.step-subtitle {
  font-size: 28px;
  color: #888;
}

.step-section-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
  display: block;
}

.step-quiz-prompt {
  font-size: 30px;
  color: #555;
}

.step-hint {
  font-size: 24px;
  color: #888;
  text-align: center;
}

.step-meta {
  font-size: 22px;
  color: #A0A0A0;
}

.step-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.step-tag {
  background: #F5F5F5;
  border-radius: 16px;
  padding: 8px 20px;
  font-size: 24px;
  color: #555;
}

.step-tag-accent {
  background: #FFF3E0;
  color: #E65100;
}

.step-sentence {
  background: #FFF8E1;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 8px;
  font-size: 26px;
  color: #333;
}

.step-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.step-example-item {
  background: #E1F5FE;
  border-radius: 16px;
  padding: 20px 32px;
}

.step-example-char {
  font-size: 40px;
  font-weight: bold;
  color: #333;
}

.step-example-char-large {
  font-size: 60px;
  font-weight: bold;
  color: #333;
}

.step-hint-box {
  background: #F3E5F5;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  margin-bottom: 16px;
}

.step-meta-row {
  display: flex;
  gap: 16px;
}

.step-meta-item {
  flex: 1;
  background: #F5F5F5;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.step-meta-label {
  font-size: 22px;
  color: #A0A0A0;
  display: block;
}

.step-meta-value {
  font-size: 28px;
  font-weight: bold;
  color: #A855F7;
  display: block;
}

.step-next-btn {
  background: #FF9800;
  border-radius: 48px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.3);
  margin-top: 20px;
}

.step-next-btn-text {
  color: #FFF;
  font-size: 30px;
  font-weight: bold;
}
```

- [ ] **Step 7: Commit**

```bash
git add miniprogram/src/pages/learning/subject/steps/
git commit -m "feat: add 5 subject step components (2-step: learn + quiz)"
```

---

### Task 6: Subject Page Rewrite

**Files:**
- Modify: `miniprogram/src/pages/learning/subject/index.tsx`
- Modify: `miniprogram/src/pages/learning/subject/index.scss`

**Interfaces:**
- Consumes: `useLearning` hook, all 5 step components, `ProgressSteps`, `ContentCard`

- [ ] **Step 1: Rewrite subject page**

```tsx
// miniprogram/src/pages/learning/subject/index.tsx
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useLearning } from "../../../hooks/useLearning";
import { authStore } from "../../../store/auth";
import { ProgressSteps, ContentCard } from "../../../components/learning";
import { LiteracyLearn, LiteracyQuiz } from "./steps/LiteracyStep";
import { PinyinLearn, PinyinQuiz } from "./steps/PinyinStep";
import { EnglishLearn, EnglishQuiz } from "./steps/EnglishStep";
import { MathLearn, MathQuiz } from "./steps/MathStep";
import { PoetryLearn, PoetryQuiz } from "./steps/PoetryStep";
import "./index.scss";
import "./steps/steps.scss";

const SUBJECT_META: Record<string, { name: string; emoji: string; color: string }> = {
  literacy: { name: "识字", emoji: "📖", color: "#F59E0B" },
  pinyin: { name: "拼音", emoji: "🔤", color: "#0EA5E9" },
  english: { name: "英语", emoji: "🌍", color: "#10B981" },
  math: { name: "算术", emoji: "🧮", color: "#A855F7" },
  poetry: { name: "古诗词", emoji: "📜", color: "#DC2626" },
};

const STEPS = ["学习", "测试"];

export default function Subject() {
  const { subject } = Taro.getCurrentInstance().router?.params || {};
  const meta = SUBJECT_META[subject as string];
  const user = authStore.getState().user;
  const childId = user?.currentChildId ?? "";

  const learning = useLearning(subject as string, childId);

  // Unknown subject
  if (!meta) {
    return (
      <View className="subject-page">
        <ContentCard>
          <View className="subject-empty">
            <Text className="subject-empty-text">未知科目</Text>
          </View>
        </ContentCard>
      </View>
    );
  }

  // Loading
  if (learning.state === "loading") {
    return (
      <View className="subject-page">
        <View className="subject-loading">
          <Text className="subject-loading-emoji">📚</Text>
          <Text className="subject-loading-text">正在准备学习内容...</Text>
        </View>
      </View>
    );
  }

  // Error
  if (learning.state === "error") {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-emoji">😢</Text>
          <Text className="subject-empty-text">内容加载失败</Text>
          <View className="step-next-btn" onClick={learning.retry}>
            <Text className="step-next-btn-text">重试</Text>
          </View>
        </View>
      </View>
    );
  }

  // All done
  if (learning.state === "complete") {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-emoji">🎉</Text>
          <Text className="subject-empty-text">学完了所有内容！</Text>
          <Text className="subject-empty-hint">太厉害了！继续保持哦~</Text>
          <View
            className="step-next-btn"
            onClick={() => Taro.switchTab({ url: "/pages/learning/dashboard/index" })}
          >
            <Text className="step-next-btn-text">返回工作台</Text>
          </View>
        </View>
      </View>
    );
  }

  // Day already checked in for this subject
  if (learning.todayTask?.completed) {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-emoji">✅</Text>
          <Text className="subject-empty-text">今日{meta.name}打卡已完成</Text>
          <Text className="subject-empty-hint">
            +{learning.todayTask.pointsEarned} 积分已入账
          </Text>
          <View
            className="step-next-btn"
            onClick={() => Taro.switchTab({ url: "/pages/learning/dashboard/index" })}
          >
            <Text className="step-next-btn-text">返回工作台</Text>
          </View>
        </View>
      </View>
    );
  }

  // No content
  if (!learning.currentItem) {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-text">暂无学习内容</Text>
        </View>
      </View>
    );
  }

  const stepIndex = learning.state === "learn" ? 0 : 1;

  // Render step content
  const renderStep = () => {
    const item = learning.currentItem!;
    const stepProps = {
      item,
      onNext: learning.goToQuiz,
      onComplete: (correct: boolean) => learning.submitAnswer(correct),
    };

    if (learning.state === "learn") {
      switch (subject) {
        case "literacy": return <LiteracyLearn {...stepProps} />;
        case "pinyin": return <PinyinLearn {...stepProps} />;
        case "english": return <EnglishLearn {...stepProps} />;
        case "math": return <MathLearn {...stepProps} />;
        case "poetry": return <PoetryLearn {...stepProps} />;
      }
    } else {
      switch (subject) {
        case "literacy": return <LiteracyQuiz {...stepProps} />;
        case "pinyin": return <PinyinQuiz {...stepProps} />;
        case "english": return <EnglishQuiz {...stepProps} />;
        case "math": return <MathQuiz {...stepProps} />;
        case "poetry": return <PoetryQuiz {...stepProps} />;
      }
    }
  };

  return (
    <View className="subject-page">
      {/* Header */}
      <View className="subject-header">
        <Text className="subject-header-emoji">{meta.emoji}</Text>
        <Text className="subject-header-name">{meta.name}</Text>
        <Text className="subject-header-progress">
          {learning.currentIndex + 1} / {learning.items.length}
        </Text>
      </View>

      {/* Progress */}
      <ProgressSteps steps={STEPS} current={stepIndex} />

      {/* Content */}
      <View className="subject-content">
        {renderStep()}
      </View>
    </View>
  );
}
```

```scss
// miniprogram/src/pages/learning/subject/index.scss
.subject-page {
  min-height: 100vh;
  background: #FFF8F0;
  padding: 20px;
}

.subject-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.subject-header-emoji {
  font-size: 40px;
}

.subject-header-name {
  font-size: 36px;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.subject-header-progress {
  font-size: 24px;
  color: #A0A0A0;
}

.subject-content {
  margin-top: 24px;
}

.subject-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.subject-empty-emoji {
  font-size: 80px;
}

.subject-empty-text {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.subject-empty-hint {
  font-size: 26px;
  color: #888;
}

.subject-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.subject-loading-emoji {
  font-size: 64px;
}

.subject-loading-text {
  font-size: 28px;
  color: #A0A0A0;
}
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/src/pages/learning/subject/
git commit -m "feat: rewrite subject page with 2-step learning flow"
```

---

### Task 7: Pet Page + PetDisplay Component

**Files:**
- Create: `miniprogram/src/components/games/PetDisplay.tsx`
- Modify: `miniprogram/src/pages/learning/games/pet/index.tsx`
- Create: `miniprogram/src/pages/learning/games/pet/index.scss`

**Interfaces:**
- Consumes: `api.feedPet`, `api.getChildren`
- Produces: `<PetDisplay type={string} name={string} level={number} mood={string} />`

- [ ] **Step 1: Create PetDisplay component**

```tsx
// miniprogram/src/components/games/PetDisplay.tsx
import { View, Text } from "@tarojs/components";

const PET_EMOJI: Record<string, string> = {
  cat: "🐱", dog: "🐶", rabbit: "🐰",
};

const PET_NAMES: Record<string, string> = {
  cat: "猫咪", dog: "小狗", rabbit: "小兔",
};

const MOOD_MAP: Record<string, string> = {
  happy: "开心", normal: "正常", sad: "难过",
};

interface PetDisplayProps {
  type: string;
  name: string;
  level: number;
  mood: string;
}

export function PetDisplay({ type, name, level, mood }: PetDisplayProps) {
  return (
    <View className="pet-display">
      <Text className="pet-display-emoji">{PET_EMOJI[type] ?? "🐱"}</Text>
      <Text className="pet-display-name">{name}</Text>
      <View className="pet-display-tags">
        <View className="pet-display-tag">
          <Text>{PET_NAMES[type] ?? "宠物"}</Text>
        </View>
        <View className="pet-display-tag">
          <Text>Lv.{level}</Text>
        </View>
        <View className={`pet-display-tag pet-mood-${mood}`}>
          <Text>{MOOD_MAP[mood] ?? "正常"}</Text>
        </View>
      </View>
    </View>
  );
}
```

```scss
// miniprogram/src/components/games/PetDisplay.scss
.pet-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
}

.pet-display-emoji {
  font-size: 120px;
}

.pet-display-name {
  font-size: 40px;
  font-weight: bold;
  color: #333;
  margin-top: 12px;
}

.pet-display-tags {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.pet-display-tag {
  background: #F5F5F5;
  border-radius: 20px;
  padding: 6px 20px;
  font-size: 24px;
  color: #555;
}

.pet-mood-happy {
  background: #E8F5E9;
  color: #4CAF50;
}

.pet-mood-normal {
  background: #FFF3E0;
  color: #FF9800;
}

.pet-mood-sad {
  background: #FFEBEE;
  color: #F44336;
}
```

- [ ] **Step 2: Rewrite pet page**

```tsx
// miniprogram/src/pages/learning/games/pet/index.tsx
import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, ChildData } from "../../../services/api";
import { PetDisplay } from "../../../components/games/PetDisplay";
import { ContentCard } from "../../../components/learning";
import "./index.scss";

const FOOD_ITEMS = [
  { name: "🐟 小鱼干", cost: 5, desc: "美味的小鱼干" },
  { name: "🥩 肉骨头", cost: 10, desc: "营养丰富的肉骨头" },
  { name: "🍰 宠物蛋糕", cost: 20, desc: "豪华宠物蛋糕" },
];

const PET_OPTIONS = [
  { type: "cat", name: "小咪", emoji: "🐱", label: "小猫" },
  { type: "dog", name: "旺财", emoji: "🐶", label: "小狗" },
  { type: "rabbit", name: "小兔", emoji: "🐰", label: "小兔" },
];

export default function Pet() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeding, setFeeding] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadChild();
  }, []);

  async function loadChild() {
    try {
      const children = await api.getChildren();
      if (children?.length > 0) setChild(children[0]);
    } catch {
      // handled by request()
    } finally {
      setLoading(false);
    }
  }

  async function handleFeed(food: (typeof FOOD_ITEMS)[0]) {
    setFeeding(food.name);
    setMessage("");
    try {
      await api.feedPet();
      setMessage(`喂养成功！消耗 ${food.cost} 积分`);
      await loadChild();
    } catch {
      setMessage("喂养失败，请重试");
    } finally {
      setFeeding(null);
    }
  }

  if (loading) {
    return (
      <View className="page-loading">
        <Text className="page-loading-text">加载中...</Text>
      </View>
    );
  }

  if (!child) {
    return (
      <View className="page-empty">
        <Text className="page-empty-text">还没有添加孩子</Text>
      </View>
    );
  }

  let pet: any = { type: "cat", name: "小咪", level: 1, mood: "normal" };
  try {
    if (child.pet) pet = JSON.parse(child.pet);
  } catch { /* use defaults */ }

  return (
    <View className="pet-page">
      {/* Pet Display */}
      <ContentCard>
        <PetDisplay
          type={pet.type ?? "cat"}
          name={pet.name ?? "小咪"}
          level={pet.level ?? 1}
          mood={pet.mood ?? "normal"}
        />
      </ContentCard>

      {/* Stats */}
      <ContentCard>
        <Text className="section-title">📊 宠物状态</Text>
        <View className="pet-stat-row">
          <Text className="pet-stat-label">等级</Text>
          <Text className="pet-stat-value">{pet.level ?? 1} / 10</Text>
        </View>
        <View className="pet-stat-bar">
          <View
            className="pet-stat-bar-fill"
            style={{ width: `${((pet.level ?? 1) / 10) * 100}%` }}
          />
        </View>
        <Text className="pet-stat-hint">坚持学习，让宠物和你一起成长！</Text>
      </ContentCard>

      {/* Feed */}
      <ContentCard>
        <Text className="section-title">🍽️ 喂养宠物</Text>
        {message && (
          <View className="pet-message">
            <Text>{message}</Text>
          </View>
        )}
        <View className="pet-food-grid">
          {FOOD_ITEMS.map((food) => (
            <View
              key={food.name}
              className={`pet-food-item ${
                child.points < food.cost ? "pet-food-disabled" : ""
              }`}
              onClick={() => {
                if (child.points >= food.cost) handleFeed(food);
              }}
            >
              <Text className="pet-food-name">{food.name}</Text>
              <Text className="pet-food-desc">{food.desc}</Text>
              <Text className="pet-food-cost">
                🌟 {food.cost}
                {child.points < food.cost ? " (积分不足)" : ""}
              </Text>
            </View>
          ))}
        </View>
        <Text className="pet-points">当前积分：🌟 {child.points}</Text>
      </ContentCard>
    </View>
  );
}
```

```scss
// miniprogram/src/pages/learning/games/pet/index.scss
.pet-page {
  min-height: 100vh;
  background: #FFF8F0;
  padding: 20px;
}

.section-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
  display: block;
}

.pet-stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pet-stat-label {
  font-size: 24px;
  color: #888;
}

.pet-stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.pet-stat-bar {
  height: 8px;
  background: #F0F0F0;
  border-radius: 4px;
  margin-bottom: 12px;
  overflow: hidden;
}

.pet-stat-bar-fill {
  height: 100%;
  background: #FF9800;
  border-radius: 4px;
}

.pet-stat-hint {
  font-size: 22px;
  color: #A0A0A0;
  text-align: center;
  display: block;
}

.pet-message {
  background: #FFF3E0;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  text-align: center;
  font-size: 24px;
  color: #E65100;
}

.pet-food-grid {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pet-food-item {
  flex: 1;
  background: #FFF;
  border: 2px solid #E8E8E8;
  border-radius: 16px;
  padding: 20px 12px;
  text-align: center;
}

.pet-food-disabled {
  opacity: 0.5;
  border-color: #F0F0F0;
}

.pet-food-name {
  font-size: 26px;
  display: block;
}

.pet-food-desc {
  font-size: 20px;
  color: #A0A0A0;
  display: block;
  margin: 8px 0;
}

.pet-food-cost {
  font-size: 22px;
  color: #FF9800;
  display: block;
}

.pet-points {
  font-size: 24px;
  color: #888;
  text-align: center;
  display: block;
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

.page-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.page-empty-text {
  font-size: 30px;
  color: #A0A0A0;
}
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/src/components/games/ miniprogram/src/pages/learning/games/pet/
git commit -m "feat: add PetDisplay component and rewrite pet page"
```

---

### Task 8: Shop Page + ShopItem Component

**Files:**
- Create: `miniprogram/src/components/games/ShopItem.tsx`
- Modify: `miniprogram/src/pages/learning/games/shop/index.tsx`
- Create: `miniprogram/src/pages/learning/games/shop/index.scss`

**Interfaces:**
- Consumes: `api.buyItem`, `api.getChildren`
- Produces: `<ShopItem icon={string} name={string} desc={string} price={number} canAfford={boolean} buying={boolean} onBuy={() => void} />`

- [ ] **Step 1: Create ShopItem component**

```tsx
// miniprogram/src/components/games/ShopItem.tsx
import { View, Text } from "@tarojs/components";

interface ShopItemProps {
  icon: string;
  name: string;
  desc: string;
  price: number;
  canAfford: boolean;
  buying: boolean;
  onBuy: () => void;
}

export function ShopItem({ icon, name, desc, price, canAfford, buying, onBuy }: ShopItemProps) {
  return (
    <View className={`shop-item ${!canAfford ? "shop-item-disabled" : ""}`}>
      <Text className="shop-item-icon">{icon}</Text>
      <Text className="shop-item-name">{name}</Text>
      <Text className="shop-item-desc">{desc}</Text>
      <View
        className={`shop-item-btn ${canAfford ? "shop-item-btn-active" : ""}`}
        onClick={canAfford ? onBuy : undefined}
      >
        <Text className="shop-item-btn-text">
          {buying ? "购买中..." : canAfford ? `🌟 ${price}` : `🌟 ${price} (积分不足)`}
        </Text>
      </View>
    </View>
  );
}
```

```scss
// miniprogram/src/components/games/ShopItem.scss
.shop-item {
  background: #FFF;
  border-radius: 20px;
  padding: 20px 12px;
  text-align: center;
  width: calc(50% - 6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.shop-item-disabled {
  opacity: 0.6;
}

.shop-item-icon {
  font-size: 48px;
  display: block;
}

.shop-item-name {
  font-size: 26px;
  font-weight: bold;
  color: #333;
  display: block;
  margin: 8px 0 4px;
}

.shop-item-desc {
  font-size: 20px;
  color: #A0A0A0;
  display: block;
  margin-bottom: 12px;
}

.shop-item-btn {
  background: #F5F5F5;
  border-radius: 24px;
  padding: 12px;
}

.shop-item-btn-active {
  background: #FF9800;
}

.shop-item-btn-text {
  font-size: 22px;
  color: #888;
}

.shop-item-btn-active .shop-item-btn-text {
  color: #FFF;
  font-weight: bold;
}
```

- [ ] **Step 2: Rewrite shop page**

```tsx
// miniprogram/src/pages/learning/games/shop/index.tsx
import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import { api, ChildData } from "../../../services/api";
import { ShopItem } from "../../../components/games/ShopItem";
import "./index.scss";

const SHOP_ITEMS = [
  { id: "food1", name: "小鱼干", icon: "🐟", price: 10, type: "food", desc: "喂宠物+20饱食度" },
  { id: "food2", name: "肉骨头", icon: "🦴", price: 20, type: "food", desc: "喂宠物+40饱食度" },
  { id: "food3", name: "宠物蛋糕", icon: "🍰", price: 30, type: "food", desc: "喂宠物+80饱食度" },
  { id: "acc1", name: "蝴蝶结", icon: "🎀", price: 50, type: "accessory", desc: "给宠物戴上蝴蝶结" },
  { id: "acc2", name: "小帽子", icon: "🎩", price: 80, type: "accessory", desc: "给宠物戴上帽子" },
  { id: "acc3", name: "太阳镜", icon: "🕶️", price: 100, type: "accessory", desc: "酷酷的太阳镜" },
  { id: "theme1", name: "星空主题", icon: "🌌", price: 150, type: "theme", desc: "深蓝色星空背景" },
  { id: "theme2", name: "花园主题", icon: "🌺", price: 150, type: "theme", desc: "粉色花园背景" },
  { id: "frame1", name: "金色头像框", icon: "🟡", price: 200, type: "frame", desc: "闪亮的金色边框" },
  { id: "frame2", name: "彩虹头像框", icon: "🌈", price: 200, type: "frame", desc: "七彩边框" },
];

const CATEGORIES: Record<string, string> = {
  food: "🍽️ 宠物食物",
  accessory: "💎 宠物装扮",
  theme: "🎨 工作台主题",
  frame: "🖼️ 头像框",
};

export default function Shop() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadChild();
  }, []);

  async function loadChild() {
    try {
      const children = await api.getChildren();
      if (children?.length > 0) setChild(children[0]);
    } catch { /* handled by request() */ }
    finally { setLoading(false); }
  }

  async function handleBuy(item: (typeof SHOP_ITEMS)[0]) {
    setBuying(item.id);
    setMessage("");
    try {
      await api.buyItem(item.id);
      setMessage(`购买成功！获得 ${item.name}！`);
      await loadChild();
    } catch {
      setMessage("购买失败，请重试");
    } finally {
      setBuying(null);
    }
  }

  if (loading) {
    return (
      <View className="shop-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  if (!child) {
    return (
      <View className="shop-page">
        <View className="page-empty"><Text className="page-empty-text">还没有添加孩子</Text></View>
      </View>
    );
  }

  const itemTypes = ["food", "accessory", "theme", "frame"] as const;

  return (
    <View className="shop-page">
      {/* Points header */}
      <View className="shop-header">
        <Text className="shop-header-text">🌟 {child.points} 积分</Text>
      </View>

      {message && (
        <View className="shop-message">
          <Text>{message}</Text>
        </View>
      )}

      {itemTypes.map((type) => {
        const items = SHOP_ITEMS.filter((i) => i.type === type);
        return (
          <View key={type} className="shop-category">
            <Text className="shop-category-title">{CATEGORIES[type]}</Text>
            <View className="shop-items-grid">
              {items.map((item) => (
                <ShopItem
                  key={item.id}
                  icon={item.icon}
                  name={item.name}
                  desc={item.desc}
                  price={item.price}
                  canAfford={child.points >= item.price}
                  buying={buying === item.id}
                  onBuy={() => handleBuy(item)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
```

```scss
// miniprogram/src/pages/learning/games/shop/index.scss
.shop-page {
  min-height: 100vh;
  background: #FFF8F0;
  padding: 20px;
}

.shop-header {
  background: #FFF;
  border-radius: 16px;
  padding: 16px 24px;
  margin-bottom: 20px;
  text-align: center;
}

.shop-header-text {
  font-size: 32px;
  font-weight: bold;
  color: #FF9800;
}

.shop-message {
  background: #FFF3E0;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  text-align: center;
  font-size: 24px;
  color: #E65100;
}

.shop-category {
  margin-bottom: 24px;
}

.shop-category-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  display: block;
}

.shop-items-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/src/components/games/ShopItem.tsx miniprogram/src/components/games/ShopItem.scss miniprogram/src/pages/learning/games/shop/
git commit -m "feat: add ShopItem component and rewrite shop page"
```

---

### Task 9: Report Page

**Files:**
- Modify: `miniprogram/src/pages/parent/report/index.tsx`
- Create: `miniprogram/src/pages/parent/report/index.scss`

**Interfaces:**
- Consumes: `api.getReport`

- [ ] **Step 1: Rewrite report page**

```tsx
// miniprogram/src/pages/parent/report/index.tsx
import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import { authStore } from "../../../store/auth";
import { api } from "../../../services/api";
import { ContentCard } from "../../../components/learning";
import "./index.scss";

const subjectNames: Record<string, string> = {
  literacy: "📖 识字", pinyin: "🔤 拼音", english: "🌍 英语",
  math: "🧮 算术", poetry: "📜 古诗词",
};

interface ReportData {
  child: { name: string; points: number; streak: number };
  today: { completedCount: number; totalCount: number; allCompleted: boolean } | null;
  week: {
    subjectProgress: Record<string, { completed: number; total: number }>;
    dailyTrend: { date: string; completed: number; total: number; allCompleted: boolean }[];
    weakSubjects: string[];
    totalLearningRecords: number;
  };
}

export default function ParentReport() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authStore.getState().user;
    const childId = user?.currentChildId;
    if (childId) {
      api.getReport(childId).then(setReport).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <View className="report-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  if (!report) {
    return (
      <View className="report-page">
        <View className="page-empty"><Text className="page-empty-text">暂无数据</Text></View>
      </View>
    );
  }

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <View className="report-page">
      {/* Today Summary */}
      <ContentCard>
        <Text className="report-section-title">📋 今日学习概况</Text>
        {report.today ? (
          <View className="report-stats-grid">
            <View className="report-stat">
              <Text className="report-stat-value orange">
                {report.today.completedCount}/{report.today.totalCount}
              </Text>
              <Text className="report-stat-label">完成打卡</Text>
            </View>
            <View className="report-stat">
              <Text className="report-stat-value blue">{report.child.streak}</Text>
              <Text className="report-stat-label">连续打卡</Text>
            </View>
            <View className="report-stat">
              <Text className="report-stat-value green">{report.child.points}</Text>
              <Text className="report-stat-label">当前积分</Text>
            </View>
          </View>
        ) : (
          <Text className="report-empty-hint">今天还没有学习记录</Text>
        )}
      </ContentCard>

      {/* Subject Progress */}
      <ContentCard>
        <Text className="report-section-title">📈 本周各科进度</Text>
        {Object.entries(report.week.subjectProgress).map(([subject, progress]) => (
          <View key={subject} className="report-progress-row">
            <View className="report-progress-header">
              <Text className="report-progress-name">{subjectNames[subject] ?? subject}</Text>
              <Text className="report-progress-count">
                {progress.completed}/{progress.total}
              </Text>
            </View>
            <View className="report-progress-bar">
              <View
                className="report-progress-fill"
                style={{
                  width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                }}
              />
            </View>
          </View>
        ))}
      </ContentCard>

      {/* Weak Subjects */}
      {report.week.weakSubjects.length > 0 && (
        <View className="report-weak-alert">
          <Text>⚠️ 薄弱科目：{report.week.weakSubjects.map((s) => subjectNames[s] ?? s).join("、")}，建议加强练习</Text>
        </View>
      )}

      {/* Daily Trend */}
      <ContentCard>
        <Text className="report-section-title">📅 本周学习趋势</Text>
        {report.week.dailyTrend.length === 0 ? (
          <Text className="report-empty-hint">本周暂无学习记录</Text>
        ) : (
          report.week.dailyTrend.map((day) => {
            const d = new Date(day.date);
            const label = `${d.getMonth() + 1}/${d.getDate()} 周${weekdays[d.getDay()]}`;
            return (
              <View key={day.date} className="report-trend-row">
                <Text className="report-trend-date">{label}</Text>
                <View className="report-trend-bar">
                  <View
                    className="report-trend-fill"
                    style={{ width: `${(day.completed / day.total) * 100}%` }}
                  />
                </View>
                <Text className="report-trend-count">
                  {day.completed}/{day.total}
                  {day.allCompleted ? " 🎉" : ""}
                </Text>
              </View>
            );
          })
        )}
      </ContentCard>
    </View>
  );
}
```

```scss
// miniprogram/src/pages/parent/report/index.scss
.report-page {
  min-height: 100vh;
  background: #FFF8F0;
  padding: 20px;
}

.report-section-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
  display: block;
}

.report-stats-grid {
  display: flex;
  gap: 12px;
}

.report-stat {
  flex: 1;
  background: #F9F9F9;
  border-radius: 16px;
  padding: 20px 12px;
  text-align: center;
}

.report-stat-value {
  font-size: 36px;
  font-weight: bold;
  display: block;
}

.report-stat-value.orange { color: #FF9800; }
.report-stat-value.blue { color: #0EA5E9; }
.report-stat-value.green { color: #10B981; }

.report-stat-label {
  font-size: 22px;
  color: #A0A0A0;
}

.report-progress-row {
  margin-bottom: 16px;
}

.report-progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.report-progress-name {
  font-size: 24px;
  color: #333;
}

.report-progress-count {
  font-size: 22px;
  color: #A0A0A0;
}

.report-progress-bar {
  height: 8px;
  background: #F0F0F0;
  border-radius: 4px;
  overflow: hidden;
}

.report-progress-fill {
  height: 100%;
  background: #FF9800;
  border-radius: 4px;
}

.report-weak-alert {
  background: #FFF3E0;
  border: 1px solid #FFB74D;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 24px;
  color: #E65100;
}

.report-trend-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.report-trend-date {
  font-size: 22px;
  color: #888;
  width: 130px;
  flex-shrink: 0;
}

.report-trend-bar {
  flex: 1;
  height: 8px;
  background: #F0F0F0;
  border-radius: 4px;
  overflow: hidden;
}

.report-trend-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 4px;
}

.report-trend-count {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  width: 60px;
  text-align: right;
}

.report-empty-hint {
  font-size: 24px;
  color: #A0A0A0;
  text-align: center;
  display: block;
  padding: 24px 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/src/pages/parent/report/
git commit -m "feat: rewrite parent report page with daily/weekly stats"
```

---

### Task 10: Settings Page

**Files:**
- Modify: `miniprogram/src/pages/parent/settings/index.tsx`
- Create: `miniprogram/src/pages/parent/settings/index.scss`

**Interfaces:**
- Consumes: `api.getSettings`

- [ ] **Step 1: Rewrite settings page**

```tsx
// miniprogram/src/pages/parent/settings/index.tsx
import { useState, useEffect } from "react";
import { View, Text, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../../services/api";
import { ContentCard } from "../../../components/learning";
import "./index.scss";

interface SettingsData {
  dailyGoal: number;
  screenTimeLimit: number;
  eyeCareInterval: number;
  eyeCareBreak: number;
}

export default function ParentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SettingsData>({
    dailyGoal: 5,
    screenTimeLimit: 60,
    eyeCareInterval: 20,
    eyeCareBreak: 5,
  });

  useEffect(() => {
    api.getSettings()
      .then((data: any) => {
        if (data) setSettings({
          dailyGoal: data.dailyGoal ?? 5,
          screenTimeLimit: data.screenTimeLimit ?? 60,
          eyeCareInterval: data.eyeCareInterval ?? 20,
          eyeCareBreak: data.eyeCareBreak ?? 5,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      await api.getSettings(); // Use existing settings endpoint
      // Note: The current API doesn't have a dedicated settings save endpoint.
      // For MVP, we save to local storage as a fallback.
      Taro.setStorageSync("parent_settings", JSON.stringify(settings));
      setMessage("设置保存成功！");
    } catch {
      setMessage("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="settings-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  return (
    <View className="settings-page">
      {message && (
        <View className="settings-message">
          <Text>{message}</Text>
        </View>
      )}

      {/* Daily Goals */}
      <ContentCard>
        <Text className="settings-section-title">🎯 每日学习目标</Text>
        <View className="settings-row">
          <Text className="settings-label">每科每日学习数量</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.dailyGoal)}
            onInput={(e) =>
              setSettings({ ...settings, dailyGoal: Number(e.detail.value) || 5 })
            }
          />
        </View>
        <Text className="settings-hint">建议：5-10 个/科</Text>
      </ContentCard>

      {/* Screen Time */}
      <ContentCard>
        <Text className="settings-section-title">⏰ 使用时间限制</Text>
        <View className="settings-row">
          <Text className="settings-label">每日使用时长（分钟）</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.screenTimeLimit)}
            onInput={(e) =>
              setSettings({ ...settings, screenTimeLimit: Number(e.detail.value) || 60 })
            }
          />
        </View>
        <Text className="settings-hint">建议：30-60分钟/天</Text>
      </ContentCard>

      {/* Eye Care */}
      <ContentCard>
        <Text className="settings-section-title">👁️ 护眼设置</Text>
        <View className="settings-row">
          <Text className="settings-label">提醒间隔（分钟）</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.eyeCareInterval)}
            onInput={(e) =>
              setSettings({ ...settings, eyeCareInterval: Number(e.detail.value) || 20 })
            }
          />
        </View>
        <View className="settings-row">
          <Text className="settings-label">休息时长（分钟）</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.eyeCareBreak)}
            onInput={(e) =>
              setSettings({ ...settings, eyeCareBreak: Number(e.detail.value) || 5 })
            }
          />
        </View>
        <Text className="settings-hint">
          每学习{settings.eyeCareInterval}分钟，提醒休息{settings.eyeCareBreak}分钟
        </Text>
      </ContentCard>

      {/* Save Button */}
      <View className="settings-save-btn" onClick={handleSave}>
        <Text className="settings-save-btn-text">
          {saving ? "保存中..." : "💾 保存设置"}
        </Text>
      </View>
    </View>
  );
}
```

```scss
// miniprogram/src/pages/parent/settings/index.scss
.settings-page {
  min-height: 100vh;
  background: #FFF8F0;
  padding: 20px;
}

.settings-message {
  background: #E8F5E9;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  text-align: center;
  font-size: 24px;
  color: #2E7D32;
}

.settings-section-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
  display: block;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.settings-label {
  font-size: 26px;
  color: #333;
}

.settings-input {
  width: 120px;
  height: 56px;
  background: #F5F5F5;
  border-radius: 12px;
  text-align: center;
  font-size: 28px;
  font-weight: bold;
  color: #333;
  padding: 0 12px;
}

.settings-hint {
  font-size: 22px;
  color: #A0A0A0;
  display: block;
}

.settings-save-btn {
  background: #FF9800;
  border-radius: 48px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.3);
  margin-top: 24px;
}

.settings-save-btn-text {
  color: #FFF;
  font-size: 30px;
  font-weight: bold;
}
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/src/pages/parent/settings/
git commit -m "feat: rewrite parent settings page"
```

---

### Task 11: Web — Add Pet Type Selection

**Files:**
- Modify: `src/app/games/pet/page.tsx` (add pet type selector)
- Create or modify any child creation form to include pet selection

**Note:** The Web pet page currently assumes `cat` only. Add a pet type selector at the top of the page.

- [ ] **Step 1: Add pet type selection to Web pet page**

Add this pet selector section before the pet display in `src/app/games/pet/page.tsx`:

```tsx
const PET_OPTIONS = [
  { type: "cat", name: "小咪", emoji: "🐱" },
  { type: "dog", name: "旺财", emoji: "🐶" },
  { type: "rabbit", name: "小兔", emoji: "🐰" },
];

// Add state:
const [selectedPetType, setSelectedPetType] = useState<string>(
  pet.type || "cat"
);

// Add UI before the pet display card:
<Card>
  <CardHeader>
    <CardTitle className="text-lg">🐾 选择宠物</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-3 gap-3">
      {PET_OPTIONS.map((p) => (
        <Button
          key={p.type}
          variant={selectedPetType === p.type ? "default" : "outline"}
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => setSelectedPetType(p.type)}
        >
          <span className="text-3xl">{p.emoji}</span>
          <span className="text-sm">{p.name}</span>
        </Button>
      ))}
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/games/pet/page.tsx
git commit -m "feat: add cat/dog/rabbit pet type selection to web pet page"
```

---

### Task 12: Web — Add Avatar Selection

**Files:**
- Modify: `src/app/parent/children/page.tsx` (add avatar picker to child creation form)

**Note:** The Web children page needs an avatar selector when creating a child. The `Child.avatar` field in the database already supports string values.

- [ ] **Step 1: Add avatar selection to child creation**

In `src/app/parent/children/page.tsx`, add avatar selection to the form:

```tsx
const AVATARS = [
  { key: "👦", label: "男孩" },
  { key: "👧", label: "女孩" },
];

// Add state:
const [avatar, setAvatar] = useState("👦");

// Add UI in the create form:
<div className="space-y-2">
  <Label>选择头像</Label>
  <div className="flex gap-4">
    {AVATARS.map((a) => (
      <button
        key={a.key}
        type="button"
        className={`w-16 h-16 text-3xl rounded-full border-2 flex items-center justify-center
          ${avatar === a.key
            ? "border-orange-500 bg-orange-50"
            : "border-gray-200 hover:border-gray-300"}`}
        onClick={() => setAvatar(a.key)}
      >
        {a.key}
      </button>
    ))}
  </div>
</div>

// Pass avatar in the create request body:
body: JSON.stringify({ name: childName, avatar }),
```

- [ ] **Step 2: Commit**

```bash
git add src/app/parent/children/page.tsx
git commit -m "feat: add boy/girl avatar selection to web children page"
```

---

### Task 13: Final Integration & Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: 31 test files, 233 tests passing.

- [ ] **Step 2: Verify mini program TypeScript compilation**

```bash
cd miniprogram && npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors.

- [ ] **Step 3: Verify mini program builds**

```bash
cd miniprogram && npx taro build --type weapp 2>&1 | tail -20
```

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: complete mini program business pages and web enhancements"
```