# 幼小衔接学习平台 (kidstudy)

面向 5-7 岁儿童的幼小衔接在线学习平台：工作台式布局、每日打卡、五大科目（识字、拼音、英语、算数、古诗词）、积分与宠物养成体系。家长可创建并管理多个孩子账号，查看学习报告。

## 技术栈

- **框架**：Next.js (App Router) + TypeScript
- **样式**：Tailwind CSS + shadcn/ui
- **状态**：React Context + useReducer
- **数据**：Prisma + SQLite（本地开发）/ Turso（远程）；学习内容为静态 JSON（`content/*.json`）
- **认证**：NextAuth（用户名密码，家长 / 孩子双角色）
- **测试**：Vitest

## 快速开始

```bash
npm install
npm run db:setup   # prisma db push + seed（创建 demo 父账号，密码 123456）
npm run dev        # http://localhost:3000
```

## 朗读音频（预生成 MP3，不依赖浏览器 TTS）

英语、拼音与古诗的朗读采用**预生成 MP3**（`<audio>` 元素播放），彻底规避浏览器 `speechSynthesis` 在某些设备上静默失败的问题。识字仍使用浏览器 TTS（zh-CN 稳定可靠）。

**目录与映射：**

| 语言 | 音频目录 | 映射文件 |
|------|---------|---------|
| 英语 | `public/audio/en/word`、`public/audio/en/sentence` | `src/lib/data/english-audio-map.json` |
| 拼音 | `public/audio/zh/pinyin`（呼读音）、`public/audio/zh/char`（例字） | `src/lib/data/pinyin-audio-map.json` |
| 古诗 | `public/audio/zh/poetry` | `src/lib/data/poetry-audio-map.json` |

- 音频文件名 `slug = md5(文本)[:12]`，稳定且 URL-safe。
- 播放组件：`src/components/SpeakAudio.tsx`（`dir` / `map` 参数，默认英语，向后兼容）。
- slug 查找逻辑：`src/lib/audio-map.ts` 的 `resolveAudioSlug`（兼容英语复数键 `words`/`sentences` 与拼音单数键 `pinyin`/`char`）。
- 拼音呼读音表：`src/lib/pinyin-pronunciation.ts`（与 `scripts/gen-pinyin-audio.py` 保持一致）。
- 中间件 `src/middleware.ts` 已放行 `/audio` 静态资源。

**重新生成音频**（需联网：英语/拼音走 Google TTS，古诗走 Microsoft edge-tts；已存在且 >10KB 的文件自动跳过，可重复运行）：

```bash
python3 scripts/gen-english-audio.py   # 英语单词 + 例句
python3 scripts/gen-pinyin-audio.py    # 拼音呼读音 + 例字，并自动写出映射 JSON
python3 scripts/gen-poetry-audio.py    # 古诗朗读（edge-tts 神经语音），并自动写出映射 JSON
```

> 注意：古诗脚本依赖 `pip install edge-tts`（Microsoft Edge 神经语音）；英语/拼音脚本无需额外依赖。

> 注意：拼音 63 个呼读音会按文本哈希去重（如 i / y / yi 均读"衣"），因此 `public/audio/zh/pinyin/` 实际约 46 个文件，但映射始终覆盖全部 63 个拼音键。

## 测试

```bash
npm test          # vitest run（含音频映射完整性校验）
npm run lint      # eslint
```

## 目录结构

```
public/audio/          # 预生成朗读音频（en / zh）
content/*.json         # 学习内容（识字/拼音/英语/算数/古诗）
scripts/               # 音频生成脚本
src/app/               # Next.js App Router 页面（dashboard / learning / games / parent）
src/components/        # UI、布局、学习、游戏组件
src/lib/               # 工具、内容加载、打卡、积分、音频映射
src/store/             # React Context（认证、孩子、学习状态）
```

## Deploy on Vercel

本项目可部署到 [Vercel](https://vercel.com)。请确保在部署环境配置 Prisma 数据库连接（`DATABASE_URL` 或 `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`）及 `NEXTAUTH_SECRET` / `NEXTAUTH_URL`。
