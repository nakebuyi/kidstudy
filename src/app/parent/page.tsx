"use client";

import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const parentPages = [
  { key: "report", title: "学习报告", icon: "📊", desc: "查看孩子的学习进度和成绩报告" },
  { key: "children", title: "孩子管理", icon: "👶", desc: "添加、切换和管理孩子档案" },
  { key: "settings", title: "学习设置", icon: "⚙️", desc: "设置每日学习目标和时间限制" },
];

export default function ParentPage() {
  const { children } = useChild();

  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">👤 家长中心</h1>

        {/* Child List */}
        {children.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">👶 我的孩子</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {children.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-3xl">{c.avatar}</span>
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-gray-500">
                        🌟 {c.points} 积分 · 🔥 {c.streak} 天
                      </div>
                    </div>
                    <Link href={`/parent/children`}>
                      <Button variant="outline" size="sm">管理</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {parentPages.map((p) => (
            <Link key={p.key} href={`/parent/${p.key}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <span className="text-4xl">{p.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800 text-lg">{p.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{p.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DesktopLayout>
  );
}
