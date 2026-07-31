interface StreakDisplayProps {
  streak: number;
  maxStreak: number;
}

export function StreakDisplay({ streak, maxStreak }: StreakDisplayProps) {
  return (
    <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
      <span className="text-sm font-medium text-gray-700">🔥 连续打卡</span>
      <span className="text-lg font-bold text-blue-500">
        {streak}
        <span className="text-xs font-normal text-gray-400">/{maxStreak}</span>
      </span>
    </div>
  );
}