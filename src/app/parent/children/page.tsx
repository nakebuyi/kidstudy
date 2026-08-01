"use client";

import { useState } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";

export default function ChildrenPage() {
  const { child, children, setCurrentChild, refreshChildren } = useChild();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      setShowAdd(false);
      await refreshChildren();
    }
    setLoading(false);
  };

  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">👶 孩子管理</h1>
          <Button onClick={() => setShowAdd(!showAdd)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            添加孩子
          </Button>
        </div>

        {showAdd && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleAddChild} className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="childName">孩子姓名</Label>
                  <Input
                    id="childName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="请输入孩子姓名"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "添加中..." : "添加"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((c) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                child?.id === c.id ? "ring-2 ring-orange-400" : ""
              }`}
              onClick={() => setCurrentChild(c.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-4xl">{c.avatar}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg">{c.name}</span>
                    {child?.id === c.id && (
                      <Badge variant="default" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        当前
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    🌟 {c.points} 积分 · 🔥 {c.streak} 天
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {children.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              还没有添加孩子，点击上方按钮添加
            </CardContent>
          </Card>
        )}
      </div>
    </DesktopLayout>
  );
}