export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "food" | "toy" | "accessory" | "theme" | "frame";
  image: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}
