import { View } from "@tarojs/components";
import type { ReactNode } from "react";
import "./ContentCard.scss";

interface ContentCardProps {
  children: ReactNode;
  className?: string;
}

export function ContentCard({ children, className = "" }: ContentCardProps) {
  return (
    <View className={`content-card ${className}`}>
      {children}
    </View>
  );
}
