# 拼音例字完整拼音（带声调）— 设计文档

日期：2026-08-03
状态：已确认

## 背景与目标

拼音学习步骤 1（识记）与步骤 2（练习拼读）目前只显示拼音项本身（如声母 `j`），
例字下方/拼读行显示 `{item.pinyin} → {ex}`（如 `j → 家`），孩子看不到例字的
**完整拼音**（家 = jiā），也无法把"看到的音节"与"听到的发音"对应起来。

目标：
1. 例字显示其**完整拼音（带声调）**，如 `家 jiā → 家`、步骤1 例字下方 `jiā`。
2. 朗读即该字的完整拼音（拼读），显示与声音一致。
3. 消除多音字造成的"显示读音 ≠ 单独朗读声音"的不一致。

用户已确认：带声调显示；步骤1 与 步骤2 都改；多音字用**替换无歧义例字**处理。

## 方案

### 1. 例字替换（消除多音字）

`content/pinyin.json` 替换 4 处读音有歧义的例字：

| 原例字 | 所在项 | 问题 | 替换为 | 读音 |
|--------|--------|------|--------|------|
| 乐 | yue（整体认读） | 意图 yuè，单独朗读默认 lè | 悦 | yuè（喜悦） |
| 了 | l（声母） | le / liǎo 歧义 | 拉 | lā（拉手） |
| 只 | zh（声母） | zhī / zhǐ 歧义 | 猪 | zhū（小猪） |
| 只 | zhi（整体认读） | 同上 | 直 | zhí（直尺） |

`发`（fā/fà）与 `谁`（shuí/shéi）两读但声母/韵母目标一致，保留并按标准读音标注
（发→fā、谁→shuí），显示与单独朗读声音一致。

### 2. 新增例字拼音字典 `src/lib/char-pinyin.ts`

- `export const CHAR_PINYIN: Record<string, string>` —— 覆盖 `content/pinyin.json`
  全部唯一例字，值为带声调的完整拼音（家→jiā、爸→bà）。
- `export function getCharPinyin(char: string): string` —— 查不到回退返回 `char` 本身。
- 数据来源：94 个例字直接采用 `content/literacy.json` 的 pinyin（已核对读音）；
  其余 ~57 个手动核准（含 4 个新替换例字悦/拉/猪/直）。
- 沿用 `src/lib/pinyin-pronunciation.ts` 的 TS 模块模式。

### 3. 页面改动 `src/app/learning/[subject]/page.tsx`

- **PinyinStep1** 例字卡片：例字下方的
  `<div className="text-sm text-sky-500 mt-1">{item.pinyin}</div>`
  改为 `{getCharPinyin(ex)}`（例字 家 下方显示 `jiā`）。
- **PinyinStep2** 练习拼读行：中间文本 `{item.pinyin} → {ex}` 改为
  `{getCharPinyin(ex)} → {ex}`（渲染为 `家 jiā → 家`）。
- PinyinStep2 底部提示语由"先读拼音 {item.pinyin}，再读汉字"改为
  "请跟着拼音大声拼读每个例字，先读完整拼音（如 jiā），再读汉字"。
- 朗读按钮保持 `<SpeakAudio text={ex} kind="char" dir="zh" map={pinyinAudioMap} />`
  （播放例字音频 = 完整拼音音；因多音字已替换，显示与声音一致）。
- 引入 `getCharPinyin` 供两个步骤使用。

### 4. 音频重生成

重跑 `python3 scripts/gen-pinyin-audio.py`：为 4 个新例字（悦/拉/猪/直）补音频，
并把 `src/lib/data/pinyin-audio-map.json` 的 `char` 区更新为当前例字集合（旧的
乐/了/只 音频文件留在磁盘但移出映射，无害；已存在文件自动跳过）。生成的映射
继续满足 `pinyin-audio-map.test.ts` 的全覆盖断言。

### 5. 数据库同步

`npm run db:seed` 幂等 upsert（不会清掉孩子/打卡等用户数据），把更新后的
`content/pinyin.json`（新例字）同步进 Prisma 的 `LearningContent`。学习页经
`/api/learning/pinyin` 从数据库读取内容，因此必须重新播种。

### 6. 测试

新增 `src/lib/char-pinyin.test.ts`：
- 字典覆盖 `content/pinyin.json` 的全部唯一例字（防缺漏）。
- 对 `type === "initial"` 的每一项，每个例字拼音以该项声母开头
  （如 j 项 → jiā 以 "j" 开头）—— 防错读。

### 7. 收尾（生产环境）

代码改动后重建并重启生产服务器（`npm run build` + `npm run start`，nginx
443/80 已反代 127.0.0.1:3000），冒烟验证：登录、拼音页例字显示、音频 200。

## 数据流

```
content/pinyin.json（替换 4 例字）
  ├── gen-pinyin-audio.py ──► public/audio/zh/char/{slug}.mp3（+4 新例字）
  │                         └─► src/lib/data/pinyin-audio-map.json（更新 char 区）
  └── db:seed ──► Prisma LearningContent ──► /api/learning/pinyin ──► 学习页

src/lib/char-pinyin.ts（新字典）──► 学习页 getCharPinyin(ex) 显示完整拼音
```

## 验收标准

1. 步骤2 拼读行显示 `家 jiā → 家`；步骤1 例字下方显示 `jiā`。
2. 朗读按钮播出的声音与该字完整拼音一致（多音字已替换）。
3. 多音字 乐/了/只 已替换为 悦/拉/猪/直，其音频在映射中并存在。
4. `char-pinyin.test.ts` 全绿；既有测试套件全绿。
5. 生产服务器重建后页面/音频/登录正常。
