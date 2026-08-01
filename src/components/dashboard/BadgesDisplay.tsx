"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (stats: ChildStats) => boolean;
}

interface ChildStats {
  points: number;
  streak: number;
  totalCheckIns: number;
  maxStreak: number;
}

const badgeDefs: BadgeDef[] = [
  {
    id: "first_checkin",
    name: "初次打卡",
    icon: "🌟",
    description: "完成第一次打卡",
    check: (s) => s.totalCheckIns >= 1,
  },
  {
    id: "streak_3",
    name: "连续3天",
    icon: "🔥",
    description: "连续打卡3天",
    check: (s) => s.streak >= 3,
  },
  {
    id: "streak_7",
    name: "周冠军",
    icon: "👑",
    description: "连续打卡7天",
    check: (s) => s.streak >= 7,
  },
  {
    id: "streak_30",
    name: "月度之星",
    icon: "🏆",
    description: "连续打卡30天",
    check: (s) => s.maxStreak >= 30,
  },
  {
    id: "points_100",
    name: "积分达人",
    icon: "💰",
    description: "累计获得100积分",
    check: (s) => s.points >= 100,
  },
  {
    id: "points_500",
    name: "积分富豪",
    icon: "💎",
    description: "累计获得500积分",
    check: (s) => s.points >= 500,
  },
  {
    id: "checkin_10",
    name: "坚持10天",
    icon: "📅",
    description: "累计打卡10天",
    check: (s) => s.totalCheckIns >= 10,
  },
  {
    id: "checkin_50",
    name: "坚持50天",
    icon: "🎖️",
    description: "累计打卡50天",
    check: (s) => s.totalCheckIns >= 50,
  },
];

interface BadgesDisplayProps {
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
}

export function BadgesDisplay({ points, streak, maxStreak, totalCheckIns }: BadgesDisplayProps) {
  const stats: ChildStats = { points, streak, maxStreak, totalCheckIns };
  const earned = badgeDefs.filter((b) => b.check(stats));
  const locked = badgeDefs.filter((b) => !b.check(stats));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">🏅 成就徽章</CardTitle>
      </CardHeader>
      <CardContent>
        {earned.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {earned.map((b) => (
              <Tooltip key={b.id}>
                <TooltipTrigger>
                  <span className="text-2xl cursor-default">{b.icon}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        {locked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {locked.slice(0, 6).map((b) => (
              <Tooltip key={b.id}>
                <TooltipTrigger>
                  <span className="text-2xl opacity-30 cursor-default grayscale">{b.icon}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.description}</p>
                  <p className="text-xs text-orange-500">🔒 未解锁</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        {earned.length === 0 && locked.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">开始学习，解锁徽章！</p>
        )}
      </CardContent>
    </Card>
  );
}