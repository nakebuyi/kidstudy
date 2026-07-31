"use client";

import { useChild } from "@/store/ChildContext";
import { PetDisplay } from "@/components/pet/PetDisplay";
import { PointsDisplay } from "@/components/dashboard/PointsDisplay";
import { StreakDisplay } from "@/components/dashboard/StreakDisplay";

export function Sidebar() {
  const { child } = useChild();

  if (!child) return null;

  const pet = JSON.parse(child.pet);

  return (
    <aside className="w-[240px] border-r bg-white flex flex-col items-center py-6 px-4 gap-4 shrink-0">
      <PetDisplay pet={pet} />
      <div className="w-full space-y-3">
        <PointsDisplay points={child.points} />
        <StreakDisplay streak={child.streak} maxStreak={child.maxStreak} />
        <div className="text-center text-sm text-gray-500">
          📅 累计打卡 {child.totalCheckIns} 天
        </div>
      </div>
    </aside>
  );
}