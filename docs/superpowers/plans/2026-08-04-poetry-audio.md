# 古诗词朗读预生成神经语音 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将古诗词朗读从浏览器 TTS 切换到预生成的 Microsoft Edge 神经语音 MP3，音色自然（晓晓女声、语速 -12%）。

**Architecture:** 用 `edge-tts`（免费、无需 API key，已实测可用）写 `scripts/gen-poetry-audio.py` 把 95 首诗预生成为 `public/audio/zh/poetry/{slug}.mp3` 并写出 `src/lib/data/poetry-audio-map.json`。`SpeakAudio` 的 `kind` 联合类型扩展 `"poetry"`；页面 PoetryStep1 换用预生成音频，PoetryStep2 新增朗读按钮。最后重建重启生产。

**Tech Stack:** Python3 + edge-tts / TypeScript / Vitest / Next.js（生产 `next start`）。

## Global Constraints

- 朗读音频为预生成 MP3，slug = `md5(content)[:12]`，路径 `public/audio/zh/poetry/{slug}.mp3`。
- 生成参数固定：voice `zh-CN-XiaoxiaoNeural`、`rate=-12%`、`pitch=-2Hz`；已存在且 >500B 文件跳过。
- 映射 `src/lib/data/poetry-audio-map.json` 结构：`{ "poetry": { "<content>": "<slug>" } }`（kind 键 `poetry` 与 SpeakAudio 的 `map[kind]` 查找一致）。
- `SpeakAudio` 向后兼容：英语/拼音调用点不变，仅把 `kind` 联合类型扩展 `"poetry"`。
- 覆盖 `content/poetry.json` 全部 95 首诗；测试断言映射与文件均完整。
- `SpeakButton` 仍被识字步骤使用，保留；英语/拼音音频不受影响。
- 脚本依赖 `pip install edge-tts`（README 需注明）。
- 生产服务器最后 `npm run build` + `npm run start` 重启。

---

### Task 1: 诗歌音频生成脚本 + 资产 + 映射（TDD）

**Files:**
- Create: `scripts/gen-poetry-audio.py`
- Generate: `public/audio/zh/poetry/{slug}.mp3`（95 个）
- Generate: `src/lib/data/poetry-audio-map.json`
- Test: `src/lib/poetry-audio-map.test.ts`

**Interfaces:**
- Consumes: `content/poetry.json`（95 项，字段 `content`）
- Produces:
  - `src/lib/data/poetry-audio-map.json`：`{ "poetry": { "<content>": "<slug>" } }`
  - `public/audio/zh/poetry/{slug}.mp3`
- 后续 Task 3 使用：`poetryAudioMap`（kind="poetry"、dir="zh"）。

**注意：** 需联网（edge-tts 调微软端点，已实测可达）。脚本可重复运行（>500B 跳过）。

- [ ] **Step 1: 写失败测试（数据完整性护栏）**

创建 `src/lib/poetry-audio-map.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "fs";
import poetryAudioMap from "@/lib/data/poetry-audio-map.json";
import poetryData from "@/../content/poetry.json";

const map = poetryAudioMap as { poetry: Record<string, string> };
const items = poetryData as Array<{ id: string; content: string }>;

describe("poetry-audio-map", () => {
  it("covers every poem content", () => {
    for (const item of items) {
      expect(map.poetry[item.content], `缺少音频: ${item.id}`).toBeTruthy();
    }
    expect(Object.keys(map.poetry).length).toBe(items.length);
  });

  it("every slug has a real audio file >500B", () => {
    for (const slug of Object.values(map.poetry)) {
      const p = `public/audio/zh/poetry/${slug}.mp3`;
      expect(existsSync(p), `缺失文件 ${p}`).toBe(true);
      expect(statSync(p).size, `${p} 文件过小`).toBeGreaterThan(500);
    }
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/poetry-audio-map.test.ts`
Expected: FAIL，报错 `Cannot find module '@/lib/data/poetry-audio-map.json'`（map 尚不存在）。

- [ ] **Step 3: 写生成脚本**

创建 `scripts/gen-poetry-audio.py`：

```python
#!/usr/bin/env python3
"""预生成古诗朗读音频（Microsoft Edge 神经语音 edge-tts）。

用法：pip install edge-tts && python3 scripts/gen-poetry-audio.py
输出：
  public/audio/zh/poetry/{slug}.mp3  每首诗
  src/lib/data/poetry-audio-map.json { "poetry": { "<content>": "<slug>" } }

slug = md5(content)[:12]，稳定且 URL-safe。
默认音色：zh-CN-XiaoxiaoNeural（晓晓），语速 -12%，音调 -2Hz。
"""
import asyncio
import hashlib
import json
import os
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content", "poetry.json")
OUT_DIR = os.path.join(ROOT, "public", "audio", "zh", "poetry")
MAP_PATH = os.path.join(ROOT, "src", "lib", "data", "poetry-audio-map.json")

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-12%"
PITCH = "-2Hz"
MIN_SIZE = 500


def slug(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12]


async def gen(text: str, dest: str) -> bool:
    if os.path.exists(dest) and os.path.getsize(dest) > MIN_SIZE:
        return True  # 已生成，跳过
    try:
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
        await communicate.save(dest)
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        return False
    return os.path.exists(dest) and os.path.getsize(dest) > MIN_SIZE


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    items = json.load(open(CONTENT, encoding="utf-8"))
    print(f"共 {len(items)} 首诗")

    audio_map: dict[str, str] = {}
    failures: list[str] = []
    for i, item in enumerate(items):
        content = item["content"]
        s = slug(content)
        if await gen(content, os.path.join(OUT_DIR, f"{s}.mp3")):
            audio_map[content] = s
        else:
            failures.append(content[:12])
        if (i + 1) % 20 == 0:
            print(f"  进度 {i + 1}/{len(items)}")

    with open(MAP_PATH, "w", encoding="utf-8") as f:
        json.dump({"poetry": audio_map}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"诗 {len(audio_map)}/{len(items)}")
    if failures:
        print("失败:", failures)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 4: 运行脚本生成音频与 map**

Run: `python3 scripts/gen-poetry-audio.py`
Expected: 打印 `诗 95/95`，无失败列表；`public/audio/zh/poetry/` 95 个 mp3、`src/lib/data/poetry-audio-map.json` 生成。

验证：
```bash
ls public/audio/zh/poetry | wc -l   # 95
node -e "const m=require('./src/lib/data/poetry-audio-map.json'); console.log(Object.keys(m.poetry).length)"  # 95
```

- [ ] **Step 5: 运行确认测试通过**

Run: `npx vitest run src/lib/poetry-audio-map.test.ts`
Expected: PASS（2 个用例全绿）。

- [ ] **Step 6: 全量测试 + 提交**

Run: `npx vitest run`
Expected: 全部通过。

```bash
git add scripts/gen-poetry-audio.py public/audio/zh/poetry src/lib/data/poetry-audio-map.json src/lib/poetry-audio-map.test.ts
git commit -m "feat: generate poetry pre-generated neural audio"
```

---

### Task 2: SpeakAudio 支持 poetry kind

**Files:**
- Modify: `src/components/SpeakAudio.tsx`
- Modify: `src/components/SpeakAudio.test.tsx`

**Interfaces:**
- Consumes: `resolveAudioSlug`、`AudioMap`（已存在）；`poetry-audio-map.json`（Task 1）
- Produces: `SpeakAudio` 的 `kind` 联合类型新增 `"poetry"`：
  `"word" | "sentence" | "pinyin" | "char" | "poetry"`。英语/拼音调用点不变。

- [ ] **Step 1: 扩展 kind 联合类型**

在 `src/components/SpeakAudio.tsx` 把 props 的 `kind` 类型（第 29 行）从：

```ts
kind: "word" | "sentence" | "pinyin" | "char";
```

改为：

```ts
kind: "word" | "sentence" | "pinyin" | "char" | "poetry";
```

（组件逻辑不变——`resolveAudioSlug(map, kind, text)` 对 `kind="poetry"` 会命中 `map["poetry"]`。）

- [ ] **Step 2: 新增 poetry 用例**

在 `src/components/SpeakAudio.test.tsx` 顶部增加导入：

```ts
import poetryAudioMap from "@/lib/data/poetry-audio-map.json";
```

并在 describe 内新增一个用例（用 map 里真实存在的一首诗内容）：

```tsx
it("plays a poem audio for a known content", () => {
  const poemContent = Object.keys(poetryAudioMap.poetry)[0];
  render(<SpeakAudio text={poemContent} kind="poetry" dir="zh" map={poetryAudioMap} />);
  const btn = screen.getByRole("button", { name: /朗读/ });
  fireEvent.click(btn);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
});
```

- [ ] **Step 3: 运行确认通过**

Run: `npx vitest run src/components/SpeakAudio.test.tsx`
Expected: PASS（现有 2 例 + 新 1 例全绿）。

- [ ] **Step 4: 全量测试 + 提交**

Run: `npx vitest run`
Expected: 全部通过。

```bash
git add src/components/SpeakAudio.tsx src/components/SpeakAudio.test.tsx
git commit -m "feat: support poetry kind in SpeakAudio"
```

---

### Task 3: 诗歌页步骤1/2 改用预生成音频

**Files:**
- Modify: `src/app/learning/[subject]/page.tsx`

**Interfaces:**
- Consumes: `SpeakAudio`（Task 2，kind="poetry"）；`src/lib/data/poetry-audio-map.json`（Task 1）
- Produces: 诗歌步骤1/2 朗读走预生成音频；`SpeakButton` 仅识字使用。

- [ ] **Step 1: 改导入**

在 `src/app/learning/[subject]/page.tsx` 的 import 区新增：

```ts
import poetryAudioMap from "@/lib/data/poetry-audio-map.json";
```

- [ ] **Step 2: 改 PoetryStep1**

把 `PoetryStep1` 里的：

```tsx
<SpeakButton text={item.content} />
```

替换为：

```tsx
<SpeakAudio text={item.content} kind="poetry" dir="zh" map={poetryAudioMap} />
```

- [ ] **Step 3: 改 PoetryStep2（新增朗读按钮）**

`PoetryStep2` 的"🗣️ 朗诵练习"卡片里，诗歌正文块（`bg-red-50 rounded-lg p-6`）之后新增一个居中的朗读按钮。找到：

```tsx
          <div className="bg-red-50 rounded-lg p-6">
            <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-line">
              {item.content}
            </p>
          </div>
```

改为：

```tsx
          <div className="bg-red-50 rounded-lg p-6">
            <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-line">
              {item.content}
            </p>
          </div>
          <div className="mt-4 flex justify-center">
            <SpeakAudio text={item.content} kind="poetry" dir="zh" map={poetryAudioMap} />
          </div>
```

- [ ] **Step 4: 校验**

Run:
```bash
npx tsc --noEmit
npx vitest run
grep -rn "poetryAudioMap\|kind=\"poetry\"" src/app/learning --include="*.tsx"
```
Expected: tsc 无错误；vitest 全部通过；grep 显示 2 处 `poetryAudioMap`/`kind="poetry"`（步骤1/2）。确认 `SpeakButton` 仍被识字步骤使用（`grep -n "SpeakButton" src/app/learning --include="*.tsx"` 应有识字 1 处）。

- [ ] **Step 5: 提交**

```bash
git add src/app/learning/[subject]/page.tsx
git commit -m "feat: use pre-generated neural audio for poetry read-aloud"
```

---

### Task 4: 生产重建 + 冒烟验证

**Files:** 无（仅构建/部署）

- [ ] **Step 1: 重建生产包**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 2: 重启生产服务器**

```bash
pkill -f "next-server"; pkill -f "next start"; sleep 2
nohup npm run start > server.log 2>&1 &
```

- [ ] **Step 3: 冒烟验证**

Run:
```bash
for i in $(seq 1 20); do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login); [ "$code" = "200" ] && break; sleep 1; done
curl -s -o /dev/null -w "login: %{http_code}\n" http://localhost:3000/login
node -e "const m=require('./src/lib/data/poetry-audio-map.json'); const s=Object.values(m.poetry)[0]; console.log(s)"
curl -s -o /dev/null -w "poem audio: %{http_code}\n" "http://localhost:3000/audio/zh/poetry/$(node -e "process.stdout.write(Object.values(require('./src/lib/data/poetry-audio-map.json').poetry)[0])").mp3"
```
Expected: login 200、诗音频 200。

---

## Self-Review（已执行）

- **Spec 覆盖：** 生成脚本 + 资产 + 映射（Task 1）、SpeakAudio poetry kind（Task 2）、页面步骤1/2（Task 3）、生产重建（Task 4）。✓
- **占位符扫描：** 无 TBD/TODO；脚本、测试、页面改动代码完整给出。✓
- **类型一致性：** `kind` 联合类型在 Task 2 扩展、Task 3 使用一致；map 键 `poetry` 与 `SpeakAudio` 的 `map[kind]` 查找一致；`poetryAudioMap` 在 Task 1 生成、Task 2/3 引用一致。✓
- **已验证：** edge-tts CLI 与 Python API（Communicate + save）均实测可生成 MP3；SpeakAudio 当前 kind 联合类型已确认。✓
