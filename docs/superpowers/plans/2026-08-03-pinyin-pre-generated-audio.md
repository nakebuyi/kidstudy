# 拼音朗读改用预生成音频 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将拼音学习的朗读发音从浏览器 TTS 切换到预生成 MP3 音频，完全对齐英语方案（拼音音节 + 例字 + 步骤3 听力测试）。

**Architecture:** 用一个 Python 脚本读 `content/pinyin.json`，为每个拼音的呼读音汉字和每个例字生成 Google TTS MP3（`tl=zh-CN`），输出到 `public/audio/zh/{pinyin,char}/`，并写出 `src/lib/data/pinyin-audio-map.json` 映射。通用化 `SpeakAudio` 组件（新增 `dir`/`map` 参数，英文调用点零改动），拼音三步骤改用该组件播放音频。中间件已排除 `/audio`，无需改动。

**Tech Stack:** Python3（生成脚本）、Next.js/React/TypeScript、Vitest（测试）、Google TTS（一次性生成音频）。

## Global Constraints

- 拼音朗读**不得**再依赖浏览器 `speechSynthesis`（`SpeakButton`/`useSpeech`）。
- 音频为预生成 MP3，slug = `md5(文本)[:12]`，路径规则 `public/audio/zh/{kind}/{slug}.mp3`。
- 呼读音表必须与 `src/lib/pinyin-pronunciation.ts` 的 `ALL` 完全一致（已核对：63 项，0 差异）。
- `SpeakAudio` 保持向后兼容：默认 `dir="en"`、默认 `map` 为英语 map，英语调用点（`kind="word"|"sentence"`）不改。
- 拼音 map 键为单数 `"pinyin"`/`"char"`（与 kind 一致）；英语 map 键保持复数 `"words"`/`"sentences"`。
- 覆盖全部 63 个拼音（23 声母 + 24 韵母 + 16 整体认读音节）和全部 150 个唯一例字。
- 识字 / 古诗的朗读继续用浏览器 TTS 的 `SpeakButton`，不改。
- 中间件 `src/middleware.ts` 已排除 `/audio`，不修改。

---

### Task 1: 音频 slug 解析辅助函数（TDD）

**Files:**
- Create: `src/lib/audio-map.ts`
- Test: `src/lib/audio-map.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `src/lib/audio-map.ts`
  - `export type AudioMap = Record<string, Record<string, string>>;`
  - `export function resolveAudioSlug(map: AudioMap, kind: string, text: string): string | undefined;`
    —— 先查 `map[kind][text]`，查不到再回退 `map[kind + "s"][text]`（兼容英语复数键 `words`/`sentences`）。

- [ ] **Step 1: 写失败测试**

创建 `src/lib/audio-map.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { resolveAudioSlug } from "./audio-map";

describe("resolveAudioSlug", () => {
  const map = {
    pinyin: { b: "slug-b" },
    char: { 爸: "slug-ba" },
    words: { apple: "slug-apple" },
    sentences: { "I like it.": "slug-s" },
  };

  it("finds a slug in a singular-key section (pinyin)", () => {
    expect(resolveAudioSlug(map, "pinyin", "b")).toBe("slug-b");
  });

  it("finds a slug in a plural-key section (english word)", () => {
    expect(resolveAudioSlug(map, "word", "apple")).toBe("slug-apple");
  });

  it("finds a slug in a plural-key section (english sentence)", () => {
    expect(resolveAudioSlug(map, "sentence", "I like it.")).toBe("slug-s");
  });

  it("returns undefined for a text missing from the section", () => {
    expect(resolveAudioSlug(map, "pinyin", "zzz")).toBeUndefined();
  });

  it("returns undefined when the kind section does not exist", () => {
    expect(resolveAudioSlug(map, "math", "1")).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/audio-map.test.ts`
Expected: FAIL，报错 `Cannot find module './audio-map'`（模块尚不存在）。

- [ ] **Step 3: 写最小实现**

创建 `src/lib/audio-map.ts`：

```ts
export type AudioMap = Record<string, Record<string, string>>;

/**
 * 在音频映射中按 kind 查找文本对应的 slug。
 *
 * 先查单数键（拼音 map 的 "pinyin"/"char"），再回退复数键
 * （英语 map 的 "words"/"sentences"，与组件调用 kind "word"/"sentence" 对应）。
 */
export function resolveAudioSlug(
  map: AudioMap,
  kind: string,
  text: string
): string | undefined {
  return (map[kind] ?? map[kind + "s"])?.[text];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/audio-map.test.ts`
Expected: PASS（5 个用例全绿）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/audio-map.ts src/lib/audio-map.test.ts
git commit -m "feat: add audio slug resolution helper"
```

---

### Task 2: 拼音音频生成脚本 + 资产 + 映射数据

**Files:**
- Create: `scripts/gen-pinyin-audio.py`
- Generate: `public/audio/zh/pinyin/{slug}.mp3`（63 个）、`public/audio/zh/char/{slug}.mp3`（150 个）
- Generate: `src/lib/data/pinyin-audio-map.json`
- Test: `src/lib/pinyin-audio-map.test.ts`

**Interfaces:**
- Consumes: `content/pinyin.json`（63 项，字段 `pinyin`、`examples`）；呼读音表（与 `src/lib/pinyin-pronunciation.ts` 一致）
- Produces:
  - `src/lib/data/pinyin-audio-map.json` 结构：`{ "pinyin": { "b": "slug", … }, "char": { "爸": "slug", … } }`
  - `public/audio/zh/pinyin/{slug}.mp3`、`public/audio/zh/char/{slug}.mp3`

**注意：** 本任务需联网访问 Google TTS（已实测可达，全部 63 个呼读音汉字均返回 >5KB 有效音频）。脚本可重复运行：已存在且 >500B 的文件自动跳过。

- [ ] **Step 1: 写失败测试（数据完整性护栏）**

创建 `src/lib/pinyin-audio-map.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import pinyinAudioMap from "@/lib/data/pinyin-audio-map.json";
import pinyinData from "@/../content/pinyin.json";

const map = pinyinAudioMap as {
  pinyin: Record<string, string>;
  char: Record<string, string>;
};
const items = pinyinData as Array<{
  id: string;
  pinyin: string;
  examples: string[];
}>;

describe("pinyin-audio-map", () => {
  it("covers every pinyin syllable", () => {
    for (const item of items) {
      expect(map.pinyin[item.pinyin], `缺少拼音音频: ${item.pinyin}`).toBeTruthy();
    }
    expect(Object.keys(map.pinyin).length).toBe(items.length);
  });

  it("covers every example character", () => {
    const uniqueChars = [...new Set(items.flatMap((i) => i.examples))];
    for (const c of uniqueChars) {
      expect(map.char[c], `缺少例字音频: ${c}`).toBeTruthy();
    }
    expect(Object.keys(map.char).length).toBe(uniqueChars.length);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/pinyin-audio-map.test.ts`
Expected: FAIL，报错 `Cannot find module '@/lib/data/pinyin-audio-map.json'`（map 尚不存在）。

- [ ] **Step 3: 写生成脚本**

创建 `scripts/gen-pinyin-audio.py`：

```python
#!/usr/bin/env python3
"""预生成拼音 + 例字音频（Google TTS → public/audio/zh/）。

用法：python3 scripts/gen-pinyin-audio.py
输出：
  public/audio/zh/pinyin/{slug}.mp3  每个拼音的呼读音汉字
  public/audio/zh/char/{slug}.mp3    每个例字
  src/lib/data/pinyin-audio-map.json { "pinyin": {…}, "char": {…} }

slug = md5(文本)[:12]，稳定且 URL-safe。
呼读音表与 src/lib/pinyin-pronunciation.ts 保持一致（63 项）。
"""
import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content", "pinyin.json")
OUT_PINYIN = os.path.join(ROOT, "public", "audio", "zh", "pinyin")
OUT_CHAR = os.path.join(ROOT, "public", "audio", "zh", "char")
MAP_PATH = os.path.join(ROOT, "src", "lib", "data", "pinyin-audio-map.json")

# 呼读音表（与 src/lib/pinyin-pronunciation.ts 的 INITIALS/FINALS/WHOLE_SYLLABLES 一致）
PINYIN_SPEECH = {
    # 声母 23
    "b": "玻", "p": "坡", "m": "摸", "f": "佛", "d": "得", "t": "特",
    "n": "讷", "l": "勒", "g": "哥", "k": "科", "h": "喝", "j": "基",
    "q": "欺", "x": "希", "zh": "知", "ch": "吃", "sh": "诗", "r": "日",
    "z": "资", "c": "雌", "s": "思", "y": "衣", "w": "乌",
    # 韵母 24
    "a": "啊", "o": "哦", "e": "鹅", "i": "衣", "u": "乌", "ü": "迂",
    "ai": "爱", "ei": "诶", "ui": "威", "ao": "奥", "ou": "欧", "iu": "优",
    "ie": "耶", "üe": "约", "er": "儿", "an": "安", "en": "恩", "in": "因",
    "un": "温", "ün": "晕", "ang": "昂", "eng": "鞥", "ing": "英", "ong": "轰",
    # 整体认读音节 16
    "zhi": "知", "chi": "吃", "shi": "诗", "ri": "日", "zi": "资", "ci": "雌",
    "si": "思", "yi": "衣", "wu": "乌", "yu": "迂", "ye": "耶", "yue": "约",
    "yuan": "冤", "yin": "因", "yun": "晕", "ying": "英",
}


def slug(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12]


def download(url: str, dest: str, retries: int = 3) -> bool:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=15).read()
            if len(data) < 500:
                print(f"  ⚠ 太小 ({len(data)}b) 重试 {attempt + 1}: {dest}")
                time.sleep(1)
                continue
            with open(dest, "wb") as f:
                f.write(data)
            return True
        except Exception as e:
            print(f"  ✗ 错误 {attempt + 1}: {e}")
            time.sleep(1.5)
    return False


def fetch(text: str, out_dir: str) -> str | None:
    s = slug(text)
    dest = os.path.join(out_dir, f"{s}.mp3")
    if os.path.exists(dest) and os.path.getsize(dest) > 500:
        return s  # 已生成（覆盖重复文本与重复运行）
    url = (
        "https://translate.google.com/translate_tts"
        f"?ie=UTF-8&q={urllib.parse.quote(text)}&tl=zh-CN&client=tw-ob"
    )
    if download(url, dest):
        return s
    return None


def main():
    os.makedirs(OUT_PINYIN, exist_ok=True)
    os.makedirs(OUT_CHAR, exist_ok=True)

    items = json.load(open(CONTENT, encoding="utf-8"))
    print(f"共 {len(items)} 个拼音")

    pinyin_map: dict[str, str] = {}
    char_map: dict[str, str] = {}
    failures: list[str] = []

    for i, item in enumerate(items):
        pinyin = item["pinyin"]
        speech = PINYIN_SPEECH.get(pinyin)
        if speech is None:
            failures.append(f"缺少呼读音: {pinyin}")
            continue
        s = fetch(speech, OUT_PINYIN)
        if s is None:
            failures.append(f"拼音失败: {pinyin} ({speech})")
        else:
            pinyin_map[pinyin] = s

        for ex in item.get("examples", []):
            sc = fetch(ex, OUT_CHAR)
            if sc is None:
                failures.append(f"例字失败: {ex}")
            else:
                char_map[ex] = sc

        if (i + 1) % 20 == 0:
            print(f"  进度 {i + 1}/{len(items)}")

    with open(MAP_PATH, "w", encoding="utf-8") as f:
        json.dump({"pinyin": pinyin_map, "char": char_map}, f, ensure_ascii=False, indent=2)
    print(f"拼音 {len(pinyin_map)}/{len(items)}，例字 {len(char_map)}")
    if failures:
        print("失败:", failures)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 运行脚本生成音频与 map**

Run: `python3 scripts/gen-pinyin-audio.py`
Expected: 打印 `拼音 63/63，例字 150`，无失败列表；`public/audio/zh/pinyin/` 63 个 mp3、`public/audio/zh/char/` 150 个 mp3、`src/lib/data/pinyin-audio-map.json` 生成。

验证文件数：

```bash
ls public/audio/zh/pinyin | wc -l   # 46（共享呼读音去重；map 键数应为 63）
ls public/audio/zh/char | wc -l     # 150
node -e "const m=require('./src/lib/data/pinyin-audio-map.json'); console.log(Object.keys(m.pinyin).length, Object.keys(m.char).length)"  # 63 150
```

- [ ] **Step 5: 运行确认测试通过**

Run: `npx vitest run src/lib/pinyin-audio-map.test.ts`
Expected: PASS（2 个用例全绿）。

- [ ] **Step 6: 提交**

```bash
git add scripts/gen-pinyin-audio.py public/audio/zh src/lib/data/pinyin-audio-map.json src/lib/pinyin-audio-map.test.ts
git commit -m "feat: generate pinyin pre-generated audio and map"
```

---

### Task 3: 通用化 SpeakAudio 组件

**Files:**
- Modify: `src/components/SpeakAudio.tsx`
- Test: `src/components/SpeakAudio.test.tsx`

**Interfaces:**
- Consumes: `resolveAudioSlug`（Task 1）；`pinyin-audio-map.json`（Task 2）
- Produces: 通用 `SpeakAudio`，新签名：
  ```ts
  function SpeakAudio({ text, kind, className, dir = "en", map = englishAudioMap }: {
    text: string;
    kind: string;
    className?: string;
    dir?: string;
    map?: AudioMap;
  }): JSX.Element | null;
  ```
  - `dir`：`/audio/` 下的子目录（英语 `"en"`、拼音 `"zh"`）。
  - `map`：按 kind 查 slug 的映射对象（默认英语 map）。
  - 找不到 slug 时渲染 `null`。
  - 英语调用点（`<SpeakAudio text={…} kind="word" />` 等）行为不变。

- [ ] **Step 1: 写失败测试**

创建 `src/components/SpeakAudio.test.tsx`（jsdom 环境，沿用仓库组件测试模式）：

```tsx
/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpeakAudio } from "./SpeakAudio";
import pinyinAudioMap from "@/lib/data/pinyin-audio-map.json";

// jsdom 没有 HTMLMediaElement.play 的真实实现
beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});

describe("SpeakAudio", () => {
  it("renders nothing when the text is not in the map", () => {
    const { container } = render(
      <SpeakAudio text="zzz-no-such" kind="pinyin" dir="zh" map={pinyinAudioMap} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("plays audio on click for a known pinyin", () => {
    render(<SpeakAudio text="b" kind="pinyin" dir="zh" map={pinyinAudioMap} />);
    const btn = screen.getByRole("button", { name: /朗读/ });
    fireEvent.click(btn);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/components/SpeakAudio.test.tsx`
Expected: 至少 FAIL —— `pinyin-audio-map.json` 路径在旧组件里未使用/断言不成立（`dir`/`map` 参数还不存在）。

- [ ] **Step 3: 修改组件实现**

改写 `src/components/SpeakAudio.tsx` 为：

```tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import englishAudioMap from "@/lib/data/english-audio-map.json";
import { resolveAudioSlug } from "@/lib/audio-map";
import type { AudioMap } from "@/lib/audio-map";

const defaultMap = englishAudioMap as AudioMap;

/**
 * 预生成音频播放按钮 —— 播放 public/audio/ 下的 MP3，不依赖浏览器 TTS
 * （speechSynthesis 在某些设备上静默失败）。100% 可靠。
 *
 * 英语：<SpeakAudio text={word} kind="word" />
 *        → /audio/en/word/{slug}.mp3（默认 dir="en"、map=英语 map，兼容旧调用）
 * 拼音：<SpeakAudio text="b" kind="pinyin" dir="zh" map={pinyinAudioMap} />
 *        → /audio/zh/pinyin/{slug}.mp3
 */
export function SpeakAudio({
  text,
  kind,
  className,
  dir = "en",
  map = defaultMap,
}: {
  text: string;
  kind: string;
  className?: string;
  dir?: string;
  map?: AudioMap;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const slug = resolveAudioSlug(map, kind, text);
  if (!slug) return null;

  const src = `/audio/${dir}/${kind}/${slug}.mp3`;

  const play = () => {
    // 复用同一个 audio 元素，避免并发
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setSpeaking(false);
      audioRef.current.onerror = () => setSpeaking(false);
    } else {
      audioRef.current.src = src;
    }
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setSpeaking(true))
      .catch(() => setSpeaking(false));
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-1 ${className ?? ""}`}
      onClick={play}
      disabled={speaking}
    >
      <Volume2 className={`w-4 h-4 ${speaking ? "animate-pulse" : ""}`} />
      {speaking ? "播放中..." : "朗读"}
    </Button>
  );
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/components/SpeakAudio.test.tsx`
Expected: PASS（2 个用例全绿）。

- [ ] **Step 5: 确认英语调用点不受影响**

Run: `grep -rn "SpeakAudio" src/app --include="*.tsx" | grep -v test`
Expected: 英语调用点仍是 `<SpeakAudio text={item.word} kind="word" />`、`kind="sentence"`，未改动；默认参数使其行为不变。

- [ ] **Step 6: 提交**

```bash
git add src/components/SpeakAudio.tsx src/components/SpeakAudio.test.tsx
git commit -m "feat: generalize SpeakAudio for pinyin pre-generated audio"
```

---

### Task 4: 拼音学习页改用预生成音频

**Files:**
- Modify: `src/app/learning/[subject]/page.tsx`

**Interfaces:**
- Consumes: `SpeakAudio`（Task 3，支持 `dir`/`map`）；`src/lib/data/pinyin-audio-map.json`（Task 2）
- Produces: 拼音三个步骤的朗读按钮全部走预生成音频；页面不再调用 `getPinyinSpeechText`。

- [ ] **Step 1: 改导入**

在 `src/app/learning/[subject]/page.tsx`：

- 删除第 15 行 `import { getPinyinSpeechText } from "@/lib/pinyin-pronunciation";`
- 新增：`import pinyinAudioMap from "@/lib/data/pinyin-audio-map.json";`
- `SpeakAudio` 已导入（第 14 行），保留。

- [ ] **Step 2: 改 PinyinStep1**

把 `PinyinStep1` 里的：

```tsx
<SpeakButton text={getPinyinSpeechText(item.pinyin)} />
```

替换为：

```tsx
<SpeakAudio text={item.pinyin} kind="pinyin" dir="zh" map={pinyinAudioMap} />
```

并把"例字"卡片里的每个例字块（当前无朗读）：

```tsx
{item.examples.map((ex: string) => (
  <div key={ex} className="bg-sky-50 rounded-xl px-6 py-4 text-center">
    <div className="text-3xl font-bold text-gray-800">{ex}</div>
    <div className="text-sm text-sky-500 mt-1">{item.pinyin}</div>
  </div>
))}
```

改为在块内追加一个例字朗读按钮：

```tsx
{item.examples.map((ex: string) => (
  <div key={ex} className="bg-sky-50 rounded-xl px-6 py-4 text-center flex flex-col items-center">
    <div className="text-3xl font-bold text-gray-800">{ex}</div>
    <div className="text-sm text-sky-500 mt-1">{item.pinyin}</div>
    <SpeakAudio text={ex} kind="char" dir="zh" map={pinyinAudioMap} className="mt-2" />
  </div>
))}
```

- [ ] **Step 3: 改 PinyinStep2**

把 `PinyinStep2` 里的：

```tsx
<SpeakButton text={getPinyinSpeechText(item.pinyin)} />
```

替换为：

```tsx
<SpeakAudio text={item.pinyin} kind="pinyin" dir="zh" map={pinyinAudioMap} />
```

并把拼读练习每行（当前无朗读）：

```tsx
{item.examples.map((ex: string) => (
  <div key={ex} className="flex items-center gap-4 bg-sky-50 rounded-lg p-4">
    <span className="text-3xl font-bold text-gray-800">{ex}</span>
    <span className="text-xl text-sky-500">
      {item.pinyin} → {ex}
    </span>
  </div>
))}
```

改为行尾追加例字朗读按钮：

```tsx
{item.examples.map((ex: string) => (
  <div key={ex} className="flex items-center gap-4 bg-sky-50 rounded-lg p-4">
    <span className="text-3xl font-bold text-gray-800">{ex}</span>
    <span className="text-xl text-sky-500 flex-1">
      {item.pinyin} → {ex}
    </span>
    <SpeakAudio text={ex} kind="char" dir="zh" map={pinyinAudioMap} />
  </div>
))}
```

- [ ] **Step 4: 改 PinyinStep3（听力测试新增例字朗读）**

`PinyinStep3` 当前顶部（约第 339-341 行）：

```tsx
<div className="text-5xl text-center font-bold text-gray-800 mb-2">
  {exampleChar}
</div>
```

改为在例字下方加一个居中朗读按钮：

```tsx
<div className="text-5xl text-center font-bold text-gray-800 mb-2">
  {exampleChar}
</div>
<div className="flex justify-center mb-6">
  <SpeakAudio text={exampleChar} kind="char" dir="zh" map={pinyinAudioMap} />
</div>
```

（`exampleChar = item.examples[0]` 已在组件内定义。）

- [ ] **Step 5: 类型检查 + lint + 全量测试**

Run:
```bash
npx tsc --noEmit
npm run lint
npx vitest run
```
Expected: 均通过。`grep -rn "getPinyinSpeechText" src/app/learning --include="*.tsx"` 无结果。

- [ ] **Step 6: 提交**

```bash
git add src/app/learning/[subject]/page.tsx
git commit -m "feat: use pre-generated audio for pinyin read-aloud"
```

---

### Task 5: 最终验证

**Files:** 无（若验证发现问题则修复并提交）

- [ ] **Step 1: 全量验证**

Run:
```bash
npx vitest run
npm run lint
npx tsc --noEmit
```
Expected: 全绿，无类型错误、无 lint 报错。

- [ ] **Step 2: 核对音频资产与映射一致性**

Run:
```bash
node -e "
const m=require('./src/lib/data/pinyin-audio-map.json');
const fs=require('fs');
let ok=true;
for (const [kind, list] of Object.entries(m)) {
  for (const [text, slug] of Object.entries(list)) {
    const p = 'public/audio/zh/' + kind + '/' + slug + '.mp3';
    if (!fs.existsSync(p)) { console.log('缺失:', p); ok=false; }
  }
}
console.log(ok ? '所有映射音频文件存在' : '存在缺失');
"
```
Expected: 打印 `所有映射音频文件存在`。

- [ ] **Step 3: 汇总提交（如有修复）**

若 Step 1/2 发现需要修复的内容，修复后：

```bash
git add -A
git commit -m "chore: fix verification findings"
```

---

## Self-Review（已执行）

- **Spec 覆盖：** spec 中「生成脚本」「通用化 SpeakAudio」「拼音三步骤改造」「中间件不动」「新增测试」分别对应 Task 2/3/4/（Global Constraints）/1+2。✓
- **占位符扫描：** 无 TBD/TODO；所有代码步骤均给出完整内容。✓
- **类型一致性：** `resolveAudioSlug(map, kind, text)` 在 Task 1/3 中签名一致；`SpeakAudio` 新 props `dir`/`map` 在 Task 3 定义、Task 4 使用一致；map JSON 键 `pinyin`/`char` 在 Task 2 生成、Task 3/4 引用一致。✓
