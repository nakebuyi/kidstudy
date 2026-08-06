import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, ChildData } from "../../../services/api";
import "./index.scss";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function Calendar() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const children = await api.getChildren();
      if (children && children.length > 0) {
        setChild(children[0]);
        const data = await api.getCalendar(children[0].id, "");
        // API returns CalendarDay[] — each with { date: string, checkedIn: boolean }
        const dates = data.map((d) => d.date);
        setAllDates(dates);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Filter dates for current month (client-side, no re-fetch needed)
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const checkinDates = allDates.filter((d) => d.startsWith(monthStr));

  if (loading) {
    return (
      <View className="calendar-page">
        <View className="page-loading"><Text className="page-loading-text">加载中...</Text></View>
      </View>
    );
  }

  return (
    <View className="calendar-page">
      {/* Back */}
      <View className="calendar-back" onClick={() => Taro.switchTab({ url: "/pages/learning/dashboard/index" })}>
        <Text className="calendar-back-text">‹ 返回工作台</Text>
      </View>

      {/* Month header */}
      <View className="calendar-header">
        <View className="calendar-nav" onClick={prevMonth}>
          <Text className="calendar-nav-arrow">‹</Text>
        </View>
        <Text className="calendar-nav-title">{year}年{month + 1}月</Text>
        <View className="calendar-nav" onClick={nextMonth}>
          <Text className="calendar-nav-arrow">›</Text>
        </View>
      </View>

      {/* Weekday labels */}
      <View className="calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <Text key={w} className="calendar-weekday">{w}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View className="calendar-grid">
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`empty-${i}`} className="calendar-day calendar-day-empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isCheckedIn = checkinDates.includes(dateStr);
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          let cls = "calendar-day";
          if (isCheckedIn) cls += " calendar-day-checked";
          if (isToday) cls += " calendar-day-today";
          if (isFuture) cls += " calendar-day-future";

          return (
            <View key={day} className={cls}>
              <Text className="calendar-day-text">
                {isCheckedIn ? "✅" : day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Stats */}
      <View className="calendar-stats">
        <View className="calendar-stat">
          <Text className="calendar-stat-value orange">{child?.streak ?? 0}</Text>
          <Text className="calendar-stat-label">连续打卡</Text>
        </View>
        <View className="calendar-stat">
          <Text className="calendar-stat-value blue">{child?.maxStreak ?? 0}</Text>
          <Text className="calendar-stat-label">最高纪录</Text>
        </View>
        <View className="calendar-stat">
          <Text className="calendar-stat-value green">{checkinDates.length}</Text>
          <Text className="calendar-stat-label">本月打卡</Text>
        </View>
      </View>
    </View>
  );
}