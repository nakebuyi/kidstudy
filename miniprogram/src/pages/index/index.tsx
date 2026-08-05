import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { authStore } from "../../store/auth";
import "./index.scss";

export default function Index() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    async function bootstrap() {
      // 1. Try restoring an existing session
      const restored = authStore.restoreSession();

      if (restored) {
        // Session restored — go straight to dashboard
        Taro.switchTab({ url: "/pages/learning/dashboard/index" });
        return;
      }

      // 2. No session — perform WeChat login
      const result = await authStore.loginWithWechat();

      if (result.success) {
        Taro.switchTab({ url: "/pages/learning/dashboard/index" });
      } else {
        setStatus("error");
      }
    }

    bootstrap();
  }, []);

  if (status === "error") {
    return (
      <View className="launch-screen">
        <View className="launch-content">
          <Text className="launch-emoji">😢</Text>
          <Text className="launch-title">登录失败</Text>
          <Text className="launch-desc">请检查网络后重试</Text>
          <View
            className="launch-retry-btn"
            onClick={() => {
              setStatus("loading");
              authStore.loginWithWechat().then((res) => {
                if (res.success) {
                  Taro.switchTab({ url: "/pages/learning/dashboard/index" });
                } else {
                  setStatus("error");
                }
              });
            }}
          >
            <Text className="text-white font-bold">重新登录</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="launch-screen">
      <View className="launch-content">
        <Text className="launch-emoji">📚</Text>
        <Text className="launch-title">幼小衔接学习</Text>
        <Text className="launch-desc">正在进入学习平台...</Text>
      </View>
    </View>
  );
}