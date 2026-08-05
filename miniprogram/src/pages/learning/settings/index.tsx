import { useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { PinDialog } from "../../../components/settings/PinDialog";
import { authStore } from "../../../store/auth";
import "./index.scss";

export default function Settings() {
  const [showPin, setShowPin] = useState(false);
  const user = authStore.getState().user;

  return (
    <View className="settings-page">
      {/* Profile */}
      <View className="settings-profile">
        <View className="settings-avatar">
          <Text>👦</Text>
        </View>
        <View className="settings-profile-info">
          <Text className="settings-profile-name">
            {user?.nickname || "小朋友"}
          </Text>
          <Text className="settings-profile-role">学习模式</Text>
        </View>
      </View>

      {/* Menu */}
      <View className="settings-menu">
        {/* Parent entry */}
        <View
          className="settings-menu-item"
          onClick={() => setShowPin(true)}
        >
          <View className="settings-menu-left">
            <Text className="settings-menu-icon">👨‍👩‍👧</Text>
            <Text className="settings-menu-label">家长管理</Text>
          </View>
          <Text className="settings-menu-arrow">›</Text>
        </View>
      </View>

      {/* Logout */}
      <View className="settings-logout">
        <View
          onClick={() => {
            authStore.logout();
            Taro.reLaunch({ url: "/pages/index/index" });
          }}
        >
          <Text className="settings-logout-text">退出登录</Text>
        </View>
      </View>

      {/* PIN Dialog */}
      <PinDialog
        visible={showPin}
        onClose={() => setShowPin(false)}
        onSuccess={() => {
          setShowPin(false);
          // Switch to parent mode tabs — but parent mode uses subpackages, not tab bar
          Taro.navigateTo({ url: "/pages/parent/children/index" });
        }}
      />
    </View>
  );
}