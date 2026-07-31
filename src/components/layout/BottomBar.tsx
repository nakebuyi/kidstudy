const tips = [
  "千里之行，始于足下。",
  "学而时习之，不亦说乎。",
  "书山有路勤为径，学海无涯苦作舟。",
  "少壮不努力，老大徒伤悲。",
  "温故而知新，可以为师矣。",
];

export function BottomBar() {
  const tip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <footer className="h-10 border-t bg-white flex items-center justify-between px-4 text-sm text-gray-500 shrink-0">
      <span>💡 {tip}</span>
      <span>👁️ 记得休息一下眼睛哦~</span>
    </footer>
  );
}