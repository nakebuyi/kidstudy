import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";
import "./steps.scss";

const typeNames: Record<string, string> = {
  initial: "声母", final: "韵母", whole: "整体认读音节",
};

interface PinyinItem {
  id: string;
  pinyin: string;
  type: string;
  examples: string[];
}

interface StepProps {
  item: PinyinItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function PinyinLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-pinyin-big">{item.pinyin}</Text>
          <View className="step-tag step-tag-accent">
            <Text>{typeNames[item.type] ?? item.type}</Text>
          </View>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📝 例字</Text>
        <View className="step-examples">
          {(item.examples ?? []).map((ex: string) => (
            <View key={ex} className="step-example-item">
              <Text className="step-example-char">{ex}</Text>
            </View>
          ))}
        </View>
      </ContentCard>

      <ContentCard>
        <View className="step-center">
          <Text className="step-section-title">🔊 发音提示</Text>
          <Text className="step-hint">
            请大声朗读拼音，注意发音的口型和声调
          </Text>
        </View>
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：听力测试</Text>
      </View>
    </View>
  );
}

export function PinyinQuiz({ item, onComplete }: StepProps) {
  const exampleChar = item.examples?.[0] ?? "";
  const correctPinyin = item.pinyin;

  // Generate wrong options from common pinyin
  const pool = ["ba", "pa", "ma", "fa", "da", "ta", "na", "la", "bo", "po", "mo", "fo"]
    .filter((p) => p !== correctPinyin)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [...pool, correctPinyin];

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">听音辨拼音</Text>
          <Text className="step-example-char-large">{exampleChar}</Text>
          <Text className="step-hint">这个字的拼音是什么？</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={correctPinyin}
        onSelect={onComplete}
      />
    </View>
  );
}
