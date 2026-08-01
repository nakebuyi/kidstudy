"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface WritingCanvasProps {
  character: string;
  width?: number;
  height?: number;
  onDraw?: (hasContent: boolean) => void;
}

export function WritingCanvas({ character, width = 300, height = 300, onDraw }: WritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const drawReference = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.font = (width * 0.5) + "px KaiTi, STKaiti, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillText(character, width / 2, height / 2);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(width, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(width, 0); ctx.lineTo(0, height); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }, [character, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);
    drawReference(ctx);
  }, [width, height, drawReference]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    if (!hasDrawn) { setHasDrawn(true); onDraw?.(true); }
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    if (!pos || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    lastPos.current = pos;
  };

  const stopDrawing = () => { setIsDrawing(false); lastPos.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawReference(ctx);
    setHasDrawn(false);
    onDraw?.(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          className="border-2 border-orange-200 rounded-2xl bg-white cursor-crosshair touch-none shadow-inner"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-orange-300 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-orange-300 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-orange-300 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-orange-300 rounded-br-xl pointer-events-none" />
      </div>
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1">
          <Eraser className="w-4 h-4" />
          清除重写
        </Button>
        {hasDrawn && (
          <span className="text-xs text-orange-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            书写中
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 text-center">
        在米字格中描红汉字{" "}
        <strong className="text-orange-500">{character}</strong>
      </p>
    </div>
  );
}
