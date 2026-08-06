import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import { authStore } from "../../../store/auth";
import { api } from "../../../services/api";
import { ContentCard } from "../../../components/learning";
import "./index.scss";

const subjectNames: Record<string, string> = {
  literacy: "📖 识字", pinyin: "🔤 拼音", english: "🌍 英语",
  math: "🧮 算术", poetry: "📜 古诗词",
};

interface ReportData {
  child: { name: string; points: number; streak: number };
  today: { completedCount: number; totalCount: number; allCompleted: boolean } | null;
  week: {
    subjectProgress: Record<string, { completed: number; total: number }>;
    dailyTrend: { date: string; completed: number; total: number; allCompleted: boolean }[];
    weakSubjects: string[];
    totalLearningRecords: number;
  };
}

export default function ParentReport() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authStore.getState().user;
    const childId = user?.currentChildId;
    if (childId) {
      api.getReport(childId).then(setReport).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <View className="report-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  if (!report) {
    return (
      <View className="report-page">
        <View className="page-empty"><Text className="page-empty-text">暂无数据</Text></View>
      </View>
    );
  }

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <View className="report-page">
      {/* Today Summary */}
      <ContentCard>
        <Text className="report-section-title">📋 今日学习概况</Text>
        {report.today ? (
          <View className="report-stats-grid">
            <View className="report-stat">
              <Text className="report-stat-value orange">
                {report.today.completedCount}/{report.today.totalCount}
              </Text>
              <Text className="report-stat-label">完成打卡</Text>
            </View>
            <View className="report-stat">
              <Text className="report-stat-value blue">{report.child.streak}</Text>
              <Text className="report-stat-label">连续打卡</Text>
            </View>
            <View className="report-stat">
              <Text className="report-stat-value green">{report.child.points}</Text>
              <Text className="report-stat-label">当前积分</Text>
            </View>
          </View>
        ) : (
          <Text className="report-empty-hint">今天还没有学习记录</Text>
        )}
      </ContentCard>

      {/* Subject Progress */}
      <ContentCard>
        <Text className="report-section-title">📈 本周各科进度</Text>
        {Object.entries(report.week.subjectProgress).map(([subject, progress]) => (
          <View key={subject} className="report-progress-row">
            <View className="report-progress-header">
              <Text className="report-progress-name">{subjectNames[subject] ?? subject}</Text>
              <Text className="report-progress-count">
                {progress.completed}/{progress.total}
              </Text>
            </View>
            <View className="report-progress-bar">
              <View
                className="report-progress-fill"
                style={{
                  width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                }}
              />
            </View>
          </View>
        ))}
      </ContentCard>

      {/* Weak Subjects */}
      {report.week.weakSubjects.length > 0 && (
        <View className="report-weak-alert">
          <Text>⚠️ 薄弱科目：{report.week.weakSubjects.map((s) => subjectNames[s] ?? s).join("、")}，建议加强练习</Text>
        </View>
      )}

      {/* Daily Trend */}
      <ContentCard>
        <Text className="report-section-title">📅 本周学习趋势</Text>
        {report.week.dailyTrend.length === 0 ? (
          <Text className="report-empty-hint">本周暂无学习记录</Text>
        ) : (
          report.week.dailyTrend.map((day) => {
            const d = new Date(day.date);
            const label = `${d.getMonth() + 1}/${d.getDate()} 周${weekdays[d.getDay()]}`;
            return (
              <View key={day.date} className="report-trend-row">
                <Text className="report-trend-date">{label}</Text>
                <View className="report-trend-bar">
                  <View
                    className="report-trend-fill"
                    style={{ width: `${(day.completed / day.total) * 100}%` }}
                  />
                </View>
                <Text className="report-trend-count">
                  {day.completed}/{day.total}
                  {day.allCompleted ? " 🎉" : ""}
                </Text>
              </View>
            );
          })
        )}
      </ContentCard>
    </View>
  );
}
