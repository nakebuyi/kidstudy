import { useEffect, useState } from "react";
import { View, Text, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, ChildData } from "../../../services/api";
import "./index.scss";

const AVATARS = [
  { key: "👦", label: "男孩" },
  { key: "👧", label: "女孩" },
];

export default function ParentChildren() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [childName, setChildName] = useState("");
  const [avatar, setAvatar] = useState("👦");
  const [saving, setSaving] = useState(false);

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

  async function handleAdd() {
    const name = childName.trim();
    if (!name) {
      Taro.showToast({ title: "请输入孩子姓名", icon: "none", duration: 2000 });
      return;
    }
    setSaving(true);
    try {
      await api.createChild(name, avatar);
      Taro.showToast({ title: "添加成功", icon: "success", duration: 1500 });
      setChildName("");
      setAvatar("👦");
      setShowForm(false);
      await loadChildren();
    } catch {
      Taro.showToast({ title: "添加失败", icon: "none", duration: 2000 });
    } finally {
      setSaving(false);
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

      {children.length === 0 && !showForm ? (
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

      {/* Add child form */}
      {showForm ? (
        <View className="parent-add-form">
          <Text className="parent-form-title">添加孩子</Text>

          {/* Name input */}
          <View className="parent-form-row">
            <Text className="parent-form-label">姓名</Text>
            <Input
              className="parent-form-input"
              type="text"
              placeholder="请输入孩子姓名"
              value={childName}
              onInput={(e) => setChildName(e.detail.value)}
            />
          </View>

          {/* Avatar picker */}
          <View className="parent-form-row">
            <Text className="parent-form-label">头像</Text>
            <View className="parent-avatar-picker">
              {AVATARS.map((a) => (
                <View
                  key={a.key}
                  className={`parent-avatar-option ${
                    avatar === a.key ? "parent-avatar-selected" : ""
                  }`}
                  onClick={() => setAvatar(a.key)}
                >
                  <Text className="parent-avatar-emoji">{a.key}</Text>
                  <Text className="parent-avatar-label">{a.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View className="parent-form-actions">
            <View
              className="parent-form-cancel"
              onClick={() => {
                setShowForm(false);
                setChildName("");
                setAvatar("👦");
              }}
            >
              <Text className="parent-form-cancel-text">取消</Text>
            </View>
            <View className="parent-form-confirm" onClick={handleAdd}>
              <Text className="parent-form-confirm-text">
                {saving ? "添加中..." : "确认添加"}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="parent-add-btn" onClick={() => setShowForm(true)}>
          <Text className="parent-add-btn-text">+ 添加孩子</Text>
        </View>
      )}
    </View>
  );
}