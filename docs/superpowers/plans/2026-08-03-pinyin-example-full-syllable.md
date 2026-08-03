# 拼音例字完整拼音（带声调）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 拼音学习三步骤（识记/练习拼读/听力测试）显示例字的完整拼音（带声调，如 家→jiā），朗读与显示一致，步骤3 按完整拼音作答。

**Architecture:** 新增 `src/lib/char-pinyin.ts`（151 个例字 → 带声调完整拼音的字典）。先把 `content/pinyin.json` 中 4 处多音字例字替换为无歧义例字并重生成音频映射，再建字典 + 测试，然后改页面三步骤（`getCharPinyin(ex)` 显示、步骤3 用完整拼音作答），最后 `db:seed` 同步内容 + 重建重启生产服务器。

**Tech Stack:** TypeScript / Vitest / Next.js（生产 `next start`）/ Python3 音频脚本 / Prisma seed。

## Global Constraints

- 例字显示完整拼音且**带声调**（家→jiā）；朗读即该字完整拼音音（播放例字音频）。
- `content/pinyin.json` 替换 4 处例字：`l` 项 `了→拉`、`zh` 项 `只→猪`、`yue` 项 `乐→悦`、`zhi` 项 `只→直`。
- 步骤1、步骤2、步骤3 都改。
- `CHAR_PINYIN` 覆盖全部 151 个唯一例字，且**不多不少**（测试断言）。
- 声母类（`type==="initial"`）项的每个例字拼音必须以该声母开头（测试断言，防错读）。
- 内容改动后必须重跑 `python3 scripts/gen-pinyin-audio.py` 并 `npm run db:seed`（页面经 `/api/learning/pinyin` 从数据库读取）。
- 生产服务器最后 `npm run build` + `npm run start` 重启（nginx 443/80 已反代 127.0.0.1:3000）。
- 已知保留项：`热` 在 `ri` 整体认读项（rè≠ri）为既存内容小瑕疵，不在本计划范围；`发→fā`、`谁→shuí` 采用标准读音。

---

### Task 1: 替换例字 + 重生成音频映射

**Files:**
- Modify: `content/pinyin.json`（4 处 examples 数组）
- Generate: `public/audio/zh/char/{slug}.mp3`（+4 新例字 悦/拉/猪/直）
- Generate: `src/lib/data/pinyin-audio-map.json`（char 区更新）
- Test（验证护栏）: `src/lib/pinyin-audio-map.test.ts`

**Interfaces:**
- Consumes: `scripts/gen-pinyin-audio.py`（已存在，读 content/pinyin.json）
- Produces: 更新后的 `content/pinyin.json`（examples 含 悦/拉/猪/直，不含 乐/了/只）；映射 char 区与之一致

**注意：** 需联网（Google TTS），脚本对已存在 >500B 文件自动跳过。

- [ ] **Step 1: 修改 content/pinyin.json 的 4 处例字**

在 `content/pinyin.json` 中找到并替换以下 4 个 item 的 `examples` 数组（按 item 的 `pinyin` 字段定位）：

| item pinyin | 原 examples | 新 examples |
|-------------|------------|------------|
| `l` | `["了", "来", "六"]` | `["拉", "来", "六"]` |
| `zh` | `["这", "中", "只"]` | `["这", "中", "猪"]` |
| `yue` | `["月", "越", "乐"]` | `["月", "越", "悦"]` |
| `zhi` | `["知", "只", "纸"]` | `["知", "直", "纸"]` |

- [ ] **Step 2: 运行映射测试确认失败**

Run: `npx vitest run src/lib/pinyin-audio-map.test.ts`
Expected: FAIL —— 映射 char 区缺少 `悦/拉/猪/直`、多出 `乐/了/只`，长度 150 ≠ 151（内容已改、映射未同步）。

- [ ] **Step 3: 重生成音频与映射**

Run: `python3 scripts/gen-pinyin-audio.py`
Expected: 打印 `拼音 63/63，例字 151`，无失败列表；为 悦/拉/猪/直 下载新 MP3，map 的 char 区更新为当前 151 例字（旧 乐/了/只 的 mp3 留在磁盘但移出映射，无害）。

验证：
```bash
node -e "const m=require('./src/lib/data/pinyin-audio-map.json'); console.log('char keys:', Object.keys(m.char).length)"  # 151
ls public/audio/zh/char | wc -l  # ≥151（可能有历史遗留文件）
```

- [ ] **Step 4: 重跑映射测试确认通过**

Run: `npx vitest run src/lib/pinyin-audio-map.test.ts`
Expected: PASS（map.char 覆盖全部 151 例字且长度一致）。

- [ ] **Step 5: 全量测试**

Run: `npx vitest run`
Expected: 25 个文件全部通过（音频完整性测试也验证 213 个映射键的文件存在）。

- [ ] **Step 6: 提交**

```bash
git add content/pinyin.json public/audio/zh/char src/lib/data/pinyin-audio-map.json
git commit -m "feat: replace ambiguous pinyin example chars and regen audio"
```

---

### Task 2: 例字拼音字典（TDD）

**Files:**
- Create: `src/lib/char-pinyin.ts`
- Test: `src/lib/char-pinyin.test.ts`

**Interfaces:**
- Consumes: `content/pinyin.json`（Task 1 已替换后的例字集合）
- Produces:
  - `export const CHAR_PINYIN: Record<string, string>` —— 151 个例字 → 带声调完整拼音
  - `export function getCharPinyin(char: string): string` —— 查不到回退返回 `char` 本身
- 后续 Task 3 使用：`CHAR_PINYIN`（步骤3 选项池）、`getCharPinyin`（三步骤显示/作答）。

- [ ] **Step 1: 写失败测试**

创建 `src/lib/char-pinyin.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { CHAR_PINYIN, getCharPinyin } from "./char-pinyin";
import pinyinData from "@/../content/pinyin.json";

const items = pinyinData as Array<{
  pinyin: string;
  type: string;
  examples: string[];
}>;

describe("char-pinyin", () => {
  it("covers every example character, no more no less", () => {
    const chars = [...new Set(items.flatMap((i) => i.examples))];
    for (const c of chars) {
      expect(CHAR_PINYIN[c], `缺少拼音: ${c}`).toBeTruthy();
    }
    expect(Object.keys(CHAR_PINYIN).length).toBe(chars.length);
  });

  it("every initial example pinyin starts with the initial", () => {
    for (const item of items) {
      if (item.type !== "initial") continue;
      for (const ex of item.examples) {
        expect(
          CHAR_PINYIN[ex].startsWith(item.pinyin),
          `${ex}=${CHAR_PINYIN[ex]} 应以 ${item.pinyin} 开头`
        ).toBe(true);
      }
    }
  });

  it("getCharPinyin falls back to the char itself", () => {
    expect(getCharPinyin("甲")).toBe("甲");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/char-pinyin.test.ts`
Expected: FAIL，报错 `Cannot find module './char-pinyin'`（模块尚不存在）。

- [ ] **Step 3: 创建字典**

创建 `src/lib/char-pinyin.ts`：

```ts
/**
 * 例字 → 完整拼音（带声调）映射。
 *
 * 覆盖 content/pinyin.json 的全部唯一例字（151 个）。用于拼音学习
 * 三步骤显示例字的完整拼音（如 家 → jiā），朗读即该字读音。
 * 数据来源：content/literacy.json（94 字）+ 手动核准（其余，含 4 个
 * 替换后的无歧义例字 悦/拉/猪/直）。
 */
export const CHAR_PINYIN: Record<string, string> = {
  一: "yī",
  七: "qī",
  三: "sān",
  上: "shàng",
  下: "xià",
  不: "bù",
  东: "dōng",
  丝: "sī",
  中: "zhōng",
  乌: "wū",
  也: "yě",
  二: "èr",
  云: "yún",
  五: "wǔ",
  人: "rén",
  今: "jīn",
  从: "cóng",
  他: "tā",
  你: "nǐ",
  儿: "ér",
  元: "yuán",
  六: "liù",
  军: "jūn",
  冷: "lěng",
  几: "jǐ",
  出: "chū",
  前: "qián",
  包: "bāo",
  十: "shí",
  去: "qù",
  发: "fā",
  口: "kǒu",
  叶: "yè",
  吃: "chī",
  名: "míng",
  听: "tīng",
  和: "hé",
  哥: "gē",
  哦: "ó",
  喔: "ō",
  四: "sì",
  因: "yīn",
  圆: "yuán",
  在: "zài",
  地: "dì",
  夜: "yè",
  大: "dà",
  天: "tiān",
  头: "tóu",
  女: "nǚ",
  好: "hǎo",
  妈: "mā",
  姐: "jiě",
  子: "zǐ",
  字: "zì",
  学: "xué",
  安: "ān",
  家: "jiā",
  对: "duì",
  小: "xiǎo",
  尺: "chǐ",
  屋: "wū",
  山: "shān",
  干: "gān",
  应: "yīng",
  开: "kāi",
  影: "yǐng",
  很: "hěn",
  心: "xīn",
  怕: "pà",
  思: "sī",
  悦: "yuè",
  意: "yì",
  我: "wǒ",
  手: "shǒu",
  拉: "lā",
  文: "wén",
  新: "xīn",
  日: "rì",
  早: "zǎo",
  星: "xīng",
  春: "chūn",
  是: "shì",
  晕: "yūn",
  月: "yuè",
  有: "yǒu",
  来: "lái",
  杯: "bēi",
  次: "cì",
  歌: "gē",
  此: "cǐ",
  水: "shuǐ",
  池: "chí",
  灯: "dēng",
  热: "rè",
  爱: "ài",
  爸: "bà",
  牛: "niú",
  物: "wù",
  猪: "zhū",
  猫: "māo",
  玉: "yù",
  玩: "wán",
  白: "bái",
  皮: "pí",
  直: "zhí",
  看: "kàn",
  知: "zhī",
  石: "shí",
  秋: "qiū",
  窝: "wō",
  米: "mǐ",
  红: "hóng",
  纸: "zhǐ",
  给: "gěi",
  羊: "yáng",
  耳: "ěr",
  自: "zì",
  花: "huā",
  英: "yīng",
  草: "cǎo",
  菜: "cài",
  衣: "yī",
  裙: "qún",
  要: "yào",
  词: "cí",
  说: "shuō",
  谁: "shuí",
  走: "zǒu",
  越: "yuè",
  跑: "pǎo",
  车: "chē",
  运: "yùn",
  这: "zhè",
  远: "yuǎn",
  金: "jīn",
  长: "cháng",
  门: "mén",
  问: "wèn",
  阴: "yīn",
  雨: "yǔ",
  雪: "xuě",
  鞋: "xié",
  音: "yīn",
  风: "fēng",
  飞: "fēi",
  饿: "è",
  高: "gāo",
  鱼: "yú",
  鸟: "niǎo",
  鹅: "é",
};

/** 返回例字的完整拼音；未收录则原样返回该字本身。 */
export function getCharPinyin(char: string): string {
  return CHAR_PINYIN[char] ?? char;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/char-pinyin.test.ts`
Expected: PASS（3 个用例全绿）。

- [ ] **Step 5: 全量测试 + 提交**

Run: `npx vitest run`
Expected: 全部通过。

```bash
git add src/lib/char-pinyin.ts src/lib/char-pinyin.test.ts
git commit -m "feat: add char pinyin dictionary with tests"
```

---

### Task 3: 拼音页三步骤改造 + 数据同步

**Files:**
- Modify: `src/app/learning/[subject]/page.tsx`
- DB: `npm run db:seed`（把更新后的 content/pinyin.json 同步进 Prisma）

**Interfaces:**
- Consumes: `getCharPinyin`、`CHAR_PINYIN`（Task 2）；`SpeakAudio`/`pinyinAudioMap`（已存在）
- Produces: 拼音三步骤显示完整拼音、步骤3 按完整拼音作答

- [ ] **Step 1: 改导入**

在 `src/app/learning/[subject]/page.tsx` 的 import 区新增：

```ts
import { CHAR_PINYIN, getCharPinyin } from "@/lib/char-pinyin";
```

（`SpeakAudio`、`pinyinAudioMap` 已导入，保留。）

- [ ] **Step 2: 改 PinyinStep1 例字拼音**

`PinyinStep1` 例字卡片中，把每个例字下方的

```tsx
<div className="text-sm text-sky-500 mt-1">{item.pinyin}</div>
```

改为：

```tsx
<div className="text-sm text-sky-500 mt-1">{getCharPinyin(ex)}</div>
```

- [ ] **Step 3: 改 PinyinStep2 拼读行 + 提示语**

`PinyinStep2` 练习拼读行中，把中间文本

```tsx
{item.pinyin} → {ex}
```

改为：

```tsx
{getCharPinyin(ex)} → {ex}
```

并把底部提示语：

```tsx
请大声拼读每个例字：先读拼音 <strong>{item.pinyin}</strong>，再读汉字
```

改为：

```tsx
请跟着拼音大声拼读每个例字，先读完整拼音（如 jiā），再读汉字
```

- [ ] **Step 4: 改 PinyinStep3 为完整拼音作答**

把 `PinyinStep3` 整体替换为：

```tsx
function PinyinStep3({ item, onComplete }: { item: any; onComplete: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const exampleChar = item.examples[0];
  const answer = getCharPinyin(exampleChar);

  const options = useMemo(() => {
    const pool = [...new Set(Object.values(CHAR_PINYIN))].filter((p) => p !== answer);
    const wrong = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...wrong, answer].sort(() => Math.random() - 0.5);
  }, [answer]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === answer;
    setTimeout(() => onComplete(correct), 800);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-medium text-center text-gray-800 mb-2">
            听音辨拼音
          </h3>
          <div className="text-5xl text-center font-bold text-gray-800 mb-2">
            {exampleChar}
          </div>
          <div className="flex justify-center mb-6">
            <SpeakAudio text={exampleChar} kind="char" dir="zh" map={pinyinAudioMap} />
          </div>
          <p className="text-center text-gray-500 mb-6">这个字的拼音是什么？</p>
          <div className="grid grid-cols-2 gap-4">
            {options.map((option) => {
              let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
              if (answered && option === answer) variant = "default";
              if (answered && option === selected && option !== answer) variant = "destructive";

              return (
                <Button
                  key={option}
                  variant={variant}
                  size="lg"
                  className="h-20 text-2xl"
                  onClick={() => handleSelect(option)}
                  disabled={answered}
                >
                  {option}
                  {answered && option === answer && <Check className="w-5 h-5 ml-2" />}
                  {answered && option === selected && option !== answer && <X className="w-5 h-5 ml-2" />}
                </Button>
              );
            })}
          </div>
          {answered && (
            <div className={`text-center mt-4 text-lg font-medium ${selected === answer ? "text-green-500" : "text-red-500"}`}>
              {selected === answer ? "🎉 太棒了！回答正确！" : `😊 没关系，正确答案是 "${answer}"`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

注意：`useMemo`、`Check`、`X`、`Button`、`Card`、`CardContent`、`SpeakAudio` 均已在文件中可用，无需新增导入。

- [ ] **Step 5: 校验**

Run:
```bash
npx tsc --noEmit
npx vitest run
grep -rn "getCharPinyin\|CHAR_PINYIN" src/app/learning --include="*.tsx"
```
Expected: tsc 无错误；vitest 全部通过；grep 显示 4 处使用（步骤1/2/3 的 `getCharPinyin` 与步骤3 的 `CHAR_PINYIN`）。

- [ ] **Step 6: 同步数据库**

Run: `npm run db:seed`
Expected: 打印各科目 seeded 数量，pinyin 63 项；`LearningContent` 中 pinyin 项的 examples 含 悦/拉/猪/直。

- [ ] **Step 7: 提交**

```bash
git add src/app/learning/[subject]/page.tsx
git commit -m "feat: show full example pinyin in pinyin learning steps"
```

---

### Task 4: 生产重建 + 冒烟验证

**Files:** 无（仅构建/部署）

- [ ] **Step 1: 重建生产包**

Run: `npm run build`
Expected: 构建成功，全部路由 + 中间件编译通过。

- [ ] **Step 2: 重启生产服务器**

先停掉现有 `next start`（若在跑），再启动：

```bash
pkill -f "next-server"; pkill -f "next start"; sleep 2
nohup npm run start > server.log 2>&1 &
```

- [ ] **Step 3: 冒烟验证**

Run:
```bash
for i in $(seq 1 20); do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login); [ "$code" = "200" ] && break; sleep 1; done
curl -s -o /dev/null -w "login: %{http_code}\n" http://localhost:3000/login
curl -s -o /dev/null -w "dashboard(未登录): %{http_code}\n" http://localhost:3000/dashboard
node -e "const m=require('./src/lib/data/pinyin-audio-map.json'); const s=m.char['悦']; console.log('悦 slug:', s)"
curl -s -o /dev/null -w "悦 audio: %{http_code}\n" "http://localhost:3000/audio/zh/char/$(node -e "process.stdout.write(require('./src/lib/data/pinyin-audio-map.json').char['悦'])").mp3"
```
Expected: login 200、dashboard 307（重定向到 /login）、悦 音频 200。

---

## Self-Review（已执行）

- **Spec 覆盖：** 替换例字（Task 1）、字典（Task 2）、三步骤页面改动含步骤3 完整拼音作答（Task 3）、音频重生成 + db:seed（Task 1/3）、生产重建（Task 4）。✓
- **占位符扫描：** 无 TBD/TODO；字典 151 条、页面代码、测试代码均完整给出。✓
- **类型一致性：** `getCharPinyin(char): string` 与 `CHAR_PINYIN: Record<string,string>` 在 Task 2 定义、Task 3 使用一致；`content/pinyin.json` 例字集合在 Task 1 变更、Task 2/3 消费一致。✓
- **数据校验：** 字典 151 条已程序化生成并验证：0 缺漏、0 多余、声母前缀 0 失败。✓
