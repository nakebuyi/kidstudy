"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChild } from "@/store/ChildContext";
import { Menu } from "lucide-react";

const subjects = [
  { key: "literacy", label: "识字", icon: "📖", color: "bg-orange-100 text-orange-700", enabled: true },
  { key: "pinyin", label: "拼音", icon: "🔤", color: "bg-sky-100 text-sky-700", enabled: true },
  { key: "english", label: "英语", icon: "🌍", color: "bg-green-100 text-green-700", enabled: true },
  { key: "math", label: "算数", icon: "🧮", color: "bg-purple-100 text-purple-700", enabled: true },
  { key: "poetry", label: "古诗词", icon: "📜", color: "bg-red-100 text-red-700", enabled: true },
];

export function TopNav() {
  const pathname = usePathname();
  const { child } = useChild();

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {subjects.map((s) => (
                <DropdownMenuItem
                  key={s.key}
                  onClick={() => s.enabled && (window.location.href = `/learning/${s.key}`)}
                  className="cursor-pointer"
                >
                  {s.icon} {s.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => (window.location.href = "/games/pet")}
                className="cursor-pointer"
              >
                🐾 宠物
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => (window.location.href = "/games/shop")}
                className="cursor-pointer"
              >
                🛍️ 商城
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link href="/dashboard" className="text-lg md:text-xl font-bold text-orange-500">
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
              {s.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/parent" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">
          👤 家长中心
        </Link>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          退出
        </Button>
      </div>
    </header>
  );
}