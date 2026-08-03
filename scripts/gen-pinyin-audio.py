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
            time.sleep(0.3)  # 限速，避免 Google TTS 429 节流（对齐英语脚本）
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

    with open(CONTENT, encoding="utf-8") as f:
        items = json.load(f)
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
        f.write("\n")
    print(f"拼音 {len(pinyin_map)}/{len(items)}，例字 {len(char_map)}")
    if failures:
        print("失败:", failures)
        sys.exit(1)


if __name__ == "__main__":
    main()
