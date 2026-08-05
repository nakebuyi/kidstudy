import { View, Text } from "@tarojs/components";
import "./ProgressSteps.scss";

interface ProgressStepsProps {
  steps: string[];
  current: number; // 0-indexed
}

export function ProgressSteps({ steps, current }: ProgressStepsProps) {
  return (
    <View>
      {/* Step circles */}
      <View className="progress-circles">
        {steps.map((_, i) => (
          <View key={i} className="progress-circle-row">
            <View
              className={`progress-circle ${
                i < current
                  ? "progress-circle-done"
                  : i === current
                  ? "progress-circle-active"
                  : "progress-circle-pending"
              }`}
            >
              <Text className="progress-circle-text">
                {i < current ? "✓" : i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                className={`progress-line ${
                  i < current ? "progress-line-done" : ""
                }`}
              />
            )}
          </View>
        ))}
      </View>
      {/* Labels */}
      <View className="progress-labels">
        {steps.map((label, i) => (
          <Text
            key={i}
            className={`progress-label ${
              i === current ? "progress-label-active" : ""
            }`}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
