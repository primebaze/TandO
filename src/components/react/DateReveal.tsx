import confetti from 'canvas-confetti';
import { Hand, Landmark } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const BRUSH = 24;
const CLEAR_THRESHOLD = 0.42;

const dateParts = ['16 Dec', '20 Dec', '2026'];

function drawFoil(ctx: CanvasRenderingContext2D, size: number) {
  const center = size / 2;
  let gradient: CanvasGradient;

  if ('createConicGradient' in ctx) {
    gradient = ctx.createConicGradient(-0.6, center, center);
    gradient.addColorStop(0, '#ffe7a1');
    gradient.addColorStop(0.1, '#b9791a');
    gradient.addColorStop(0.22, '#fff2bf');
    gradient.addColorStop(0.36, '#c98a22');
    gradient.addColorStop(0.52, '#fff7d2');
    gradient.addColorStop(0.68, '#a76412');
    gradient.addColorStop(0.84, '#efc45c');
    gradient.addColorStop(1, '#ffe7a1');
  } else {
    gradient = ctx.createRadialGradient(center - size * 0.22, center - size * 0.24, 0, center, center, center);
    gradient.addColorStop(0, '#fff2bf');
    gradient.addColorStop(0.42, '#d1992e');
    gradient.addColorStop(1, '#8b6914');
  }

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, center - 6, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(center - size * 0.18, center - size * 0.2, 0, center, center, center);
  glow.addColorStop(0, 'rgba(255,255,255,0.72)');
  glow.addColorStop(0.42, 'rgba(255,255,255,0.08)');
  glow.addColorStop(1, 'rgba(86,47,7,0.12)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.lineWidth = 1;
  for (let radius = 12; radius < center; radius += 7) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(89, 99, 71, 0.72)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.max(10, size * 0.09)}px Inter, system-ui, sans-serif`;
  ctx.fillText('SCRATCH', center, center - size * 0.03);
  ctx.restore();
}

function ScratchCoin({ label, onClear }: { label: string; onClear: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clearedRef = useRef(false);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const size = Math.max(1, Math.round(Math.min(rect.width, rect.height) * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = size;
      canvas.height = size;
      drawFoil(ctx, size);
    };

    const frame = window.requestAnimationFrame(setup);
    window.addEventListener('resize', setup);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', setup);
    };
  }, []);

  const clearAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || clearedRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = BRUSH * (window.devicePixelRatio || 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (lastRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastRef.current.x, lastRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, (BRUSH * (window.devicePixelRatio || 1)) / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      lastRef.current = { x, y };
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] < 20) transparent++;
      }

      if (transparent / (data.length / 4) > CLEAR_THRESHOLD) {
        clearedRef.current = true;
        setCleared(true);
        onClear();
      }
    },
    [onClear]
  );

  const stop = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  return (
    <div className="relative h-24 w-24 shrink-0 rounded-full bg-white p-2 shadow-[0_16px_36px_rgba(63,65,43,0.12)] sm:h-28 sm:w-28">
      <div className="absolute inset-2 flex items-center justify-center rounded-full bg-[#fff8e7] text-center font-serif text-base font-semibold uppercase tracking-[0.1em] text-[#596347] sm:text-lg sm:tracking-[0.12em]">
        <span className={cleared ? 'opacity-100 transition-opacity duration-500' : 'opacity-0'}>
          {label}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute left-2 top-2 z-10 touch-none rounded-full transition-opacity duration-700"
        style={{ cursor: 'grab', height: 'calc(100% - 1rem)', opacity: cleared ? 0 : 1, width: 'calc(100% - 1rem)' }}
        aria-label={`Scratch to reveal ${label}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawingRef.current = true;
          lastRef.current = null;
          clearAt(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          clearAt(event.clientX, event.clientY);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={(event) => {
          if (event.buttons) return;
          stop();
        }}
      />
    </div>
  );
}

export default function DateReveal() {
  const [cleared, setCleared] = useState(0);
  const celebratedRef = useRef(false);
  const complete = cleared >= dateParts.length;

  const handleClear = useCallback(() => {
    setCleared((current) => Math.min(dateParts.length, current + 1));
  }, []);

  useEffect(() => {
    if (!complete || celebratedRef.current) return;
    celebratedRef.current = true;

    const colors = ['#596347', '#70765a', '#8b6914', '#b8860b', '#fff9e8'];
    confetti({
      particleCount: 80,
      spread: 72,
      startVelocity: 34,
      scalar: 0.85,
      colors,
      origin: { y: 0.68 },
    });
    window.setTimeout(() => {
      confetti({
        particleCount: 46,
        spread: 92,
        startVelocity: 26,
        scalar: 0.72,
        colors,
        origin: { y: 0.72 },
      });
    }, 220);
  }, [complete]);

  return (
    <section id="date-reveal" className="bg-[#efe7d7] px-6 py-20 text-center text-[#596347] md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8b6914]/18 bg-[#fff9e8]/70 text-[#596347] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_32px_rgba(90,50,26,0.08)]">
          <Hand className="h-4 w-4" />
        </div>
        <p className="mt-4 font-sans text-[10px] font-medium tracking-[0.08em] text-[#626951]/70">
          Scratch all three circles to continue
        </p>

        <Landmark className="mt-8 h-16 w-16 stroke-[1.2] text-[#8b6914]" />
        <p className="mt-4 font-[family-name:var(--font-family-script)] text-4xl text-[#8b6914] md:text-5xl">
          Reveal
        </p>
        <h2 className="mt-5 font-sans text-xs font-semibold uppercase tracking-[0.32em] text-[#596347] md:text-sm">
          Scratch to discover the date
        </h2>

        <div className="mt-10 flex w-full items-center justify-center gap-3 sm:gap-8">
          {dateParts.map((part) => (
            <ScratchCoin key={part} label={part} onClear={handleClear} />
          ))}
        </div>

        <div className={`mt-10 transition duration-700 ${complete ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`} aria-hidden={!complete}>
          <p className="font-serif text-2xl text-[#596347] md:text-3xl">16 - 20 December 2026</p>
          <a
            href="/rsvp"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full border border-[#8b6914]/25 bg-[#596347] px-8 font-sans text-[11px] font-semibold uppercase tracking-[0.26em] text-[#fff9e8] shadow-[0_18px_42px_rgba(63,65,43,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#70765a] focus:outline-none focus:ring-2 focus:ring-[#8b6914]/25"
          >
            Accept Invitation
          </a>
        </div>
      </div>
    </section>
  );
}