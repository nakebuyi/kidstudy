"use client";

import { useChild } from "@/store/ChildContext";
import { PointsDisplay } from "@/components/dashboard/PointsDisplay";

export function MobileTopBar() {
  const { child, children, setCurrentChild } = useChild();

  return (
    <header className="h-12 border-b bg-white flex items-center justify-between px-3 shrink-0">
      <div className="flex items-center gap-2">
        {children.length > 1 && (
          <select
            className="text-sm border rounded px-2 py-1 bg-white"
            value={child?.id || ""}
            onChange={(e) => setCurrentChild(e.target.value)}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.avatar} {c.name}
              </option>
            ))}
          </select>
        )}
        {children.length <= 1 && child && (
          <span className="text-sm font-medium">{child.avatar} {child.name}</span>
        )}
      </div>
      {child && <PointsDisplay points={child.points} compact />}
    </header>
  );
}