import { useEffect, useMemo, useRef, useState } from 'react';
import type { StockQuote } from '../../../shared/types';

interface FishCanvasProps {
  stocks: StockQuote[];
  selectedSymbol?: string;
  searchTerm: string;
  paused: boolean;
  onSelect: (stock: StockQuote) => void;
}

interface FishPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

function fishColor(stock: StockQuote): string {
  const change = stock.changePercent ?? stock.change ?? 0;
  if (change > 0) return `hsl(2 ${72 + Math.min(Math.abs(change) * 1.5, 18)}% ${48 - Math.min(Math.abs(change) * 0.5, 12)}%)`;
  if (change < 0) return `hsl(150 ${58 + Math.min(Math.abs(change) * 1.5, 18)}% ${42 - Math.min(Math.abs(change) * 0.45, 10)}%)`;
  return '#9aa9b4';
}

function fishRadius(stock: StockQuote, maxTurnover: number): number {
  const ratio = maxTurnover > 0 ? Math.sqrt(Math.max(stock.turnover, 0) / maxTurnover) : 0.3;
  return 12 + Math.min(25, Math.max(3, ratio * 27));
}

export function FishCanvas({ stocks, selectedSymbol, searchTerm, paused, onSelect }: FishCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef(new Map<string, FishPosition>());
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [hovered, setHovered] = useState<{ stock: StockQuote; x: number; y: number } | null>(null);
  const reducedMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  const maxTurnover = Math.max(...stocks.map((stock) => stock.turnover), 1);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(320, rect.width);
      height = Math.max(360, rect.height);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    const clean = () => observer.disconnect();
    return clean;
  }, []);

  useEffect(() => {
    const positions = positionsRef.current;
    stocks.forEach((stock, index) => {
      if (!positions.has(stock.symbol)) {
        const row = index % 6;
        positions.set(stock.symbol, { x: 80 + (index * 127) % 920, y: 85 + row * 72, vx: 0.18 + (index % 5) * 0.025, vy: 0, angle: 0 });
      }
    });
    for (const symbol of positions.keys()) if (!stocks.some((stock) => stock.symbol === symbol)) positions.delete(symbol);
  }, [stocks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let width = wrapper.clientWidth;
    let height = wrapper.clientHeight;
    const draw = (time: number) => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const camera = cameraRef.current;
      context.clearRect(0, 0, width, height);
      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#03152c');
      background.addColorStop(0.46, '#075086');
      background.addColorStop(1, '#02132d');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.18;
      context.strokeStyle = '#76d8ff';
      context.lineWidth = 1;
      for (let row = 0; row < 9; row += 1) {
        context.beginPath();
        const offset = ((time * (0.018 + row * 0.002)) % 100) - 100;
        for (let x = -100; x < width + 120; x += 35) context.lineTo(x, 80 + row * (height / 10) + Math.sin((x + time * 0.025 + row * 20) / 60) * 5 + offset);
        context.stroke();
      }
      context.restore();
      const glow = context.createRadialGradient(width * 0.28, height * 0.1, 5, width * 0.28, height * 0.1, height * 0.8);
      glow.addColorStop(0, 'rgba(77, 194, 255, .24)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const visible = stocks.slice(0, 120);
      const positions = positionsRef.current;
      const maxVolume = Math.max(...stocks.map((item) => item.volume), 1);
      const topTenThreshold = [...stocks].sort((a, b) => b.turnover - a.turnover)[Math.min(9, stocks.length - 1)]?.turnover ?? 0;
      if (!paused && !reducedMotion) {
        visible.forEach((stock) => {
          const position = positions.get(stock.symbol);
          if (!position) return;
          const speed = 0.25 + Math.min(1.6, (stock.volume / maxVolume) * 1.4);
          position.x += position.vx * speed;
          position.y += Math.sin(time * 0.0012 + stock.symbol.charCodeAt(0)) * 0.04;
          if (position.x > width + 70) position.x = -70;
          if (position.y < 35) position.y = 35;
          if (position.y > height - 35) position.y = height - 35;
        });
        for (let left = 0; left < visible.length; left += 1) {
          const first = positions.get(visible[left].symbol);
          if (!first) continue;
          for (let right = left + 1; right < visible.length; right += 1) {
            const second = positions.get(visible[right].symbol);
            if (!second) continue;
            const dx = second.x - first.x;
            const dy = second.y - first.y;
            const distance = Math.hypot(dx, dy) || 1;
            const minDistance = fishRadius(visible[left], maxTurnover) + fishRadius(visible[right], maxTurnover) + 9;
            if (distance < minDistance) {
              const force = (minDistance - distance) / minDistance * 0.12;
              first.x -= dx / distance * force; first.y -= dy / distance * force;
              second.x += dx / distance * force; second.y += dy / distance * force;
            }
          }
        }
      }

      context.save();
      context.translate(camera.x, camera.y);
      context.scale(camera.zoom, camera.zoom);
      visible.forEach((stock) => {
        const position = positions.get(stock.symbol);
        if (!position) return;
        const radius = fishRadius(stock, maxTurnover);
        const match = !normalizedSearch || stock.symbol.toLowerCase().includes(normalizedSearch) || stock.name.toLowerCase().includes(normalizedSearch);
        const isSelected = stock.symbol === selectedSymbol;
        const alpha = normalizedSearch && !match ? 0.13 : 1;
        context.save();
        context.globalAlpha = alpha;
        if (isSelected || stock.turnover >= topTenThreshold) {
          context.shadowColor = isSelected ? '#8de7ff' : fishColor(stock);
          context.shadowBlur = isSelected ? 22 : 12;
        }
        context.translate(position.x, position.y);
        const direction = position.vx >= 0 ? 1 : -1;
        context.scale(direction, 1);
        context.rotate(Math.sin(time * 0.001 + stock.symbol.charCodeAt(0)) * 0.035);
        context.fillStyle = fishColor(stock);
        context.beginPath();
        context.moveTo(radius * 1.15, 0);
        context.quadraticCurveTo(radius * 0.35, -radius * 0.86, -radius * 0.62, -radius * 0.4);
        context.quadraticCurveTo(-radius * 0.9, -radius * 1.05, -radius * 1.05, -radius * 0.18);
        context.quadraticCurveTo(-radius * 1.38, -radius * 0.38, -radius * 1.55, -radius * 0.1);
        context.quadraticCurveTo(-radius * 1.38, 0, -radius * 1.55, radius * 0.1);
        context.quadraticCurveTo(-radius * 1.05, 0.12 * radius, -radius * 1.05, radius * 0.18);
        context.quadraticCurveTo(-radius * 0.92, radius * 0.8, -radius * 0.6, radius * 0.4);
        context.quadraticCurveTo(radius * 0.35, radius * 0.86, radius * 1.15, 0);
        context.fill();
        context.fillStyle = 'rgba(255,255,255,.22)';
        context.beginPath(); context.ellipse(-radius * 0.1, -radius * 0.3, radius * 0.35, radius * 0.11, -0.2, 0, Math.PI * 2); context.fill();
        context.fillStyle = '#f4ffff'; context.beginPath(); context.arc(radius * 0.63, -radius * 0.18, Math.max(1.6, radius * 0.07), 0, Math.PI * 2); context.fill();
        context.fillStyle = '#092337'; context.beginPath(); context.arc(radius * 0.66, -radius * 0.18, Math.max(0.8, radius * 0.032), 0, Math.PI * 2); context.fill();
        context.fillStyle = 'rgba(2, 18, 31, .86)';
        context.font = `${Math.max(9, Math.min(14, radius * 0.54))}px "JetBrains Mono", monospace`;
        context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(stock.symbol, -radius * 0.25, 0);
        context.restore();
      });
      context.restore();
      if (!paused && !reducedMotion) frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [maxTurnover, normalizedSearch, paused, reducedMotion, selectedSymbol, stocks]);

  const findAt = (event: React.PointerEvent<HTMLCanvasElement>): StockQuote | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const camera = cameraRef.current;
    const x = (event.clientX - rect.left - camera.x) / camera.zoom;
    const y = (event.clientY - rect.top - camera.y) / camera.zoom;
    let nearest: { stock: StockQuote; distance: number } | null = null;
    for (const stock of stocks.slice(0, 120)) {
      const position = positionsRef.current.get(stock.symbol);
      if (!position) continue;
      const distance = Math.hypot(x - position.x, y - position.y);
      if (distance < fishRadius(stock, maxTurnover) * 1.5 && (!nearest || distance < nearest.distance)) nearest = { stock, distance };
    }
    return nearest?.stock ?? null;
  };

  return <div ref={wrapperRef} className="fish-stage" aria-label="台股魚群行情畫布">
    <canvas ref={canvasRef} tabIndex={0} onPointerMove={(event) => { const stock = findAt(event); setHovered(stock ? { stock, x: event.nativeEvent.offsetX + 16, y: event.nativeEvent.offsetY + 16 } : null); }} onPointerLeave={() => setHovered(null)} onClick={(event) => { const stock = findAt(event); if (stock) onSelect(stock); }} onPointerDown={(event) => { dragRef.current = { active: true, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { dragRef.current.active = false; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { dragRef.current.active = false; }} onPointerMoveCapture={(event) => { if (!dragRef.current.active) return; cameraRef.current.x += event.clientX - dragRef.current.x; cameraRef.current.y += event.clientY - dragRef.current.y; dragRef.current = { active: true, x: event.clientX, y: event.clientY }; }} onWheel={(event) => { event.preventDefault(); cameraRef.current.zoom = Math.min(1.8, Math.max(0.7, cameraRef.current.zoom * (event.deltaY > 0 ? 0.92 : 1.08))); }} />
    <div className="stage-hud"><span><i className="pulse-dot" />行情魚群</span><span>{Math.min(stocks.length, 120)} 條魚 · {reducedMotion ? '靜態模式' : paused ? '動畫暫停' : '30 FPS+'}</span></div>
    {hovered && <div className="fish-tooltip" style={{ left: hovered.x, top: hovered.y }}><b>{hovered.stock.symbol} {hovered.stock.name}</b><span>收盤 {hovered.stock.close?.toLocaleString('zh-TW') ?? '資料來源未提供'}</span><span className={Number(hovered.stock.changePercent) >= 0 ? 'text-up' : 'text-down'}>{hovered.stock.changePercent === null ? '資料來源未提供' : `${hovered.stock.changePercent > 0 ? '+' : ''}${hovered.stock.changePercent.toFixed(2)}%`}</span></div>}
    {!stocks.length && <div className="stage-empty"><span>沒有符合篩選條件的魚群</span><small>請調整篩選條件或清除搜尋</small></div>}
  </div>;
}
