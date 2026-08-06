import { useMemo } from "react";
import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";
import "./steps.scss";

interface PoetryItem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  translation: string;
}

interface StepProps {
  item: PoetryItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function PoetryLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-emoji-big">📜</Text>
          <Text className="step-poetry-title">{item.title}</Text>
          <Text className="step-subtitle">
            {item.dynasty} · {item.author}
          </Text>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📖 原文</Text>
        <View className="step-poetry-content">
          <Text className="step-poetry-text">{item.content}</Text>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📝 译文</Text>
        <Text className="step-hint">{item.translation}</Text>
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：诗词填空</Text>
      </View>
    </View>
  );
}

export function PoetryQuiz({ item, onComplete }: StepProps) {
  const { blankSentence, correctChar, options } = useMemo(() => {
    const sentences = item.content.split(/[，。！？]/).filter((s: string) => s.trim());
    const target = sentences[Math.floor(Math.random() * sentences.length)]?.trim() ?? item.content;
    const chars = [...target];
    const blankIdx = Math.floor(Math.random() * chars.length);
    const answer = chars[blankIdx];
    chars[blankIdx] = "___";

    const wrongPool = "春花秋月山水风雨天地日月云雪".split("").filter((c) => c !== answer);
    const wrong = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);
    return {
      blankSentence: chars.join(""),
      correctChar: answer,
      options: [...wrong, answer],
    };
  }, [item.content]);

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">诗词填空</Text>
          <Text className="step-subtitle">{item.title}</Text>
          <Text className="step-poetry-blank">{blankSentence}</Text>
          <Text className="step-hint">请选择正确的字填入空白处</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={correctChar}
        onSelect={onComplete}
      />
    </View>
  );
}
