import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";
import "./steps.scss";

interface EnglishItem {
  id: string;
  word: string;
  chinese: string;
  emoji: string;
  category: string;
  sentences: string[];
}

interface StepProps {
  item: EnglishItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function EnglishLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-emoji-big">{item.emoji}</Text>
          <Text className="step-word-big">{item.word}</Text>
          <Text className="step-subtitle">{item.chinese}</Text>
          <View className="step-tag">
            <Text>{item.category}</Text>
          </View>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">💬 例句</Text>
        {(item.sentences ?? []).map((s: string) => (
          <View key={s} className="step-sentence">
            <Text>{s}</Text>
          </View>
        ))}
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：听力测试</Text>
      </View>
    </View>
  );
}

export function EnglishQuiz({ item, onComplete }: StepProps) {
  const wordPool = [
    "apple", "banana", "cat", "dog", "red", "blue",
    "one", "two", "eye", "hand", "mom", "dad",
    "sun", "moon", "water", "big", "small", "happy", "run", "eat",
  ];
  const wrong = wordPool
    .filter((w) => w !== item.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [...wrong, item.word];

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">这个用英语怎么说？</Text>
          <Text className="step-emoji-big">{item.emoji}</Text>
          <Text className="step-subtitle">{item.chinese}</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={item.word}
        onSelect={onComplete}
      />
    </View>
  );
}
