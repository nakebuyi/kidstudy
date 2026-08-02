"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useChild } from "@/store/ChildContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BadgesDisplay } from "@/components/dashboard/BadgesDisplay";
import Link from "next/link";

const subjects = [
  {
    key: "literacy",
    label: "识字",
    icon: "📖",
    enabled: true,
  },
  {
    key: "pinyin",
    label: "拼音",
    icon: "🔤",
    enabled: true,
  },
  {
    key: "english",
    label: "英语",
    icon: "🌍",
    enabled: true,
  },
  {
    key: "math",
    label: "算数",
    icon: "🧮",
    enabled: true,
  },
  {
    key: "poetry",
    label: "古诗词",
    icon: "📜",
    enabled: true,
  },
];

const tips = [
  "每天学习一点点，进步一大步！",
  "加油！你是最棒的！",
  "学习使人快乐，坚持就是胜利！",
  "今天也要开开心心地学习哦~",
  "一分耕耘，一分收获！",
];

interface CheckInTask {
  id: string;
  subject: string;
  taskType: string;
  completed: boolean;
  pointsEarned: number;
}

interface CheckInStatus {
  tasks: CheckInTask[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  bonusEarned: boolean;
}

export default function DashboardPage() {
  const { child } = useChild();
  const { data: session } = useSession();
  const displayName = (session as any)?.nickname || child?.name || "";
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);

  useEffect(() => {
    if (child) {
      fetch(`/api/checkin?childId=${child.id}`)
        .then((res) => res.json())
        .then(setCheckInStatus)
        .catch(() => {});
    }
  }, [child]);

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[today.getDay()];
  const tip = tips[today.getDay() % tips.length];

  const completedCount = checkInStatus?.completedCount ?? 0;
  const totalCount = checkInStatus?.totalCount ?? 5;
  const taskMap = new Map<string, CheckInTask>();
  checkInStatus?.tasks.forEach((t) => taskMap.set(t.subject, t));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {child ? `${displayName}，早上好！` : "欢迎回来！"}
            </h1>
            <p className="text-gray-500 mt-1">
              {dateStr} 星期{weekday} · {tip}
            </p>
          </div>
          <div className="text-5xl">🌤️</div>
        </div>

        {/* Today's Tasks Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">📋 今日打卡任务</CardTitle>
              <Badge variant={checkInStatus?.allCompleted ? "default" : "secondary"}>
                {completedCount}/{totalCount} 完成
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={(completedCount / totalCount) * 100} className="h-2 mb-4" />
            <div className="grid grid-cols-5 gap-3">
              {subjects.map((s) => {
                const task = taskMap.get(s.key);
                const isCompleted = task?.completed ?? false;

                return (
                  <Link
                    key={s.key}
                    href={s.enabled ? `/learning/${s.key}` : "#"}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      isCompleted
                        ? "border-green-300 bg-green-50"
                        : s.enabled
                        ? "border-orange-200 bg-orange-50 hover:shadow-md cursor-pointer"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                    }`}
                    onClick={(e) => {
                      if (!s.enabled) e.preventDefault();
                    }}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{s.label}</span>
                    <span className={`text-xs ${isCompleted ? "text-green-500" : "text-gray-400"}`}>
                      {isCompleted ? "✅ 已完成" : "待完成"}
                    </span>
                  </Link>
                );
              })}
            </div>
            {checkInStatus?.allCompleted && (
              <div className="mt-4 text-center text-green-600 font-medium">
                🎉 太棒了！今日任务全部完成！额外奖励 +10 积分！
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/dashboard/tasks">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">📝</span>
                <div>
                  <div className="font-medium text-gray-800">今日任务</div>
                  <div className="text-sm text-gray-500">查看打卡详情</div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/rewards">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">🎁</span>
                <div>
                  <div className="font-medium text-gray-800">积分商城</div>
                  <div className="text-sm text-gray-500">兑换装扮和道具</div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/calendar">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">📅</span>
                <div>
                  <div className="font-medium text-gray-800">打卡日历</div>
                  <div className="text-sm text-gray-500">查看打卡记录</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Badges */}
        {child && (
          <BadgesDisplay
            points={child.points}
            streak={child.streak}
            maxStreak={child.maxStreak}
            totalCheckIns={child.totalCheckIns}
          />
        )}
      </div>
  );
}