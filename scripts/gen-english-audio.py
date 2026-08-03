#!/usr/bin/env python3
"""预生成英语单词 + 例句音频（Google TTS → public/audio/en/）。

用法：python3 scripts/gen-english-audio.py
输出：
  public/audio/en/word/{slug}.mp3     每个单词
  public/audio/en/sentence/{slug}.mp3 每个例句

slug 由文本哈希生成，稳定且 URL-safe。
"""
import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content", "english.json")
OUT_WORD = os.path.join(ROOT, "public", "audio", "en", "word")
OUT_SENT = os.path.join(ROOT, "public", "audio", "en", "sentence")


def slug(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12]


def download(url: str, dest: str, retries: int = 3) -> bool:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "Mozilla/5.0"}
            )
            data = urllib.request.urlopen(req, timeout=15).read()
            if len(data) < 500:
                print(f"  ⚠ 太小 ({len(data)}b) 重试 {attempt+1}: {dest}")
                time.sleep(1)
                continue
            with open(dest, "wb") as f:
                f.write(data)
            return True
        except Exception as e:
            print(f"  ✗ 错误 {attempt+1}: {e}")
            time.sleep(1.5)
    return False


def main():
    os.makedirs(OUT_WORD, exist_ok=True)
    os.makedirs(OUT_SENT, exist_ok=True)

    items = json.load(open(CONTENT, encoding="utf-8"))
    print(f"共 {len(items)} 个单词")

    stats = {"word_ok": 0, "word_skip": 0, "sent_ok": 0, "sent_skip": 0, "fail": 0}

    for i, item in enumerate(items):
        word = item["word"]

        # 单词
        ws = slug(word)
        dest_word = os.path.join(OUT_WORD, f"{ws}.mp3")
        if os.path.exists(dest_word) and os.path.getsize(dest_word) > 500:
            stats["word_skip"] += 1
        elif download(
            f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(word)}&tl=en&client=tw-ob",
            dest_word,
        ):
            stats["word_ok"] += 1
        else:
            stats["fail"] += 1

        # 例句
        for s in item.get("sentences", []):
            ss = slug(s)
            dest_sent = os.path.join(OUT_SENT, f"{ss}.mp3")
            if os.path.exists(dest_sent) and os.path.getsize(dest_sent) > 500:
                stats["sent_skip"] += 1
            elif download(
                f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(s)}&tl=en&client=tw-ob",
                dest_sent,
            ):
                stats["sent_ok"] += 1
            else:
                stats["fail"] += 1

        if (i + 1) % 20 == 0:
            print(f"  进度 {i+1}/{len(items)}: {stats}")
        time.sleep(0.3)

    print("\n完成:", stats)
    total = sum(v for k, v in stats.items() if k != "fail")
    print(f"生成/复用 {total} 个文件，失败 {stats['fail']} 个")
    if stats["fail"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
