# 古诗词朗读改用预生成神经语音 — 设计文档

日期：2026-08-04
状态：已确认（方案 A）

## 背景与目标

古诗词朗读目前用浏览器 `speechSynthesis`（`SpeakButton`，rate 0.8 / pitch 1）念诗，
机械生硬、无韵律、跨设备不一致。目标：改用**预生成神经语音 MP3**，与英语/拼音已建立的
预生成音频体系一致，朗读自然、有节奏、100% 可靠。

用户已确认方案 A：用微软 Edge 免费神经语音（`edge-tts`，无需 API key，已实测可用）
预生成全部 95 首诗的朗读音频；默认音色 **zh-CN-XiaoxiaoNeural（晓晓 女声）**、
语速 **-12%**、音调 **-2Hz**（可后续调优）。

## 方案

### 1. 生成脚本 `scripts/gen-poetry-audio.py`

- 读取 `content/poetry.json`（95 首诗，字段 `content`）。
- 对每首诗用 `edge-tts` 生成朗读 MP3：
  - voice `zh-CN-XiaoxiaoNeural`
  - `--rate=-12% --pitch=-2Hz`
  - 文本 = 诗的 `content`（含标点，edge-tts 会自然停顿）
- 输出 `public/audio/zh/poetry/{slug}.mp3`，`slug = md5(content)[:12]`（与现有体系一致）。
- 写出 `src/lib/data/poetry-audio-map.json`：`{ "poetry": { "<content>": "<slug>" } }`。
- 已存在且 >500B 的文件跳过（可重复运行）。
- 脚本依赖：`pip install edge-tts`（README 注明）。

### 2. `SpeakAudio` 支持 `kind="poetry"`

`src/components/SpeakAudio.tsx` 的 `kind` 联合类型从
`"word" | "sentence" | "pinyin" | "char"` 扩展为
`"word" | "sentence" | "pinyin" | "char" | "poetry"`。
配合 `dir="zh"`、`map={poetryAudioMap}` 即播放 `/audio/zh/poetry/{slug}.mp3`，英文调用点零改动。

### 3. 页面改动 `src/app/learning/[subject]/page.tsx`

- 导入 `poetryAudioMap`。
- **PoetryStep1**：`<SpeakButton text={item.content} />` → `<SpeakAudio text={item.content} kind="poetry" dir="zh" map={poetryAudioMap} />`。
- **PoetryStep2**（朗诵练习）：目前无朗读按钮，新增 `<SpeakAudio text={item.content} kind="poetry" dir="zh" map={poetryAudioMap} />`（放在诗歌正文附近）。
- `SpeakButton` 仍被识字步骤使用，保留。

### 4. 测试

新增 `src/lib/poetry-audio-map.test.ts`（仿 `pinyin-audio-map.test.ts`）：
- map 的 `poetry` 区覆盖 `content/poetry.json` 全部 95 首诗（按 content 键，无缺漏、无多余）。
- 每个 slug 对应真实存在的音频文件（>500B）。

### 5. 收尾（生产）

代码与音频生成后：`npm run build` + 重启 `next start`，冒烟验证登录与诗歌音频 200。

## 数据流

```
content/poetry.json ── gen-poetry-audio.py (edge-tts) ──► public/audio/zh/poetry/{slug}.mp3
                                                    └─► src/lib/data/poetry-audio-map.json
                                                              │
learning/[subject]/page.tsx ── SpeakAudio(kind="poetry", dir="zh", map) ──► <audio src="/audio/zh/poetry/...">
```

## 验收标准

1. 古诗步骤1/2 朗读播放预生成 MP3，音色自然、语速舒缓（晓晓 -12%）。
2. 95 首诗全部有音频，映射覆盖且文件存在。
3. 英语/拼音/识字音频不受影响；`SpeakButton` 仅识字继续使用。
4. 新增测试全绿，既有测试套件全绿。
5. 生产服务器重建后诗歌音频 200。
