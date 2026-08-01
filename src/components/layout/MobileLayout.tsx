"use client";

import { MobileTopBar } from "./MobileTopBar";
import { MobileBottomTabs } from "./MobileBottomTabs";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <MobileTopBar />
      <main className="flex-1 overflow-auto p-4">{children}</main>
      <MobileBottomTabs />
    </div>
  );
}