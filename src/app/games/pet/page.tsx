"use client";

import { useState } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getPetEmoji, getPetName } from "@/lib/points";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const petEmojis: Record<string, string> = {
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
};

const foodItems = [
  { name: "🐟 小鱼干", cost: 5, hunger: 20, desc: "美味的小鱼干" },
  { name: "🥩 肉骨头", cost: 10, hunger: 40, desc: "营养丰富的肉骨头" },
  { name: "🍰 宠物蛋糕", cost: 20, hunger: 80, desc: "豪华宠物蛋糕" },
];

export default function PetPage() {
  const { child, refreshChild } = useChild();
  const [feeding, setFeeding] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (!child) return null;

  const pet = JSON.parse(child.pet);
  const petEmoji = getPetEmoji(pet);

  const handleFeed = async (food: (typeof foodItems)[0]) => {
    if (!child) return;
    setFeeding(food.name);
    setMessage("");

    const res = await fetch("/api/pet/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: child.id, cost: food.cost }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`喂养成功！${pet.name}很开心~ 消耗 ${food.cost} 积分`);
      await refreshChild();
    } else {
      setMessage(data.error || "喂养失败");
    }
    setFeeding(null);
  };

  return (
    <DesktopLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">🐾 宠物养成</h1>
        </div>

        {/* Pet Display */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="text-8xl mb-4 animate-bounce">{petEmoji}</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{pet.name}</h2>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">{getPetName(pet)}</Badge>
              <Badge variant="outline">Lv.{pet.level}</Badge>
              <Badge
                variant={
                  pet.mood === "happy"
                    ? "default"
                    : pet.mood === "sad"
                    ? "destructive"
                    : "secondary"
                }
              >
                {pet.mood === "happy" ? "😊 开心" : pet.mood === "sad" ? "😢 难过" : "😐 一般"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pet Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 宠物状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>等级</span>
                <span className="font-medium">{pet.level} / 10</span>
              </div>
              <Progress value={(pet.level / 10) * 100} className="h-2" />
            </div>
            <div className="text-sm text-gray-500 text-center">
              坚持学习，让宠物和你一起成长！
            </div>
          </CardContent>
        </Card>

        {/* Feed Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🍽️ 喂养宠物</CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <div className="mb-4 p-3 rounded-lg bg-orange-50 text-orange-700 text-sm text-center">
                {message}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {foodItems.map((food) => (
                <Button
                  key={food.name}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleFeed(food)}
                  disabled={feeding === food.name || child.points < food.cost}
                >
                  <span className="text-2xl">{food.name.slice(0, 2)}</span>
                  <span className="text-xs font-medium">{food.name.slice(2)}</span>
                  <span className="text-xs text-gray-400">🌟 {food.cost}</span>
                </Button>
              ))}
            </div>
            <div className="text-center mt-3 text-sm text-gray-500">
              当前积分：🌟 {child.points}
            </div>
          </CardContent>
        </Card>
      </div>
    </DesktopLayout>
  );
}