import { View, Text } from "@tarojs/components";
import "./ShopItem.scss";

interface ShopItemProps {
  icon: string;
  name: string;
  desc: string;
  price: number;
  canAfford: boolean;
  buying: boolean;
  onBuy: () => void;
}

export function ShopItem({ icon, name, desc, price, canAfford, buying, onBuy }: ShopItemProps) {
  return (
    <View className={`shop-item ${!canAfford ? "shop-item-disabled" : ""}`}>
      <Text className="shop-item-icon">{icon}</Text>
      <Text className="shop-item-name">{name}</Text>
      <Text className="shop-item-desc">{desc}</Text>
      <View
        className={`shop-item-btn ${canAfford ? "shop-item-btn-active" : ""}`}
        onClick={canAfford ? onBuy : undefined}
      >
        <Text className="shop-item-btn-text">
          {buying ? "购买中..." : canAfford ? `🌟 ${price}` : `🌟 ${price} (积分不足)`}
        </Text>
      </View>
    </View>
  );
}
