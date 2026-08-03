# 拼音朗读改用预生成音频（对齐英语方案）— 设计文档

日期：2026-08-03
状态：已确认

## 背景

英语朗读此前已由浏览器 TTS 切换到预生成 MP3 音频（commit `cde5cef`）：
`public/audio/en/` 下的 MP3 + `src/lib/data/english-audio-map.json` 映射 + `SpeakAudio`
组件播放，100% 可靠、不依赖 `speechSynthesis`。

拼音朗读目前仍用浏览器 TTS（`SpeakButton` → `useSpeech`），通过
`getPinyinSpeechText()` 读呼读音汉字（如 `b` → "玻"）。目标：让拼音也采用英语的
预生成音频方案，做到三步骤全覆盖（步骤1/2 朗读 + 步骤3 听力测试例字朗读）。

## 目标范围（用户已确认：完全对齐英语）

1. 63 个拼音音节（23 声母 + 24 韵母 + 16 整体认读音节）朗读 → 预生成音频。
2. 150 个唯一例字朗读 → 预生成音频。
3. 步骤3"听音辨拼音"测试新增例字朗读按钮（当前没有）。
4. 识字 / 古诗仍保留浏览器 TTS（zh-CN 可靠），不改。

## 方案

### 1. 生成脚本 `scripts/gen-pinyin-audio.py`

模仿 `scripts/gen-english-audio.py`：

- 读 `content/pinyin.json`（63 项，DB 由 `prisma/seed.ts` 从同一文件播种，保证一致）。
- 内联呼读音汉字表（与 `src/lib/pinyin-pronunciation.ts` 的 `ALL` 一致）：
  - 声母 23 个：b→玻 p→坡 m→摸 f→佛 d→得 t→特 n→讷 l→勒 g→哥 k→科 h→喝 j→基
    q→欺 x→希 zh→知 ch→吃 sh→诗 r→日 z→资 c→雌 s→思 y→衣 w→乌
  - 韵母 24 个：a→啊 o→哦 e→鹅 i→衣 u→乌 ü→迂 ai→爱 ei→诶 ui→威 ao→奥 ou→欧
    iu→优 ie→耶 üe→约 er→儿 an→安 en→恩 in→因 un→温 ün→晕 ang→昂 eng→鞥 ing→英 ong→轰
  - 整体认读 16 个：zhi→知 chi→吃 shi→诗 ri→日 zi→资 ci→雌 si→思 yi→衣 wu→乌
    yu→迂 ye→耶 yue→约 yuan→冤 yin→因 yun→晕 ying→英
- 每个拼音：下载其呼读音汉字的 Google TTS 音频（`tl=zh-CN`）→
  `public/audio/zh/pinyin/{slug}.mp3`，`slug = md5(汉字)[:12]`。
- 每个唯一例字：下载其读音 → `public/audio/zh/char/{slug}.mp3`。
- 已存在且 >500B 的文件跳过（与英语脚本一致）。
- 脚本最后写出 `src/lib/data/pinyin-audio-map.json`：
  `{ "pinyin": { "b": "slug", … }, "char": { "爸": "slug", … } }`。
  比英语脚本更进一步 —— map 由脚本生成，永不与音频脱节。
- 已实测 Google TTS 对全部 63 个呼读音汉字（含生僻"鞥"）均产出有效音频（>5KB）。

### 2. 通用化 `SpeakAudio` 组件

`src/components/SpeakAudio.tsx` 增加可选参数，英文调用点零改动：

- `dir`（默认 `"en"`）：`/audio/` 下的子目录。
- `map`（默认英语 map）：按 kind 查 slug 的映射对象。

组件内查找：`slug = (map[kind] ?? map[kind + "s"])?.[text]`。
- 英语 kind=`word` → `map["word"]` 为空，回退 `map["words"]` ✓（现 map 键为复数）。
- 拼音 kind=`pinyin`/`char` → 直接命中 map 对应键 ✓。

`src = /audio/{dir}/{kind}/{slug}.mp3`。找不到 slug 时返回 `null`（不渲染按钮）。

### 3. 拼音学习页改造 `src/app/learning/[subject]/page.tsx`

- **PinyinStep1**：`<SpeakButton text={getPinyinSpeechText(item.pinyin)} />` 替换为
  `<SpeakAudio text={item.pinyin} kind="pinyin" dir="zh" map={pinyinAudioMap} />`；
  每个例字（爸/不/白）下加 `<SpeakAudio text={ex} kind="char" dir="zh" map={pinyinAudioMap} />`。
- **PinyinStep2**：拼音朗读同上替换；拼读练习每行例字加 `kind="char"` 朗读按钮。
- **PinyinStep3**：听音辨拼音的例字旁新增 `kind="char"` 朗读按钮。
- 移除页面中 `getPinyinSpeechText` 导入（拼音不再使用）；`SpeakButton` 仍被识字/古诗使用，保留。
- `pinyin-pronunciation.ts` 库文件保留（供脚本参照与既有测试使用）。

### 4. 中间件

`src/middleware.ts` 已排除 `/audio`，新音频 `/audio/zh/` 天然公开，无需改动。

### 5. 测试

新增 `src/lib/pinyin-audio-map.test.ts`：
- map 的 `pinyin` 键覆盖全部 63 个拼音。
- map 的 `char` 键覆盖全部 150 个例字。
防止生成内容与页面脱节。

## 数据流

```
content/pinyin.json ── gen-pinyin-audio.py ──► public/audio/zh/{pinyin,char}/*.mp3
                                          └──► src/lib/data/pinyin-audio-map.json
                                                            │
learning/[subject]/page.tsx ── SpeakAudio(map=map, dir="zh") ──► <audio src="/audio/zh/...">
```

## 验收标准

1. 拼音步骤 1/2 的"朗读"按钮播放预生成 MP3，读呼读音（b → "玻"），无浏览器 TTS 依赖。
2. 例字可点按朗读。
3. 步骤 3 听力测试例字可朗读。
4. 英语朗读不受影响（`SpeakAudio` 默认参数兼容）。
5. 新增 map 测试通过；既有 Vitest 套件全绿。
