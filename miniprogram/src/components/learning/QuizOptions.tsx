import { useState, useMemo } from "react";
import { View, Text } from "@tarojs/components";
import "./QuizOptions.scss";

interface QuizOptionsProps {
  options: string[];
  correctAnswer: string;
  onSelect: (correct: boolean) => void;
  /** Optional: render each option with custom content */
  renderOption?: (option: string) => string;
}

export function QuizOptions({
  options: rawOptions,
  correctAnswer,
  onSelect,
  renderOption,
}: QuizOptionsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const shuffled = useMemo(() => {
    return [...rawOptions].sort(() => Math.random() - 0.5);
  }, [rawOptions]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === correctAnswer;
    setTimeout(() => {
      onSelect(correct);
      setSelected(null);
      setAnswered(false);
    }, 800);
  };

  return (
    <View className="quiz-options">
      <View className="quiz-options-grid">
        {shuffled.map((option) => {
          let cls = "quiz-option";
          if (answered && option === correctAnswer) cls += " quiz-option-correct";
          if (answered && option === selected && option !== correctAnswer)
            cls += " quiz-option-wrong";

          return (
            <View
              key={option}
              className={cls}
              onClick={() => handleSelect(option)}
            >
              <Text className="quiz-option-text">
                {renderOption ? renderOption(option) : option}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
