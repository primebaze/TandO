import { useCallback, useEffect, useRef, useState } from 'react';

const BRUSH = 28;
const FADE_THRESHOLD = 0.45;

function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#d8b260');
  g.addColorStop(0.45, '#b3882f');
  g.addColorStop(1, '#8b6914');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // subtle hearts pattern
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      const cx = (i + 0.5) * (w / 5);
      const cy = (j + 0.5) * (h / 2);
      ctx.beginPath();
      const s = 0.5 + (i + j) * 0.1;
      ctx.moveTo(cx, cy - 6 * s);
      ctx.bezierCurveTo(cx + 6 * s, cy - 10 * s, cx + 12 * s, cy - 2 * s, cx, cy + 4 * s);
      ctx.bezierCurveTo(cx - 12 * s, cy - 2 * s, cx - 6 * s, cy - 10 * s, cx, cy - 6 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // big "SCRATCH HERE" call-to-action centered on the overlay
  ctx.save();
  const scale = w / 420; // canvas is high-DPI; scale text relative to base width
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 248, 225, 0.95)';
  ctx.shadowColor = 'rgba(70, 45, 10, 0.55)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.font = `700 ${22 * scale}px 'Inter', system-ui, sans-serif`;
  ctx.fillText('👆  SCRATCH HERE  👆', w / 2, h / 2 - 8 * scale);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.font = `500 ${11 * scale}px 'Inter', system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 248, 225, 0.85)';
  ctx.fillText('SAVE THE DATE', w / 2, h / 2 + 18 * scale);
  ctx.restore();
}

export default function ScratchHearts() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cleared, setCleared] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const paint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = BRUSH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (last.current) {
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, BRUSH * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      last.current = { x, y };
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let transparent = 0;
      for (let i = 3; i < d.data.length; i += 4) {
        if (d.data[i] < 20) transparent++;
      }
      const ratio = transparent / (d.data.length / 4);
      if (ratio > FADE_THRESHOLD) setCleared(true);
    },
    []
  );

  const endStroke = useCallback(() => {
    last.current = null;
    drawing.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(wrap.clientWidth * dpr);
      const h = Math.floor(128 * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.height = '128px';
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawOverlay(ctx, w, h);
      }
    };
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full min-h-32 select-none" role="img" aria-label="Scratch the gold area to reveal the date. Drag your finger or mouse.">
      <div className="absolute inset-0 z-0 flex min-h-32 flex-col items-center justify-center overflow-hidden rounded-xl border border-[#8b6914]/25 bg-gradient-to-b from-[#fff7e3] to-[#f1e3c2] px-4 shadow-[inset_0_0_0_1px_rgba(255,250,238,0.6),0_18px_44px_rgba(90,50,26,0.12)]">
        <p
          className="font-sans text-[8px] uppercase tracking-[0.42em] text-[#8b6914] transition-opacity duration-500"
          style={{ opacity: cleared ? 1 : 0.85 }}
        >
          Save the date
        </p>
        <p
          className="mt-1 text-center font-serif text-xl leading-tight text-[#5A321A] transition-opacity duration-500 md:text-2xl"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: cleared ? 1 : 0.85 }}
        >
          16 <span className="text-[#8b6914]">to</span> 20 December 2026
        </p>
        <p className="mt-1 font-sans text-[8px] uppercase tracking-[0.4em] text-[#8b6914]/80">Marrakech · Morocco</p>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] h-32 w-full touch-none"
        style={{ height: 128, cursor: 'grab' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = null;
          paint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          paint(e.clientX, e.clientY);
        }}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={(e) => {
          if (e.buttons) return;
          endStroke();
        }}
      />
    </div>
  );
}
