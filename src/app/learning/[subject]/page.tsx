"use client";

import { useState, useMemo, use, useEffect } from "react";
import { useLearning } from "@/store/LearningContext";
import { useChild } from "@/store/ChildContext";
import { useSpeech } from "@/hooks/useSpeech";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, X, Volume2 } from "lucide-react";
import { WritingCanvas } from "@/components/WritingCanvas";
import { getPinyinSpeechText } from "@/lib/pinyin-pronunciation";
import Link from "next/link";

const subjectNames: Record<string, { title: string; icon: string }> = {
  literacy: { title: "识字", icon: "📖" },
  pinyin: { title: "拼音", icon: "🔤" },
  english: { title: "英语", icon: "🌍" },
  math: { title: "算数", icon: "🧮" },
  poetry: { title: "古诗词", icon: "📜" },
};

const subjectColors: Record<string, string> = {
  literacy: "orange",
  pinyin: "sky",
  english: "green",
  math: "purple",
  poetry: "red",
};

// ===================== SPEECH BUTTON =====================

function SpeakButton({ text, lang = "zh-CN" }: { text: string; lang?: string }) {
  const { speak, speaking, supported } = useSpeech();
  if (!supported) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1"
      onClick={() => speak(text, lang)}
      disabled={speaking}
    >
      <Volume2 className={`w-4 h-4 ${speaking ? "animate-pulse" : ""}`} />
      {speaking ? "朗读中..." : "朗读"}
    </Button>
  );
}

// ===================== LITERACY =====================

function LiteracyStep1({ char, onNext }: { char: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <span className="text-8xl mb-4">{char.emoji}</span>
          <div className="text-6xl font-bold text-gray-800 mb-2">{char.char}</div>
          <div className="text-2xl text-orange-500 mb-4">{char.pinyin}</div>
          <SpeakButton text={char.char} />
          <div className="text-sm text-gray-500">
            部首：{char.radical} · 笔画：{char.strokes}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 组词</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {char.words.map((word: string) => (
              <Badge key={word} variant="secondary" className="text-base px-3 py-1">
                {word}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💬 例句</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {char.sentences.map((s: string) => (
              <li key={s} className="text-gray-700 bg-orange-50 rounded-lg px-4 py-2">
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：书写练习 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function LiteracyStep2({ char, onNext }: { char: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <span className="text-8xl mb-4">{char.char}</span>
          <div className="text-2xl text-gray-500 mb-4">{char.pinyin}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✏️ 笔画信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-500">{char.strokes}</div>
              <div className="text-sm text-gray-500">总笔画数</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-500">{char.radical}</div>
              <div className="text-sm text-gray-500">部首</div>
            </div>
          </div>
          <div className="mt-4">
            <WritingCanvas character={char.char} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：测试认读 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function LiteracyStep3({ char, onComplete }: { char: any; onComplete: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = useMemo(() => {
    const wrong = ["一", "二", "三", "大", "小", "人", "口", "手", "目", "日"]
      .filter((c) => c !== char.char)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const all = [...wrong, char.char].sort(() => Math.random() - 0.5);
    return all;
  }, [char.char]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === char.char;
    setTimeout(() => onComplete(correct), 800);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-medium text-center text-gray-800 mb-2">
            请选择正确的汉字
          </h3>
          <div className="text-3xl text-center text-orange-500 font-bold mb-6">
            {char.pinyin}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {options.map((option) => {
              let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
              if (answered && option === char.char) variant = "default";
              if (answered && option === selected && option !== char.char) variant = "destructive";

              return (
                <Button
                  key={option}
                  variant={variant}
                  size="lg"
                  className="h-20 text-3xl"
                  onClick={() => handleSelect(option)}
                  disabled={answered}
                >
                  {option}
                  {answered && option === char.char && <Check className="w-5 h-5 ml-2" />}
                  {answered && option === selected && option !== char.char && <X className="w-5 h-5 ml-2" />}
                </Button>
              );
            })}
          </div>
          {answered && (
            <div className={`text-center mt-4 text-lg font-medium ${selected === char.char ? "text-green-500" : "text-red-500"}`}>
              {selected === char.char ? "🎉 太棒了！回答正确！" : "😊 没关系，再试试吧！"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== PINYIN =====================

function PinyinStep1({ item, onNext }: { item: any; onNext: () => void }) {
  const typeNames: Record<string, string> = { initial: "声母", final: "韵母", whole: "整体认读音节" };
  const typeColors: Record<string, string> = { initial: "sky", final: "green", whole: "purple" };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="text-7xl font-bold text-sky-500 mb-4">{item.pinyin}</div>
          <SpeakButton text={getPinyinSpeechText(item.pinyin)} />
          <div className="mt-2">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {typeNames[item.type] ?? item.type}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 例字</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 justify-center">
            {item.examples.map((ex: string) => (
              <div key={ex} className="bg-sky-50 rounded-xl px-6 py-4 text-center">
                <div className="text-3xl font-bold text-gray-800">{ex}</div>
                <div className="text-sm text-sky-500 mt-1">{item.pinyin}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔊 发音提示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-sky-50 rounded-lg p-4 text-center">
            <Volume2 className="w-8 h-8 text-sky-500 mx-auto mb-2" />
            <p className="text-gray-600">请跟着大声朗读拼音 <strong>{item.pinyin}</strong></p>
            <p className="text-sm text-gray-400 mt-1">注意发音的口型和声调</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：拼读练习 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function PinyinStep2({ item, onNext }: { item: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="text-7xl font-bold text-sky-500 mb-4">{item.pinyin}</div>
          <SpeakButton text={getPinyinSpeechText(item.pinyin)} />
          <p className="text-gray-500 mt-2">拼读练习</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✏️ 练习拼读</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {item.examples.map((ex: string) => (
              <div key={ex} className="flex items-center gap-4 bg-sky-50 rounded-lg p-4">
                <span className="text-3xl font-bold text-gray-800">{ex}</span>
                <span className="text-xl text-sky-500">
                  {item.pinyin} → {ex}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600">
              请大声拼读每个例字：先读拼音 <strong>{item.pinyin}</strong>，再读汉字
            </p>
            <p className="text-sm text-gray-400 mt-1">重复练习，直到熟练掌握</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：听力测试 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function PinyinStep3({ item, onComplete }: { item: any; onComplete: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = useMemo(() => {
    const allPinyins = ["b", "p", "m", "f", "d", "t", "n", "l", "a", "o", "e", "i", "u", "ü", "ai", "ei", "ao", "ou", "zhi", "yi"];
    const wrong = allPinyins
      .filter((p) => p !== item.pinyin)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const all = [...wrong, item.pinyin].sort(() => Math.random() - 0.5);
    return all;
  }, [item.pinyin]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === item.pinyin;
    setTimeout(() => onComplete(correct), 800);
  };

  const exampleChar = item.examples[0];

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
          <p className="text-center text-gray-500 mb-6">这个字的拼音是什么？</p>
          <div className="grid grid-cols-2 gap-4">
            {options.map((option) => {
              let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
              if (answered && option === item.pinyin) variant = "default";
              if (answered && option === selected && option !== item.pinyin) variant = "destructive";

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
                  {answered && option === item.pinyin && <Check className="w-5 h-5 ml-2" />}
                  {answered && option === selected && option !== item.pinyin && <X className="w-5 h-5 ml-2" />}
                </Button>
              );
            })}
          </div>
          {answered && (
            <div className={`text-center mt-4 text-lg font-medium ${selected === item.pinyin ? "text-green-500" : "text-red-500"}`}>
              {selected === item.pinyin ? "🎉 太棒了！回答正确！" : "😊 没关系，再试试吧！"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== ENGLISH =====================

function EnglishStep1({ item, onNext }: { item: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <span className="text-8xl mb-4">{item.emoji}</span>
          <div className="text-5xl font-bold text-green-600 mb-2">{item.word}</div>
          <div className="text-2xl text-gray-500 mb-2">{item.chinese}</div>
          <SpeakButton text={item.word} lang="en-US" />
          <div className="mt-2">
            <Badge variant="secondary">{item.category}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💬 例句</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {item.sentences.map((s: string) => (
              <li key={s} className="text-gray-700 bg-green-50 rounded-lg px-4 py-2">
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔊 发音提示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <Volume2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">请大声朗读单词 <strong>{item.word}</strong></p>
            <p className="text-sm text-gray-400 mt-1">注意发音，反复练习</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：跟读练习 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function EnglishStep2({ item, onNext }: { item: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <span className="text-8xl mb-4">{item.emoji}</span>
          <div className="text-5xl font-bold text-green-600 mb-2">{item.word}</div>
          <div className="text-2xl text-gray-500">{item.chinese}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🗣️ 跟读练习</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {item.sentences.map((s: string) => (
              <div key={s} className="bg-green-50 rounded-lg p-4">
                <p className="text-lg text-gray-700">{s}</p>
                <p className="text-sm text-green-500 mt-1">请大声朗读这个句子</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600">
              请模仿发音，大声读出每个例句
            </p>
            <p className="text-sm text-gray-400 mt-1">可以先听再读，多练习几遍</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：听力测试 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function EnglishStep3({ item, onComplete }: { item: any; onComplete: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = useMemo(() => {
    const allWords = ["apple", "banana", "cat", "dog", "red", "blue", "one", "two", "eye", "hand", "mom", "dad", "sun", "moon", "water", "big", "small", "happy", "run", "eat"];
    const wrong = allWords
      .filter((w) => w !== item.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const all = [...wrong, item.word].sort(() => Math.random() - 0.5);
    return all;
  }, [item.word]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === item.word;
    setTimeout(() => onComplete(correct), 800);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-medium text-center text-gray-800 mb-2">
            听中文选英文
          </h3>
          <div className="text-3xl text-center font-bold text-gray-800 mb-2">
            {item.emoji} {item.chinese}
          </div>
          <p className="text-center text-gray-500 mb-6">这个单词用英语怎么说？</p>
          <div className="grid grid-cols-2 gap-4">
            {options.map((option) => {
              let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
              if (answered && option === item.word) variant = "default";
              if (answered && option === selected && option !== item.word) variant = "destructive";

              return (
                <Button
                  key={option}
                  variant={variant}
                  size="lg"
                  className="h-20 text-xl"
                  onClick={() => handleSelect(option)}
                  disabled={answered}
                >
                  {option}
                  {answered && option === item.word && <Check className="w-5 h-5 ml-2" />}
                  {answered && option === selected && option !== item.word && <X className="w-5 h-5 ml-2" />}
                </Button>
              );
            })}
          </div>
          {answered && (
            <div className={`text-center mt-4 text-lg font-medium ${selected === item.word ? "text-green-500" : "text-red-500"}`}>
              {selected === item.word ? "🎉 太棒了！回答正确！" : "😊 没关系，再试试吧！"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== MATH =====================

function MathStep1({ item, onNext }: { item: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <span className="text-7xl mb-4">🧮</span>
          <div className="text-5xl font-bold text-purple-500 mb-4">{item.question}</div>
          <Badge variant="secondary" className="text-base">
            {item.type === "addition" ? "加法" : item.type === "subtraction" ? "减法" : item.type === "multiplication" ? "乘法" : "应用题"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 解题提示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">
              {item.type === "addition"
                ? "加法就是把两个数合在一起，用数数的方法来帮助计算吧！"
                : item.type === "subtraction"
                ? "减法就是从一个数里去掉一部分，看看还剩多少。"
                : "认真看题目，想想应该怎么算？"}
            </p>
            <p className="text-sm text-gray-400 mt-2">可以先在心里默默算一算</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：计算练习 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function MathStep2({ item, onNext }: { item: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="text-5xl font-bold text-purple-500 mb-4">{item.question}</div>
          <p className="text-gray-500">请在心中计算答案</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✏️ 竖式计算提示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-gray-600">
              可以在纸上列出竖式，对齐数位进行计算
            </p>
            <p className="text-sm text-gray-400 mt-1">
              从个位开始算起，注意进位和退位
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">题目类型</div>
              <div className="text-lg font-bold text-purple-500">
                {item.type === "addition" ? "➕ 加法" : item.type === "subtraction" ? "➖ 减法" : item.type === "multiplication" ? "✖️ 乘法" : "📝 应用题"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">难度等级</div>
              <div className="text-lg font-bold text-purple-500">
                {"⭐".repeat(item.level)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：选择答案 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function MathStep3({ item, onComplete }: { item: any; onComplete: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = item.options;

  const handleSelect = (option: number) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === item.answer;
    setTimeout(() => onComplete(correct), 800);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-medium text-center text-gray-800 mb-2">
            请选择正确答案
          </h3>
          <div className="text-5xl text-center text-purple-500 font-bold mb-6">
            {item.question}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {options.map((option: number) => {
              let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
              if (answered && option === item.answer) variant = "default";
              if (answered && option === selected && option !== item.answer) variant = "destructive";

              return (
                <Button
                  key={option}
                  variant={variant}
                  size="lg"
                  className="h-20 text-3xl"
                  onClick={() => handleSelect(option)}
                  disabled={answered}
                >
                  {option}
                  {answered && option === item.answer && <Check className="w-5 h-5 ml-2" />}
                  {answered && option === selected && option !== item.answer && <X className="w-5 h-5 ml-2" />}
                </Button>
              );
            })}
          </div>
          {answered && (
            <div className={`text-center mt-4 text-lg font-medium ${selected === item.answer ? "text-green-500" : "text-red-500"}`}>
              {selected === item.answer ? "🎉 太棒了！回答正确！" : "😊 没关系，正确答案是 " + item.answer}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== POETRY =====================

function PoetryStep1({ item, onNext }: { item: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <span className="text-5xl mb-4">📜</span>
          <div className="text-3xl font-bold text-red-600 mb-2">{item.title}</div>
          <div className="text-lg text-gray-500 mb-4">
            {item.dynasty} · {item.author}
          </div>
          <SpeakButton text={item.content} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📖 原文</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 rounded-lg p-6 text-center">
            <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-line">
              {item.content}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 译文</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 leading-relaxed">{item.translation}</p>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：朗诵练习 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function PoetryStep2({ item, onNext }: { item: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="text-3xl font-bold text-red-600 mb-2">{item.title}</div>
          <div className="text-lg text-gray-500">{item.dynasty} · {item.author}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🗣️ 朗诵练习</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 rounded-lg p-6">
            <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-line">
              {item.content}
            </p>
          </div>
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
            <Volume2 className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-600">
              请大声朗诵古诗 <strong>{item.title}</strong>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              注意停顿和节奏，感受古诗的韵律美
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} size="lg" className="w-full">
        下一步：诗词填空 <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function PoetryStep3({ item, onComplete }: { item: any; onComplete: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const { blank, options } = useMemo(() => {
    const sentences = item.content.split(/[，。！？]/).filter((s: string) => s.trim());
    const targetSentence = sentences[Math.floor(Math.random() * sentences.length)]?.trim() || item.content;
    // Pick a character to blank out
    const chars = [...targetSentence];
    const blankIdx = Math.floor(Math.random() * chars.length);
    const correctChar = chars[blankIdx];
    chars[blankIdx] = "___";

    // Generate wrong options
    const wrongChars = "春花秋月山水风雨天地日月云雪".split("").filter((c) => c !== correctChar);
    const shuffled = wrongChars.sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [...shuffled, correctChar].sort(() => Math.random() - 0.5);

    return {
      blank: chars.join(""),
      correct: correctChar,
      options: allOptions,
    };
  }, [item.content]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === blank.replace("___", options.find((o: string) => !options.includes(o)) || "");
    setTimeout(() => onComplete(option === options.find((o: string) => o === blank.match(/./)?.[0]) || false), 800);
  };

  // Simpler approach: pre-compute the correct answer
  const correctAnswer = useMemo(() => {
    const sentences = item.content.split(/[，。！？]/).filter((s: string) => s.trim());
    const targetSentence = sentences[Math.floor(Math.random() * sentences.length)]?.trim() || item.content;
    const chars = [...targetSentence];
    return chars[Math.floor(Math.random() * chars.length)];
  }, [item.content]);

  const displayBlank = useMemo(() => {
    const sentences = item.content.split(/[，。！？]/).filter((s: string) => s.trim());
    const targetSentence = sentences.find((s: string) => s.includes(correctAnswer)) || item.content;
    return targetSentence.replace(correctAnswer, "___");
  }, [item.content, correctAnswer]);

  const quizOptions = useMemo(() => {
    const wrongChars = "春花秋月山水风雨天地日月云雪".split("").filter((c) => c !== correctAnswer);
    const shuffled = wrongChars.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctAnswer].sort(() => Math.random() - 0.5);
  }, [correctAnswer]);

  const handleSelect2 = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === correctAnswer;
    setTimeout(() => onComplete(correct), 800);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-medium text-center text-gray-800 mb-2">
            诗词填空
          </h3>
          <div className="text-center text-gray-500 mb-2">{item.title}</div>
          <div className="text-2xl text-center font-bold text-red-600 mb-6">
            {displayBlank}
          </div>
          <p className="text-center text-gray-500 mb-6">请选择正确的字填入空白处</p>
          <div className="grid grid-cols-2 gap-4">
            {quizOptions.map((option) => {
              let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
              if (answered && option === correctAnswer) variant = "default";
              if (answered && option === selected && option !== correctAnswer) variant = "destructive";

              return (
                <Button
                  key={option}
                  variant={variant}
                  size="lg"
                  className="h-20 text-3xl"
                  onClick={() => handleSelect2(option)}
                  disabled={answered}
                >
                  {option}
                  {answered && option === correctAnswer && <Check className="w-5 h-5 ml-2" />}
                  {answered && option === selected && option !== correctAnswer && <X className="w-5 h-5 ml-2" />}
                </Button>
              );
            })}
          </div>
          {answered && (
            <div className={`text-center mt-4 text-lg font-medium ${selected === correctAnswer ? "text-green-500" : "text-red-500"}`}>
              {selected === correctAnswer ? "🎉 太棒了！回答正确！" : `😊 正确答案是 "${correctAnswer}"`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== MAIN PAGE =====================

export default function LearningSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = use(params);
  const info = subjectNames[subject] ?? { title: subject, icon: "📚" };
  const { currentStep, completeStep, setQuizResult, startLearning } = useLearning();
  const { child } = useChild();

  const [charIndex, setCharIndex] = useState(0);
  const [todayTask, setTodayTask] = useState<{
    id: string;
    subject: string;
    taskType: string;
    completed: boolean;
    pointsEarned: number;
  } | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(true);

  // Fetch today's check-in task for this subject (view-only when completed)
  useEffect(() => {
    if (!child) {
      setCheckinLoading(false);
      return;
    }
    setCheckinLoading(true);
    fetch(`/api/checkin?childId=${child.id}`)
      .then((res) => res.json())
      .then((data) => {
        const task = (data.tasks ?? []).find(
          (t: { subject: string }) => t.subject === subject
        );
        setTodayTask(task ?? null);
      })
      .catch(() => {})
      .finally(() => setCheckinLoading(false));
  }, [child, subject]);

  const content = useMemo(() => {
    try {
      switch (subject) {
        case "literacy":
          return require("@/../content/literacy.json") as any[];
        case "pinyin":
          return require("@/../content/pinyin.json") as any[];
        case "english":
          return require("@/../content/english.json") as any[];
        case "math":
          return require("@/../content/math.json") as any[];
        case "poetry":
          return require("@/../content/poetry.json") as any[];
        default:
          return [];
      }
    } catch {
      return [];
    }
  }, [subject]);

  const currentItem = content[charIndex] ?? null;

  // Check if subject is enabled (all subjects are now enabled)
  const enabledSubjects = ["literacy", "pinyin", "english", "math", "poetry"];
  if (!enabledSubjects.includes(subject)) {
    return (
      <DesktopLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">未知的学习模块</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">该学习模块不存在，请返回工作台重新选择。</p>
            </CardContent>
          </Card>
        </div>
      </DesktopLayout>
    );
  }

  if (!currentItem) {
    return (
      <DesktopLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">你已经学完了所有内容！</h1>
          <p className="text-gray-500 mb-6">太厉害了！继续保持哦~</p>
          <Link href="/dashboard">
            <Button size="lg">返回工作台</Button>
          </Link>
        </div>
      </DesktopLayout>
    );
  }

  // 今日打卡已完成 —— 只读展示完成情况，不允许再次打卡/修改
  if (todayTask?.completed) {
    return (
      <DesktopLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            今日{info.title}打卡已完成
          </h1>
          <p className="text-gray-500 mb-2">任务：{todayTask.taskType}</p>
          <p className="text-orange-500 font-medium mb-6">
            +{todayTask.pointsEarned} 积分已入账
          </p>
          <Link href="/dashboard">
            <Button size="lg">返回工作台</Button>
          </Link>
        </div>
      </DesktopLayout>
    );
  }

  const handleNext = () => {
    completeStep(currentStep as 1 | 2 | 3);
  };

  const handleQuizComplete = (correct: boolean) => {
    setQuizResult(correct);
    const next = charIndex + 1;
    setCharIndex(next);
    if (next < content.length) {
      startLearning(content[next].id);
    }
    // 完成学习即完成今日该科目的打卡任务（只标记一次）
    if (child && todayTask && !todayTask.completed) {
      fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id, taskId: todayTask.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.pointsEarned !== undefined) {
            setTodayTask((t) =>
              t
                ? {
                    ...t,
                    completed: true,
                    pointsEarned: data.pointsEarned,
                  }
                : t
            );
          }
        })
        .catch(() => {});
    }
  };

  const stepLabels = {
    literacy: ["认读", "书写", "测试"],
    pinyin: ["识记", "拼读", "测试"],
    english: ["认读", "跟读", "测试"],
    math: ["理解", "练习", "测试"],
    poetry: ["诵读", "朗诵", "测试"],
  };

  const labels = stepLabels[subject as keyof typeof stepLabels] ?? ["学习", "练习", "测试"];

  const color = subjectColors[subject] ?? "orange";
  const colorMap: Record<string, string> = {
    orange: "bg-orange-100 text-orange-700 ring-orange-400",
    sky: "bg-sky-100 text-sky-700 ring-sky-400",
    green: "bg-green-100 text-green-700 ring-green-400",
    purple: "bg-purple-100 text-purple-700 ring-purple-400",
    red: "bg-red-100 text-red-700 ring-red-400",
  };

  return (
    <DesktopLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> 返回
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">
              {info.icon} {info.title}学习
            </h1>
          </div>
          <Badge variant="outline">
            {charIndex + 1} / {content.length}
          </Badge>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < currentStep
                    ? "bg-green-100 text-green-700"
                    : step === currentStep
                    ? colorMap[color]
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < 3 && <div className="flex-1 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 px-1">
          {labels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        {/* Step Content */}
        {subject === "literacy" && (
          <>
            {currentStep === 1 && <LiteracyStep1 char={currentItem} onNext={handleNext} />}
            {currentStep === 2 && <LiteracyStep2 char={currentItem} onNext={handleNext} />}
            {currentStep === 3 && <LiteracyStep3 char={currentItem} onComplete={handleQuizComplete} />}
          </>
        )}
        {subject === "pinyin" && (
          <>
            {currentStep === 1 && <PinyinStep1 item={currentItem} onNext={handleNext} />}
            {currentStep === 2 && <PinyinStep2 item={currentItem} onNext={handleNext} />}
            {currentStep === 3 && <PinyinStep3 item={currentItem} onComplete={handleQuizComplete} />}
          </>
        )}
        {subject === "english" && (
          <>
            {currentStep === 1 && <EnglishStep1 item={currentItem} onNext={handleNext} />}
            {currentStep === 2 && <EnglishStep2 item={currentItem} onNext={handleNext} />}
            {currentStep === 3 && <EnglishStep3 item={currentItem} onComplete={handleQuizComplete} />}
          </>
        )}
        {subject === "math" && (
          <>
            {currentStep === 1 && <MathStep1 item={currentItem} onNext={handleNext} />}
            {currentStep === 2 && <MathStep2 item={currentItem} onNext={handleNext} />}
            {currentStep === 3 && <MathStep3 item={currentItem} onComplete={handleQuizComplete} />}
          </>
        )}
        {subject === "poetry" && (
          <>
            {currentStep === 1 && <PoetryStep1 item={currentItem} onNext={handleNext} />}
            {currentStep === 2 && <PoetryStep2 item={currentItem} onNext={handleNext} />}
            {currentStep === 3 && <PoetryStep3 item={currentItem} onComplete={handleQuizComplete} />}
          </>
        )}
      </div>
    </DesktopLayout>
  );
}