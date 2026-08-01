"use client";

import { useLayout } from "@/components/layout/useLayout";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { MobileLayout } from "@/components/layout/MobileLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobile } = useLayout();

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return <DesktopLayout>{children}</DesktopLayout>;
}