"use client";

import { useState, useEffect } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, Clock, Target } from "lucide-react";
import Link from "next/link";

const subjectNames: Record<string, string> = {
  literacy: "📖 识字",
  pinyin: "🔤 拼音",
  english: "🌍 英语",
  math: "🧮 算数",
  poetry: "📜 古诗词",
};

export default function SettingsPage() {
  const { child, refreshChild } = useChild();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({
    dailyGoal: 5,
    screenTimeLimit: 60,
    eyeCareInterval: 20,
    eyeCareBreak: 5,
  });

  const handleSave = async () => {
    if (!child) return;
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: child.id, ...settings }),
    });

    if (res.ok) {
      setMessage("✅ 设置保存成功！");
      await refreshChild();
    } else {
      setMessage("❌ 保存失败");
    }
    setSaving(false);
  };

  return (
    <DesktopLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/parent">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">⚙️ 学习设置</h1>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-orange-50 text-orange-700 text-center">{message}</div>
        )}

        {/* Daily Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" /> 每日学习目标
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dailyGoal">每科每日学习数量</Label>
              <Input
                id="dailyGoal"
                type="number"
                min={1}
                max={20}
                value={settings.dailyGoal}
                onChange={(e) => setSettings({ ...settings, dailyGoal: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-500">建议：5-10 个/科</p>
            </div>
          </CardContent>
        </Card>

        {/* Screen Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" /> 使用时间限制
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="screenTime">每日使用时长（分钟）</Label>
              <Input
                id="screenTime"
                type="number"
                min={10}
                max={240}
                value={settings.screenTimeLimit}
                onChange={(e) =>
                  setSettings({ ...settings, screenTimeLimit: Number(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">建议：30-60分钟/天</p>
            </div>
          </CardContent>
        </Card>

        {/* Eye Care */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" /> 护眼设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval">提醒间隔（分钟）</Label>
                <Input
                  id="interval"
                  type="number"
                  min={5}
                  max={60}
                  value={settings.eyeCareInterval}
                  onChange={(e) =>
                    setSettings({ ...settings, eyeCareInterval: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="break">休息时长（分钟）</Label>
                <Input
                  id="break"
                  type="number"
                  min={1}
                  max={15}
                  value={settings.eyeCareBreak}
                  onChange={(e) =>
                    setSettings({ ...settings, eyeCareBreak: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              每学习{settings.eyeCareInterval}分钟，提醒休息{settings.eyeCareBreak}分钟
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
          <Save className="w-4 h-4" />
          {saving ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </DesktopLayout>
  );
}