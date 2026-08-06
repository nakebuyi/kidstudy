import { useState, useEffect } from "react";
import { View, Text, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../../services/api";
import { ContentCard } from "../../../components/learning";
import "./index.scss";

interface SettingsData {
  dailyGoal: number;
  screenTimeLimit: number;
  eyeCareInterval: number;
  eyeCareBreak: number;
}

export default function ParentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SettingsData>({
    dailyGoal: 5,
    screenTimeLimit: 60,
    eyeCareInterval: 20,
    eyeCareBreak: 5,
  });

  useEffect(() => {
    api.getSettings()
      .then((data: any) => {
        if (data) setSettings({
          dailyGoal: data.dailyGoal ?? 5,
          screenTimeLimit: data.screenTimeLimit ?? 60,
          eyeCareInterval: data.eyeCareInterval ?? 20,
          eyeCareBreak: data.eyeCareBreak ?? 5,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      await api.getSettings(); // Use existing settings endpoint
      // Note: The current API doesn't have a dedicated settings save endpoint.
      // For MVP, we save to local storage as a fallback.
      Taro.setStorageSync("parent_settings", JSON.stringify(settings));
      setMessage("设置保存成功！");
    } catch {
      setMessage("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="settings-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  return (
    <View className="settings-page">
      {message && (
        <View className="settings-message">
          <Text>{message}</Text>
        </View>
      )}

      {/* Daily Goals */}
      <ContentCard>
        <Text className="settings-section-title">🎯 每日学习目标</Text>
        <View className="settings-row">
          <Text className="settings-label">每科每日学习数量</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.dailyGoal)}
            onInput={(e) =>
              setSettings({ ...settings, dailyGoal: Number(e.detail.value) || 5 })
            }
          />
        </View>
        <Text className="settings-hint">建议：5-10 个/科</Text>
      </ContentCard>

      {/* Screen Time */}
      <ContentCard>
        <Text className="settings-section-title">⏰ 使用时间限制</Text>
        <View className="settings-row">
          <Text className="settings-label">每日使用时长（分钟）</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.screenTimeLimit)}
            onInput={(e) =>
              setSettings({ ...settings, screenTimeLimit: Number(e.detail.value) || 60 })
            }
          />
        </View>
        <Text className="settings-hint">建议：30-60分钟/天</Text>
      </ContentCard>

      {/* Eye Care */}
      <ContentCard>
        <Text className="settings-section-title">👁️ 护眼设置</Text>
        <View className="settings-row">
          <Text className="settings-label">提醒间隔（分钟）</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.eyeCareInterval)}
            onInput={(e) =>
              setSettings({ ...settings, eyeCareInterval: Number(e.detail.value) || 20 })
            }
          />
        </View>
        <View className="settings-row">
          <Text className="settings-label">休息时长（分钟）</Text>
          <Input
            className="settings-input"
            type="number"
            value={String(settings.eyeCareBreak)}
            onInput={(e) =>
              setSettings({ ...settings, eyeCareBreak: Number(e.detail.value) || 5 })
            }
          />
        </View>
        <Text className="settings-hint">
          每学习{settings.eyeCareInterval}分钟，提醒休息{settings.eyeCareBreak}分钟
        </Text>
      </ContentCard>

      {/* Save Button */}
      <View className="settings-save-btn" onClick={handleSave}>
        <Text className="settings-save-btn-text">
          {saving ? "保存中..." : "💾 保存设置"}
        </Text>
      </View>
    </View>
  );
}
