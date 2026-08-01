"use client";

import { useEffect, useState } from "react";
import { useChild } from "@/store/ChildContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

const subjectIcons: Record<string, string> = {
  literacy: "📖",
  pinyin: "🔤",
  english: "🌍",
  math: "🧮",
  poetry: "📜",
};

const subjectNames: Record<string, string> = {
  literacy: "识字",
  pinyin: "拼音",
  english: "英语",
  math: "算数",
  poetry: "古诗词",
};

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

export default function TasksPage() {
  const { child, refreshChild } = useChild();
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchStatus = () => {
    if (!child) return;
    fetch(`/api/checkin?childId=${child.id}`)
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
  }, [child]);

  const handleComplete = async (task: CheckInTask) => {
    if (!child || task.completed) return;
    setCompleting(task.id);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: child.id, taskId: task.id }),
    });
    if (res.ok) {
      fetchStatus();
      refreshChild();
    }
    setCompleting(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">📝 今日打卡任务</h1>

        {status && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Progress
                  value={(status.completedCount / status.totalCount) * 100}
                  className="flex-1 h-3"
                />
                <Badge variant={status.allCompleted ? "default" : "secondary"} className="text-sm">
                  {status.completedCount}/{status.totalCount}
                </Badge>
              </div>
              {status.allCompleted && (
                <div className="text-center text-green-600 font-medium mb-4">
                  🎉 今日任务全部完成！额外奖励已发放！
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {status?.tasks.map((task) => (
            <Card
              key={task.id}
              className={`transition-all ${task.completed ? "border-green-200 bg-green-50/50" : ""}`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-3xl">{subjectIcons[task.subject] ?? "📚"}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">
                      {subjectNames[task.subject] ?? task.subject}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {task.taskType}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {task.completed ? `已完成 · +${task.pointsEarned} 积分` : "奖励 +10 积分"}
                  </div>
                </div>
                {task.completed ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" /> 已完成
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleComplete(task)}
                    disabled={completing === task.id}
                    className="gap-1"
                  >
                    {completing === task.id ? (
                      "完成中..."
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" /> 完成打卡
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {!status && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              正在加载今日任务...
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link href="/dashboard">
            <Button variant="outline">返回工作台</Button>
          </Link>
        </div>
      </div>
  );
}