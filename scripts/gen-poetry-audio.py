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
