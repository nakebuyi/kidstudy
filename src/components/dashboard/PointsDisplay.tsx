interface PointsDisplayProps {
  points: number;
  compact?: boolean;
}

export function PointsDisplay({ points, compact }: PointsDisplayProps) {
  return (
    <div
      className={`flex items-center gap-1.5 bg-orange-50 rounded-lg ${
        compact ? "px-2 py-1" : "px-3 py-2 justify-between"
      }`}
    >
      <span className={`font-medium text-gray-700 ${compact ? "text-xs" : "text-sm"}`}>
        🌟 积分
      </span>
      <span className={`font-bold text-orange-500 ${compact ? "text-base" : "text-lg"}`}>
        {points}
      </span>
    </div>
  );
}