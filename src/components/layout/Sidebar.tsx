"use client";

import { useSession } from "next-auth/react";
import { useChild } from "@/store/ChildContext";
import { PetDisplay } from "@/components/pet/PetDisplay";
import { PointsDisplay } from "@/components/dashboard/PointsDisplay";
import { StreakDisplay } from "@/components/dashboard/StreakDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function Sidebar() {
  const { data: session } = useSession();
  const role = (session as any)?.role as string | undefined;
  const { child, children, setCurrentChild } = useChild();

  if (!child) return null;

  const pet = JSON.parse(child.pet);

  return (
    <aside className="w-[240px] border-r bg-white flex flex-col items-center py-6 px-4 gap-4 shrink-0">
      {/* Child Selector */}
      {role === "parent" && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            <span className="text-lg">{child.avatar}</span>
            {child.name}
            <ChevronDown className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {children.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => setCurrentChild(c.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span>{c.avatar}</span>
                <span>{c.name}</span>
                {c.id === child.id && <span className="ml-auto text-xs text-orange-500">当前</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => (window.location.href = "/parent/children")}
              className="cursor-pointer text-gray-500"
            >
              + 管理孩子
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {role === "child" && (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className="text-lg">{child.avatar}</span>
          {(session as any)?.nickname || child.name}
        </div>
      )}

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