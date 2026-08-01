"use client";

import { useEffect, useState } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

const subjectNames: Record<string, string> = {
  literacy: "📖 识字",
  pinyin: "🔤 拼音",
  english: "🌍 英语",
  math: "🧮 算数",
  poetry: "📜 古诗词",
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

export default function ReportPage() {
  const { child } = useChild();
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    if (child) {
      fetch(`/api/report?childId=${child.id}`)
        .then((res) => res.json())
        .then(setReport)
        .catch(() => {});
    }
  }, [child]);

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/parent">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">📊 学习报告</h1>
        </div>

        {!report && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">加载中...</CardContent>
          </Card>
        )}

        {report && (
          <>
            {/* Today's Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 今日学习概况</CardTitle>
              </CardHeader>
              <CardContent>
                {report.today ? (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-500">
                        {report.today.completedCount}/{report.today.totalCount}
                      </div>
                      <div className="text-sm text-gray-500">完成打卡</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-500">
                        {report.child.streak}
                      </div>
                      <div className="text-sm text-gray-500">连续打卡</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-500">
                        {report.child.points}
                      </div>
                      <div className="text-sm text-gray-500">当前积分</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">今天还没有学习记录</p>
                )}
              </CardContent>
            </Card>

            {/* Subject Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📈 本周各科进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(report.week.subjectProgress).map(([subject, progress]) => (
                  <div key={subject}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        {subjectNames[subject] ?? subject}
                      </span>
                      <span className="text-gray-500">
                        {progress.completed}/{progress.total} 完成
                      </span>
                    </div>
                    <Progress
                      value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weak Subject Alert */}
            {report.week.weakSubjects.length > 0 && (
              <Card className="border-orange-300 bg-orange-50">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-orange-700">薄弱科目提醒</div>
                    <div className="text-sm text-orange-600">
                      以下科目本周完成率较低，建议加强练习：
                      {report.week.weakSubjects.map((s) => subjectNames[s] ?? s).join("、")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📅 本周学习趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.week.dailyTrend.map((day) => {
                    const d = new Date(day.date);
                    const dayLabel = `${d.getMonth() + 1}/${d.getDate()} 周${weekdays[d.getDay()]}`;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-24 shrink-0">{dayLabel}</span>
                        <Progress
                          value={(day.completed / day.total) * 100}
                          className="flex-1 h-2"
                        />
                        <span className="text-sm font-medium w-16 text-right">
                          {day.completed}/{day.total}
                        </span>
                        {day.allCompleted && (
                          <Badge variant="default" className="text-xs">🎉</Badge>
                        )}
                      </div>
                    );
                  })}
                  {report.week.dailyTrend.length === 0 && (
                    <p className="text-gray-500 text-center py-4">本周暂无学习记录</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DesktopLayout>
  );
}