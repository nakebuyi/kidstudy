"use client";

import { useEffect, useState } from "react";
import { useChild } from "@/store/ChildContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
  const { child } = useChild();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkInDates, setCheckInDates] = useState<string[]>([]);

  useEffect(() => {
    if (child) {
      fetch(`/api/checkin/calendar?childId=${child.id}`)
        .then((res) => res.json())
        .then((data) => setCheckInDates(data.dates ?? []))
        .catch(() => {});
    }
  }, [child]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">📅 打卡日历</h1>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-lg">
                {year}年{month + 1}月
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((w) => (
                <div key={w} className="text-center text-sm font-medium text-gray-500 py-2">
                  {w}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isCheckedIn = checkInDates.includes(dateStr);
                const isToday = dateStr === todayStr;
                const isFuture = dateStr > todayStr;

                return (
                  <div
                    key={day}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm ${
                      isCheckedIn
                        ? "bg-green-100 text-green-700 font-bold"
                        : isToday
                        ? "bg-orange-100 text-orange-700 font-bold ring-2 ring-orange-400"
                        : isFuture
                        ? "text-gray-300"
                        : "text-gray-500"
                    }`}
                  >
                    {isCheckedIn ? (
                      <span className="flex flex-col items-center">
                        <span className="text-xs">✅</span>
                        {day}
                      </span>
                    ) : (
                      day
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 打卡统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-500">{child?.streak ?? 0}</div>
                <div className="text-sm text-gray-500">连续打卡</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-500">{child?.maxStreak ?? 0}</div>
                <div className="text-sm text-gray-500">最高纪录</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-500">{checkInDates.length}</div>
                <div className="text-sm text-gray-500">本月打卡</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}