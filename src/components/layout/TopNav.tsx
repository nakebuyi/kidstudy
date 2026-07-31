"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useChild } from "@/store/ChildContext";

const subjects = [
  { key: "literacy", label: "识字", color: "bg-orange-100 text-orange-700", enabled: true },
  { key: "pinyin", label: "拼音", color: "bg-gray-100 text-gray-400", enabled: false },
  { key: "english", label: "英语", color: "bg-gray-100 text-gray-400", enabled: false },
  { key: "math", label: "算数", color: "bg-gray-100 text-gray-400", enabled: false },
  { key: "poetry", label: "古诗词", color: "bg-gray-100 text-gray-400", enabled: false },
];

export function TopNav() {
  const pathname = usePathname();
  const { child } = useChild();

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-xl font-bold text-orange-500">
          📚 幼小衔接
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {subjects.map((s) => (
            <Link
              key={s.key}
              href={s.enabled ? `/learning/${s.key}` : "#"}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                s.enabled
                  ? pathname.startsWith(`/learning/${s.key}`)
                    ? "bg-orange-100 text-orange-700"
                    : "hover:bg-gray-100"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              onClick={(e) => { if (!s.enabled) e.preventDefault(); }}
            >
              {s.label} {!s.enabled && "🔒"}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/parent" className="text-sm text-gray-600 hover:text-gray-900">
          👤 家长中心
        </Link>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          退出
        </Button>
      </div>
    </header>
  );
}