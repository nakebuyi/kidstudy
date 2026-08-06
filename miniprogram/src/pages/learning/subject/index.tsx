import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useLearning } from "../../../hooks/useLearning";
import { authStore } from "../../../store/auth";
import { ProgressSteps, ContentCard } from "../../../components/learning";
import { LiteracyLearn, LiteracyQuiz } from "./steps/LiteracyStep";
import { PinyinLearn, PinyinQuiz } from "./steps/PinyinStep";
import { EnglishLearn, EnglishQuiz } from "./steps/EnglishStep";
import { MathLearn, MathQuiz } from "./steps/MathStep";
import { PoetryLearn, PoetryQuiz } from "./steps/PoetryStep";
import "./index.scss";
import "./steps/steps.scss";

const SUBJECT_META: Record<string, { name: string; emoji: string; color: string }> = {
  literacy: { name: "识字", emoji: "📖", color: "#F59E0B" },
  pinyin: { name: "拼音", emoji: "🔤", color: "#0EA5E9" },
  english: { name: "英语", emoji: "🌍", color: "#10B981" },
  math: { name: "算术", emoji: "🧮", color: "#A855F7" },
  poetry: { name: "古诗词", emoji: "📜", color: "#DC2626" },
};

const STEPS = ["学习", "测试"];

export default function Subject() {
  const { subject } = Taro.getCurrentInstance().router?.params || {};
  const meta = SUBJECT_META[subject as string];
  const user = authStore.getState().user;
  const childId = user?.currentChildId ?? "";

  const learning = useLearning(subject as string, childId);

  // Unknown subject
  if (!meta) {
    return (
      <View className="subject-page">
        <ContentCard>
          <View className="subject-empty">
            <Text className="subject-empty-text">未知科目</Text>
          </View>
        </ContentCard>
      </View>
    );
  }

  // Loading
  if (learning.state === "loading") {
    return (
      <View className="subject-page">
        <View className="subject-loading">
          <Text className="subject-loading-emoji">📚</Text>
          <Text className="subject-loading-text">正在准备学习内容...</Text>
        </View>
      </View>
    );
  }

  // Error
  if (learning.state === "error") {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-emoji">😢</Text>
          <Text className="subject-empty-text">内容加载失败</Text>
          <View className="step-next-btn" onClick={learning.retry}>
            <Text className="step-next-btn-text">重试</Text>
          </View>
        </View>
      </View>
    );
  }

  // All done
  if (learning.state === "complete") {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-emoji">🎉</Text>
          <Text className="subject-empty-text">学完了所有内容！</Text>
          <Text className="subject-empty-hint">太厉害了！继续保持哦~</Text>
          <View
            className="step-next-btn"
            onClick={() => Taro.switchTab({ url: "/pages/learning/dashboard/index" })}
          >
            <Text className="step-next-btn-text">返回工作台</Text>
          </View>
        </View>
      </View>
    );
  }

  // Day already checked in for this subject
  if (learning.todayTask?.completed) {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-emoji">✅</Text>
          <Text className="subject-empty-text">今日{meta.name}打卡已完成</Text>
          <Text className="subject-empty-hint">
            +{learning.todayTask.pointsEarned} 积分已入账
          </Text>
          <View
            className="step-next-btn"
            onClick={() => Taro.switchTab({ url: "/pages/learning/dashboard/index" })}
          >
            <Text className="step-next-btn-text">返回工作台</Text>
          </View>
        </View>
      </View>
    );
  }

  // No content
  if (!learning.currentItem) {
    return (
      <View className="subject-page">
        <View className="subject-empty">
          <Text className="subject-empty-text">暂无学习内容</Text>
        </View>
      </View>
    );
  }

  const stepIndex = learning.state === "learn" ? 0 : 1;

  // Render step content
  const renderStep = () => {
    const item = learning.currentItem!;
    const stepProps = {
      // item is ContentItem (generic); each step component specializes it at runtime
      item: item as any,
      onNext: learning.goToQuiz,
      onComplete: (correct: boolean) => learning.submitAnswer(correct),
    };

    if (learning.state === "learn") {
      switch (subject) {
        case "literacy": return <LiteracyLearn {...stepProps} />;
        case "pinyin": return <PinyinLearn {...stepProps} />;
        case "english": return <EnglishLearn {...stepProps} />;
        case "math": return <MathLearn {...stepProps} />;
        case "poetry": return <PoetryLearn {...stepProps} />;
      }
    } else {
      switch (subject) {
        case "literacy": return <LiteracyQuiz {...stepProps} />;
        case "pinyin": return <PinyinQuiz {...stepProps} />;
        case "english": return <EnglishQuiz {...stepProps} />;
        case "math": return <MathQuiz {...stepProps} />;
        case "poetry": return <PoetryQuiz {...stepProps} />;
      }
    }
  };

  return (
    <View className="subject-page">
      {/* Header */}
      <View className="subject-header">
        <Text className="subject-header-emoji">{meta.emoji}</Text>
        <Text className="subject-header-name">{meta.name}</Text>
        <Text className="subject-header-progress">
          {learning.currentIndex + 1} / {learning.items.length}
        </Text>
      </View>

      {/* Progress */}
      <ProgressSteps steps={STEPS} current={stepIndex} />

      {/* Content */}
      <View className="subject-content">
        {renderStep()}
      </View>
    </View>
  );
}
