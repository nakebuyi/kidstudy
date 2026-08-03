"use client";

import { use, useEffect, useState } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

const subjectNames: Record<string, { title: string; icon: string }> = {
  literacy: { title: "识字", icon: "📖" },
  pinyin: { title: "拼音", icon: "🔤" },
  english: { title: "英语", icon: "🌍" },
  math: { title: "算数", icon: "🧮" },
  poetry: { title: "古诗词", icon: "📜" },
};

interface ResultItem {
  id: string;
  charId: string;
  correct: boolean;
  prompt: string;
  correctAnswer?: string;
}

interface SubjectResult {
  subject: string;
  date: string;
  total: number;
  correctCount: number;
  items: ResultItem[];
}

export default function SubjectResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { subject } = use(params);
  const { date } = use(searchParams);
  const { child } = useChild();
  const [result, setResult] = useState<SubjectResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!child) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const qs = new URLSearchParams({ childId: child.id, subject });
    if (date) qs.set("date", date);
    fetch(`/api/learning/record?${qs}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) setResult(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [child, subject, date]);

  const info = subjectNames[subject] ?? { title: subject, icon: "📚" };
  const ratio = result && result.total > 0 ? result.correctCount / result.total : 0;

  return (
    <DesktopLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">
            {info.icon} {info.title} · 今日答题结果
          </h1>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              正在加载答题记录...
            </CardContent>
          </Card>
        )}

        {!loading && result && (
          <>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-gray-800 mb-1">
                  {result.correctCount} / {result.total}
                </div>
                <p className="text-gray-500">答对 / 总题数</p>
                {result.total > 0 && (
                  <div className="mt-3">
                    <Badge variant={ratio >= 0.8 ? "default" : "secondary"} className="text-sm">
                      {ratio >= 0.8 ? "🌟 很棒" : "继续加油"}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              {result.items.map((item, i) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-sm text-gray-400">{i + 1}</span>
                      <span className="flex-1 font-medium text-gray-800">{item.prompt}</span>
                      {item.correct ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="w-3 h-3" /> 正确
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <X className="w-3 h-3" /> 错误
                        </Badge>
                      )}
                    </div>
                    {!item.correct && item.correctAnswer !== undefined && (
                      <div className="mt-2 pl-9 text-sm text-gray-500">
                        正确答案：<span className="text-gray-700 font-medium">{item.correctAnswer}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {result.items.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    今日暂无该科目的答题记录
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </DesktopLayout>
  );
}
