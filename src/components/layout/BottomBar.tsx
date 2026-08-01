"use client";

import { useEffect, useState, useRef } from "react";
import { useChild } from "@/store/ChildContext";

const tips = [
  "千里之行，始于足下。",
  "学而时习之，不亦说乎。",
  "书山有路勤为径，学海无涯苦作舟。",
  "少壮不努力，老大徒伤悲。",
  "温故而知新，可以为师矣。",
];

export function BottomBar() {
  const { child } = useChild();
  const [tipIndex, setTipIndex] = useState(0);
  const [eyeTime, setEyeTime] = useState(0);
  const [showBreak, setShowBreak] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const settings = child ? (() => {
    try {
      const pet = JSON.parse(child.pet);
      return pet.settings ?? { eyeCareInterval: 20, eyeCareBreak: 5 };
    } catch {
      return { eyeCareInterval: 20, eyeCareBreak: 5 };
    }
  })() : { eyeCareInterval: 20, eyeCareBreak: 5 };

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setEyeTime((t) => {
        const next = t + 1;
        if (next >= settings.eyeCareInterval * 60) {
          setShowBreak(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [settings.eyeCareInterval]);

  useEffect(() => {
    if (showBreak) {
      const timeout = setTimeout(() => setShowBreak(false), settings.eyeCareBreak * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [showBreak, settings.eyeCareBreak]);

  const remainingMinutes = Math.floor((settings.eyeCareInterval * 60 - eyeTime) / 60);
  const remainingSeconds = (settings.eyeCareInterval * 60 - eyeTime) % 60;

  return (
    <footer className="h-10 border-t bg-white flex items-center justify-between px-4 text-sm text-gray-500 shrink-0">
      <span>💡 {tips[tipIndex]}</span>
      {showBreak ? (
        <span className="text-orange-500 font-medium animate-pulse">
          ⏰ 休息一下！看看远处吧~
        </span>
      ) : (
        <span>
          👁️ 护眼倒计时：{remainingMinutes}:{String(remainingSeconds).padStart(2, "0")}
        </span>
      )}
    </footer>
  );
}