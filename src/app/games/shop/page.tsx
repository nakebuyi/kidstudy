"use client";

import { useState } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Check } from "lucide-react";
import Link from "next/link";

const shopItems = [
  { id: "food1", name: "小鱼干", icon: "🐟", price: 10, type: "food", desc: "喂宠物+20饱食度" },
  { id: "food2", name: "肉骨头", icon: "🦴", price: 20, type: "food", desc: "喂宠物+40饱食度" },
  { id: "food3", name: "宠物蛋糕", icon: "🍰", price: 30, type: "food", desc: "喂宠物+80饱食度" },
  { id: "acc1", name: "蝴蝶结", icon: "🎀", price: 50, type: "accessory", desc: "给宠物戴上蝴蝶结" },
  { id: "acc2", name: "小帽子", icon: "🎩", price: 80, type: "accessory", desc: "给宠物戴上帽子" },
  { id: "acc3", name: "太阳镜", icon: "🕶️", price: 100, type: "accessory", desc: "酷酷的太阳镜" },
  { id: "theme1", name: "星空主题", icon: "🌌", price: 150, type: "theme", desc: "深蓝色星空背景" },
  { id: "theme2", name: "花园主题", icon: "🌺", price: 150, type: "theme", desc: "粉色花园背景" },
  { id: "frame1", name: "金色头像框", icon: "🟡", price: 200, type: "frame", desc: "闪亮的金色边框" },
  { id: "frame2", name: "彩虹头像框", icon: "🌈", price: 200, type: "frame", desc: "七彩边框" },
];

export default function ShopPage() {
  const { child, refreshChild } = useChild();
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (!child) return null;

  const handleBuy = async (item: (typeof shopItems)[0]) => {
    if (!child || child.points < item.price) return;
    setBuying(item.id);
    setMessage("");

    const res = await fetch("/api/shop/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: child.id, itemId: item.id, price: item.price }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`✅ 购买成功！获得 ${item.name}！`);
      await refreshChild();
    } else {
      setMessage(`❌ ${data.error || "购买失败"}`);
    }
    setBuying(null);
  };

  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> 返回
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">🛍️ 积分商城</h1>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            🌟 {child.points} 积分
          </Badge>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-orange-50 text-orange-700 text-center">{message}</div>
        )}

        {(["food", "accessory", "theme", "frame"] as const).map((category) => {
          const items = shopItems.filter((i) => i.type === category);
          const categoryNames: Record<string, string> = {
            food: "🍽️ 宠物食物",
            accessory: "💎 宠物装扮",
            theme: "🎨 工作台主题",
            frame: "🖼️ 头像框",
          };

          return (
            <div key={category}>
              <h2 className="text-lg font-bold text-gray-700 mb-3">{categoryNames[category]}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <span className="text-4xl">{item.icon}</span>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                      <Button
                        size="sm"
                        variant={child.points >= item.price ? "default" : "outline"}
                        className="w-full gap-1"
                        onClick={() => handleBuy(item)}
                        disabled={buying === item.id || child.points < item.price}
                      >
                        {buying === item.id ? (
                          "购买中..."
                        ) : child.points >= item.price ? (
                          <>
                            <ShoppingCart className="w-3 h-3" /> 🌟 {item.price}
                          </>
                        ) : (
                          `🌟 ${item.price} (积分不足)`
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DesktopLayout>
  );
}