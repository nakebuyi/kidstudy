import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";
import "./steps.scss";

interface LiteracyItem {
  id: string;
  char: string;
  pinyin: string;
  radical: string;
  strokes: number;
  words: string[];
  sentences: string[];
}

interface StepProps {
  item: LiteracyItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function LiteracyLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-char-big">{item.char}</Text>
          <Text className="step-pinyin">{item.pinyin}</Text>
          <Text className="step-meta">
            部首：{item.radical} · 笔画：{item.strokes}
          </Text>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">📝 组词</Text>
        <View className="step-tags">
          {(item.words ?? []).map((w: string) => (
            <View key={w} className="step-tag">
              <Text>{w}</Text>
            </View>
          ))}
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
        <Text className="step-next-btn-text">下一步：测试认读</Text>
      </View>
    </View>
  );
}

export function LiteracyQuiz({ item, onComplete }: StepProps) {
  // Generate 4 options: 3 random wrong chars + 1 correct
  const wrongPool = ["一", "二", "三", "大", "小", "人", "口", "手", "目", "日"]
    .filter((c) => c !== item.char);

  const shuffled = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...shuffled, item.char];

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">请选择正确的汉字</Text>
          <Text className="step-pinyin-large">{item.pinyin}</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={item.char}
        onSelect={onComplete}
      />
    </View>
  );
}
