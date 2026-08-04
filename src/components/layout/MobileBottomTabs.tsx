"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const tabs = [
  { key: "dashboard", label: "工作台", icon: "🏠", href: "/dashboard" },
  { key: "learning", label: "学习", icon: "📚", href: "/learning/literacy" },
  { key: "calendar", label: "日历", icon: "📅", href: "/dashboard/calendar" },
  { key: "parent", label: "家长", icon: "👤", href: "/parent" },
];

export function MobileBottomTabs() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session as any)?.role as string | undefined;

  const visibleTabs = role === "parent" ? tabs : tabs.filter((t) => t.key !== "parent");

  return (
    <nav className="h-14 border-t bg-white flex items-center justify-around shrink-0">
      {visibleTabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] ${
              isActive ? "text-orange-500" : "text-gray-400"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}