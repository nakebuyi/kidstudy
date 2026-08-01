import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const parentPages = [
  { key: "report", title: "学习报告", icon: "📊", desc: "查看孩子的学习进度和成绩报告" },
  { key: "children", title: "孩子管理", icon: "👶", desc: "添加、切换和管理孩子档案" },
  { key: "settings", title: "学习设置", icon: "⚙️", desc: "设置每日学习目标和时间限制" },
];

export default function ParentPage() {
  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">👤 家长中心</h1>
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