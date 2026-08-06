import { View, Text } from "@tarojs/components";
import { ContentCard, QuizOptions } from "../../../../components/learning";
import "./steps.scss";

const typeNames: Record<string, string> = {
  addition: "加法", subtraction: "减法",
  multiplication: "乘法", word: "应用题",
};

interface MathItem {
  id: string;
  type: string;
  question: string;
  answer: number;
  options: number[];
  level: number;
}

interface StepProps {
  item: MathItem;
  onNext: () => void;
  onComplete: (correct: boolean) => void;
}

export function MathLearn({ item, onNext }: StepProps) {
  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-emoji-big">🧮</Text>
          <Text className="step-math-question">{item.question}</Text>
          <View className="step-tag step-tag-accent">
            <Text>{typeNames[item.type] ?? item.type}</Text>
          </View>
        </View>
      </ContentCard>

      <ContentCard>
        <Text className="step-section-title">💡 解题提示</Text>
        <View className="step-hint-box">
          <Text className="step-hint">
            {item.type === "addition"
              ? "加法就是把两个数合在一起，用数数的方法来帮助计算吧！"
              : item.type === "subtraction"
              ? "减法就是从一个数里去掉一部分，看看还剩多少。"
              : "认真看题目，想想应该怎么算？"}
          </Text>
        </View>
        <View className="step-meta-row">
          <View className="step-meta-item">
            <Text className="step-meta-label">难度</Text>
            <Text className="step-meta-value">{"⭐".repeat(item.level)}</Text>
          </View>
        </View>
      </ContentCard>

      <View className="step-next-btn" onClick={onNext}>
        <Text className="step-next-btn-text">下一步：选择答案</Text>
      </View>
    </View>
  );
}

export function MathQuiz({ item, onComplete }: StepProps) {
  const options = (item.options ?? [1, 2, 3, 4]).map(String);

  return (
    <View>
      <ContentCard>
        <View className="step-center">
          <Text className="step-quiz-prompt">请选择正确答案</Text>
          <Text className="step-math-question">{item.question}</Text>
        </View>
      </ContentCard>
      <QuizOptions
        options={options}
        correctAnswer={String(item.answer)}
        onSelect={onComplete}
      />
    </View>
  );
}
