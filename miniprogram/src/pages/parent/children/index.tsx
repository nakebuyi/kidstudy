import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, ChildData } from "../../../services/api";
import "./index.scss";

export default function ParentChildren() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  async function loadChildren() {
    setLoading(true);
    try {
      const data = await api.getChildren();
      setChildren(data);
    } catch (err: any) {
      if (err.message !== "登录已过期") {
        Taro.showToast({ title: "加载失败", icon: "none", duration: 2000 });
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="parent-loading">
        <Text className="parent-loading-text">加载中...</Text>
      </View>
    );
  }

  return (
    <View className="parent-children">
      {/* Back to learning mode */}
      <View
        className="parent-back"
        onClick={() => Taro.switchTab({ url: "/pages/learning/settings/index" })}
      >
        <Text className="parent-back-text">‹ 返回学习模式</Text>
      </View>

      <Text className="parent-title">孩子管理</Text>

      {children.length === 0 ? (
        <View className="parent-empty">
          <Text className="parent-empty-text">还没有添加孩子</Text>
        </View>
      ) : (
        children.map((item) => (
          <View key={item.id} className="parent-child-card">
            <Text className="parent-child-avatar">{item.avatar || "👦"}</Text>
            <View className="parent-child-info">
              <Text className="parent-child-name">{item.name}</Text>
              <Text className="parent-child-stats">
                {item.points} 积分 · 连续 {item.streak} 天
              </Text>
            </View>
            <Text className="parent-child-arrow">›</Text>
          </View>
        ))
      )}

      {/* Add child */}
      <View
        className="parent-add-btn"
        onClick={() => {
          Taro.showToast({ title: "添加孩子功能即将上线", icon: "none", duration: 2000 });
        }}
      >
        <Text className="parent-add-btn-text">+ 添加孩子</Text>
      </View>
    </View>
  );
}