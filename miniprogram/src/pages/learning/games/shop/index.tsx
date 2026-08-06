import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import { api, ChildData } from "../../../../services/api";
import { ShopItem } from "../../../../components/games/ShopItem";
import "./index.scss";

const SHOP_ITEMS = [
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

const CATEGORIES: Record<string, string> = {
  food: "🍽️ 宠物食物",
  accessory: "💎 宠物装扮",
  theme: "🎨 工作台主题",
  frame: "🖼️ 头像框",
};

export default function Shop() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadChild();
  }, []);

  async function loadChild() {
    try {
      const children = await api.getChildren();
      if (children?.length > 0) setChild(children[0]);
    } catch { /* handled by request() */ }
    finally { setLoading(false); }
  }

  async function handleBuy(item: (typeof SHOP_ITEMS)[0]) {
    setBuying(item.id);
    setMessage("");
    try {
      await api.buyItem(item.id);
      setMessage(`购买成功！获得 ${item.name}！`);
      await loadChild();
    } catch {
      setMessage("购买失败，请重试");
    } finally {
      setBuying(null);
    }
  }

  if (loading) {
    return (
      <View className="shop-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  if (!child) {
    return (
      <View className="shop-page">
        <View className="page-empty"><Text className="page-empty-text">还没有添加孩子</Text></View>
      </View>
    );
  }

  const itemTypes = ["food", "accessory", "theme", "frame"] as const;

  return (
    <View className="shop-page">
      {/* Points header */}
      <View className="shop-header">
        <Text className="shop-header-text">🌟 {child.points} 积分</Text>
      </View>

      {message && (
        <View className="shop-message">
          <Text>{message}</Text>
        </View>
      )}

      {itemTypes.map((type) => {
        const items = SHOP_ITEMS.filter((i) => i.type === type);
        return (
          <View key={type} className="shop-category">
            <Text className="shop-category-title">{CATEGORIES[type]}</Text>
            <View className="shop-items-grid">
              {items.map((item) => (
                <ShopItem
                  key={item.id}
                  icon={item.icon}
                  name={item.name}
                  desc={item.desc}
                  price={item.price}
                  canAfford={child.points >= item.price}
                  buying={buying === item.id}
                  onBuy={() => handleBuy(item)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
