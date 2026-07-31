interface PointsDisplayProps {
  points: number;
}

export function PointsDisplay({ points }: PointsDisplayProps) {
  return (
    <div className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2">
      <span className="text-sm font-medium text-gray-700">🌟 积分</span>
      <span className="text-lg font-bold text-orange-500">{points}</span>
    </div>
  );
}