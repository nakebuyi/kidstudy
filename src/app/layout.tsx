import type { Metadata } from "next";
import { AppProvider } from "@/store/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "幼小衔接学习平台",
  description: "幼小衔接在线学习平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-orange-50/30 antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}