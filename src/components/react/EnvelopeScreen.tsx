import { useRef, useEffect, useCallback, useState } from 'react';
import gsap from 'gsap';

const GRAIN: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
  backgroundSize: '220px',
  opacity: 0.08,
};

const CARD_TEXT =
  'This space has been thoughtfully created to guide you through every detail as our wedding approaches. For now, please RSVP, and more information about the wedding schedule will be shared shortly.';

function SealFallback() {
  return (
    <div
      className="flex h-full w-full select-none items-center justify-center rounded-full"
      style={{
        background: '#5A321A',
        boxShadow:
          'inset 0 1px 0 rgba(255,230,214,0.16),' +
          'inset 0 -3px 7px rgba(0,0,0,0.34),' +
          '0 0 0 1px rgba(45,23,11,0.68)',
      }}
    >
      <span
        className="text-[clamp(2.2rem,7vw,3rem)] font-normal text-[#f1dfc8]"
        style={{ fontFamily: "'Great Vibes', cursive" }}
      >
        T&O
      </span>
    </div>
  );
}

/** Cream paper surface (paper texture + warm tint + damask emboss). */
function PaperSurface() {
  return (
    <>
      <div className="absolute inset-0" style={{ background: '#EFE1C6' }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/assets/paper-texture.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/assets/damask-texture.png)',
          backgroundSize: '480px',
          backgroundRepeat: 'repeat',
          opacity: 0.08,
        }}
      />
    </>
  );
}

export default function EnvelopeScreen() {
  const screenRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const mobileFlapRef = useRef<HTMLDivElement>(null);
  const linerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const envelopeBodyRef = useRef<HTMLDivElement>(null);
  const envelopeTopRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<SVGSVGElement>(null);
  const monogramRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const scriptRef = useRef<HTMLParagraphElement>(null);
  const tapRef = useRef<HTMLParagraphElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const openedRef = useRef(false);
  const [sealUseImg, setSealUseImg] = useState(true);

  const openEnvelope = useCallback(() => {
    if (openedRef.current) return;
    const screen = screenRef.current;
    const isMobileEnvelope = window.matchMedia('(max-width: 767px)').matches;
    const flap = isMobileEnvelope ? mobileFlapRef.current : flapRef.current;
    const liner = linerRef.current;
    const card = cardRef.current;
    const body = envelopeBodyRef.current;
    const envTop = envelopeTopRef.current;
    const seam = seamRef.current;
    const monogram = monogramRef.current;
    const textEl = textRef.current;
    const main = document.getElementById('main-content');
    if (!screen || !flap || !liner || !card || !body || !main) return;

    openedRef.current = true;
    if (openButtonRef.current) {
      openButtonRef.current.style.pointerEvents = 'none';
    }
    gsap.set(tapRef.current, { autoAlpha: 0 });

    const finish = () => {
      screen.style.display = 'none';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      main.style.opacity = '1';
      main.setAttribute('aria-hidden', 'false');
      window.dispatchEvent(new CustomEvent('envelope-opened'));
      finish();
      return;
    }

    const tl = gsap.timeline({ onComplete: finish });

    // 0.0-0.55s — invitation script fades out.
    tl.to(scriptRef.current, { opacity: 0, duration: 0.55, ease: 'power2.out' }, 0);

    // Flap opens — deliberately slow so the reveal feels ceremonial.
    if (isMobileEnvelope) {
      tl.to(flap, { yPercent: -16, opacity: 0, duration: 1.4, ease: 'power2.inOut' }, 0.15);
    } else {
      tl.to(flap, { rotateX: -160, duration: 3.5, ease: 'power3.inOut' }, 0.15);
    }

    if (!isMobileEnvelope) {
      tl.set(flap, { zIndex: 14 }, 4.2);
    }

    // Card rises out of envelope as flap opens.
    tl.to(card, {
      yPercent: 0,
      duration: isMobileEnvelope ? 1.6 : 2.4,
      ease: 'power3.out',
    }, isMobileEnvelope ? 0.8 : 1.4);

    // Cream interior brightens as the flap rises.
    tl.to(liner, { opacity: 1, duration: 2.5, ease: 'power2.out' }, 0.65);

    // Fade out pocket overlay + seam lines to reveal the full card cleanly.
    const fadeTargets = [envTop, seam].filter(Boolean);
    if (fadeTargets.length) {
      tl.to(fadeTargets, {
        opacity: 0,
        duration: 1.1,
        ease: 'power2.out',
      }, isMobileEnvelope ? 1.6 : 3.8);
    }

    // T&O monogram blooms in at ~1.5s while the flap is still opening.
    const textStart = isMobileEnvelope ? 0.9 : 1.5;
    if (monogram) {
      tl.to(monogram, {
        opacity: 1,
        scale: 1,
        duration: 1.8,
        ease: 'power3.out',
      }, textStart);
    }

    // Body text types in immediately after monogram starts.
    // 195 chars × 0.038 stagger = ~7.4s to finish.
    const charDelay = 0.3;
    if (textEl) {
      const charEls = Array.from(textEl.querySelectorAll('.char-span'));
      if (charEls.length) {
        tl.to(charEls, {
          opacity: 1,
          duration: 0.001,
          stagger: 0.038,
          ease: 'none',
        }, textStart + charDelay);
      }
    }

    // Wait 1s after typing finishes, then fade to homepage.
    // typingEnd = textStart + charDelay + (195 * 0.038) ≈ textStart + 7.7
    const typingEnd = textStart + charDelay + 7.7;
    const mainReveal = typingEnd + 1.0;
    tl.set(main, { opacity: 1 }, mainReveal);
    tl.add(() => {
      document.body.dataset.heroPrimed = 'true';
      main.setAttribute('aria-hidden', 'false');
      window.dispatchEvent(new CustomEvent('envelope-opened'));
    }, mainReveal);

    tl.to(screen, {
      opacity: 0,
      duration: 1.4,
      ease: 'power2.inOut',
    }, mainReveal + 0.2);
  }, []);

  useEffect(() => {
    const main = document.getElementById('main-content');

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    if (main) {
      gsap.set(main, { opacity: 0 });
      main.setAttribute('aria-hidden', 'true');
    }

    gsap.set(screenRef.current, { opacity: 1, clearProps: 'display' });
    gsap.set(flapRef.current, { rotateX: 0, zIndex: 25, opacity: 1 });
    gsap.set(mobileFlapRef.current, { yPercent: 0, zIndex: 25, opacity: 1 });
    gsap.set(linerRef.current, { opacity: 1 });
    gsap.set(envelopeBodyRef.current, { opacity: 1 });

    if (cardRef.current) {
      gsap.set(cardRef.current, { xPercent: -50, yPercent: 60 });
    }
    if (monogramRef.current) {
      gsap.set(monogramRef.current, { opacity: 0, scale: 0.82 });
    }
    if (textRef.current) {
      gsap.set(textRef.current.querySelectorAll('.char-span'), { opacity: 0 });
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div
      ref={screenRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        backgroundColor: '#EFE1C6',
      }}
      onClick={openEnvelope}
      role="presentation"
    >
      <button
        ref={openButtonRef}
        type="button"
        className="absolute inset-0 z-[60] cursor-pointer border-0 bg-transparent p-0"
        aria-label="Open invitation"
        onClick={(event) => {
          event.stopPropagation();
          openEnvelope();
        }}
      />

      {/* === CREAM LINER (under everything — visible when flap opens) === */}
      <div
        ref={linerRef}
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{ opacity: 1 }}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{ background: '#EFE1C6' }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/assets/paper-texture.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.12,
            }}
          />
          <div
            className="absolute left-0 right-0 top-0 h-[28%]"
            style={{
              background:
                'linear-gradient(180deg, rgba(90,50,26,0.10) 0%, rgba(90,50,26,0) 100%)',
            }}
          />
        </div>
      </div>

      {/* === PAPER CARD INSIDE THE ENVELOPE === */}
      <div
        ref={cardRef}
        className="pointer-events-none absolute left-1/2 z-[15]"
        style={{
          top: '8%',
          width: 'min(70vw, 440px)',
          height: 'calc(min(70vw, 440px) * 1.35)',
          transformOrigin: '50% 50%',
          transformStyle: 'flat',
          WebkitTransformStyle: 'flat',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          backgroundColor: '#f5ede0',
          borderRadius: '3px',
          isolation: 'isolate',
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.20),' +
            ' 0 8px 18px rgba(0,0,0,0.30),' +
            ' 0 22px 44px rgba(0,0,0,0.32)',
        }}
        aria-hidden
      >
        {/* Paper texture — SVG image element is iOS-reliable inside fixed/overflow:hidden ancestor */}
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true" style={{ borderRadius: '3px' }}>
          <image href="/assets/card-paper.png" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
        </svg>

        {/* Body text — writing animation, sits in the open space of the new image */}
        <div
          className="absolute inset-x-0 flex flex-col items-center px-8 text-center"
          style={{ top: '48%' }}
        >
          <p
            ref={textRef}
            className="max-w-[320px] italic leading-snug"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(0.95rem, 3.4vw, 1.1rem)',
              fontWeight: 700,
              color: '#3a2210',
              WebkitTextFillColor: '#3a2210',
              WebkitFontSmoothing: 'antialiased',
              textShadow: '0 1px 3px rgba(255,248,235,0.9)',
            }}
          >
            {CARD_TEXT.split('').map((char, i) => (
              <span key={i} className="char-span" style={{ display: 'inline' }}>
                {char}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* === ENVELOPE BODY — SVG polygon avoids iOS clip-path black rendering === */}
      <div
        ref={envelopeBodyRef}
        className="pointer-events-none absolute inset-0 z-[10]"
        aria-hidden
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="envBodyVig" cx="50%" cy="50%" r="70%">
              <stop offset="55%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(90,50,26,0.09)" />
            </radialGradient>
          </defs>
          <polygon points="0,0 50,50 100,0 100,100 0,100" fill="#EFE1C6" />
          <polygon points="0,0 50,50 100,0 100,100 0,100" fill="url(#envBodyVig)" />
        </svg>
        {/* Full-screen texture overlays — CSS background-image is iOS-safe (no clip-path) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/paper-texture.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/damask-texture.png)',
            backgroundSize: '480px',
            backgroundRepeat: 'repeat',
            opacity: 0.09,
          }}
        />
        <div className="absolute inset-0" style={GRAIN} />
      </div>

      {/* === ENVELOPE POCKET FACES — SVG clipPath is iOS-safe unlike CSS clip-path === */}
      <div ref={envelopeTopRef} className="pointer-events-none absolute inset-0 z-[20]" aria-hidden>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="envFaceL"><polygon points="0,0 0,100 50,50" /></clipPath>
            <clipPath id="envFaceR"><polygon points="100,0 100,100 50,50" /></clipPath>
            <clipPath id="envFaceB"><polygon points="0,100 100,100 50,50" /></clipPath>
            <linearGradient id="envLeftGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(90,50,26,0.09)" />
              <stop offset="1" stopColor="rgba(90,50,26,0)" />
            </linearGradient>
            <linearGradient id="envRightGrad" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor="rgba(90,50,26,0.09)" />
              <stop offset="1" stopColor="rgba(90,50,26,0)" />
            </linearGradient>
            <linearGradient id="envBottomGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="rgba(90,50,26,0.13)" />
              <stop offset="1" stopColor="rgba(90,50,26,0.04)" />
            </linearGradient>
          </defs>
          {/* Opaque base fills — covers the card (z-15) beneath each face */}
          <polygon points="0,0 0,100 50,50" fill="#EFE1C6" />
          <polygon points="100,0 100,100 50,50" fill="#EFE1C6" />
          <polygon points="0,100 100,100 50,50" fill="#EFE1C6" />
          {/* Paper + damask texture via SVG clipPath — iOS-safe (not CSS clip-path) */}
          <image href="/assets/paper-texture.jpg" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.16" clipPath="url(#envFaceL)" />
          <image href="/assets/paper-texture.jpg" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.16" clipPath="url(#envFaceR)" />
          <image href="/assets/paper-texture.jpg" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.16" clipPath="url(#envFaceB)" />
          <image href="/assets/damask-texture.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.09" clipPath="url(#envFaceL)" />
          <image href="/assets/damask-texture.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.09" clipPath="url(#envFaceR)" />
          <image href="/assets/damask-texture.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.09" clipPath="url(#envFaceB)" />
          {/* Gradient shading for 3D face depth */}
          <polygon points="0,0 0,100 50,50" fill="url(#envLeftGrad)" />
          <polygon points="100,0 100,100 50,50" fill="url(#envRightGrad)" />
          <polygon points="0,100 100,100 50,50" fill="url(#envBottomGrad)" />
        </svg>
      </div>

      {/* Soft seam shading — fades out when card is revealed. */}
      <svg
        ref={seamRef}
        className="pointer-events-none absolute inset-0 z-[21] h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        style={{ opacity: 0.58 }}
      >
        <defs>
          <filter id="envSoftCrease" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.22" />
          </filter>
          <linearGradient id="envTopCrease" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(0,0,0,0)" />
            <stop offset="0.48" stopColor="rgba(90,50,26,0.12)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="envBottomShadow" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(90,50,26,0)" />
            <stop offset="0.52" stopColor="rgba(90,50,26,0.13)" />
            <stop offset="1" stopColor="rgba(90,50,26,0)" />
          </linearGradient>
          <linearGradient id="envBottomHighlight" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(255,252,238,0)" />
            <stop offset="0.52" stopColor="rgba(255,252,238,0.34)" />
            <stop offset="1" stopColor="rgba(255,252,238,0)" />
          </linearGradient>
        </defs>
        <path d="M0 0 L50 50 L100 0" fill="none" stroke="url(#envTopCrease)" strokeWidth="0.34" filter="url(#envSoftCrease)" />
        <path d="M0 100 L50 50 L100 100" fill="none" stroke="url(#envBottomShadow)" strokeWidth="0.62" strokeLinecap="round" filter="url(#envSoftCrease)" />
        <path d="M0.5 99.15 L50 49.65 L99.5 99.15" fill="none" stroke="url(#envBottomHighlight)" strokeWidth="0.26" strokeLinecap="round" />
      </svg>

      {/* Tap to Reveal */}
      <p
        ref={tapRef}
        className="pointer-events-none absolute left-1/2 z-[70] w-[90%] max-w-md -translate-x-1/2 text-center"
        style={{
          top: 'clamp(8%, 10vh, 14%)',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(1rem, 3vw, 1.2rem)',
          fontStyle: 'italic',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: '#3f2414',
          WebkitTextStroke: '0.25px rgba(63,36,20,0.34)',
          textShadow:
            '0 1px 0 rgba(255,250,238,0.86),' +
            '0 2px 5px rgba(90,50,26,0.28),' +
            '0 8px 22px rgba(90,50,26,0.20)',
          animation: 'envTap 2.4s ease-in-out infinite',
        }}
      >
        Tap to reveal
      </p>

      {/* Invitation script */}
      <p
        ref={scriptRef}
        className="pointer-events-none absolute left-1/2 z-[70] w-[92%] max-w-xl -translate-x-1/2 px-3 text-center leading-relaxed"
        style={{
          bottom: 'clamp(8%, 11vh, 16%)',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(1rem, 3.1vw, 1.28rem)',
          fontStyle: 'italic',
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: '#3f2414',
          WebkitTextStroke: '0.2px rgba(63,36,20,0.15)',
          textShadow: '0 1px 2px rgba(255,250,238,0.6)',
        }}
      >
        Together with our families, we invite you to celebrate
        <br />
        the wedding of{' '}
        <span
          className="whitespace-nowrap"
          style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: '1.2em',
            fontStyle: 'normal',
            letterSpacing: '0.01em',
          }}
        >
          Tayo &amp; Ope
        </span>
      </p>

      {/* === FLAP + WAX SEAL — perspective wrapper isolates 3D context to desktop only === */}
      <div
        className="pointer-events-none absolute inset-0 z-[25] hidden md:block"
        style={{ perspective: '1600px' }}
      >
      <div
        ref={flapRef}
        className="pointer-events-none absolute inset-0"
        style={{
          transformOrigin: '50% 0%',
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        {/* FLAP FRONT */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 50% 50%)',
            WebkitClipPath: 'polygon(0% 0%, 100% 0%, 50% 50%)',
            backgroundColor: '#EFE1C6',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0.2px)',
            WebkitTransform: 'translateZ(0.2px)',
          }}
        >
          <PaperSurface />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,248,235,0.10) 0%, transparent 42%, rgba(90,50,26,0.08) 100%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[40%]"
            style={{
              background: 'linear-gradient(to top, rgba(90,50,26,0.08) 0%, transparent 100%)',
            }}
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ opacity: 0.74 }}
          >
            <defs>
              <filter id="envPearlGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0.28" stdDeviation="0.22" floodColor="rgba(90,50,26,0.20)" />
                <feDropShadow dx="0" dy="-0.18" stdDeviation="0.14" floodColor="rgba(255,255,248,0.52)" />
              </filter>
            </defs>
            <path
              d="M1.8 0.8 L50 49.2 L98.2 0.8"
              fill="none"
              stroke="rgba(255,252,238,0.24)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M3.2 1.5 L50 48.4"
              fill="none"
              stroke="rgba(255,254,246,0.70)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="0.01 4.2"
              vectorEffect="non-scaling-stroke"
              filter="url(#envPearlGlow)"
            />
            <path
              d="M96.8 1.5 L50 48.4"
              fill="none"
              stroke="rgba(255,254,246,0.70)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="0.01 4.2"
              vectorEffect="non-scaling-stroke"
              filter="url(#envPearlGlow)"
            />
          </svg>
        </div>

        {/* FLAP BACK */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 50% 50%)',
            WebkitClipPath: 'polygon(0% 0%, 100% 0%, 50% 50%)',
            backgroundColor: '#EFE1C6',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
            WebkitTransform: 'rotateX(180deg)',
          }}
        >
          <div className="absolute inset-0" style={{ background: '#EFE1C6' }} />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/assets/paper-texture.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.12,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(90,50,26,0.04) 0%, transparent 50%, rgba(90,50,26,0.08) 100%)',
            }}
          />
        </div>

        {/* === WAX SEAL === */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div
            className="pointer-events-auto relative cursor-pointer rounded-full"
            style={{
              width: 'clamp(124px, 30vw, 188px)',
              height: 'clamp(124px, 30vw, 188px)',
              filter:
                'drop-shadow(0 1px 1px rgba(0,0,0,0.30))' +
                ' drop-shadow(0 5px 10px rgba(0,0,0,0.45))' +
                ' drop-shadow(0 14px 24px rgba(0,0,0,0.35))',
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-full bg-[#5A321A]">
              {sealUseImg ? (
                <img
                  src="/assets/wax-seal.png"
                  alt="Wax seal T and O"
                  draggable={false}
                  className="h-full w-full object-cover"
                  style={{ filter: 'grayscale(1) contrast(1.2)', mixBlendMode: 'luminosity', opacity: 0.42 }}
                  onError={() => setSealUseImg(false)}
                />
              ) : (
                <SealFallback />
              )}
              {sealUseImg && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: '#5A321A', mixBlendMode: 'color', opacity: 1 }}
                />
              )}
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 38%)',
                  mixBlendMode: 'screen',
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow:
                    'inset 0 0 14px rgba(0,0,0,0.28),' +
                    ' inset 0 -2px 8px rgba(0,0,0,0.32),' +
                    ' inset 0 2px 4px rgba(255,255,255,0.10)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* === MOBILE FLAP — SVG triangle avoids iOS clip-path black rendering bug === */}
      <div
        ref={mobileFlapRef}
        className="pointer-events-none absolute inset-0 z-[25] md:hidden"
        aria-hidden
      >
        {/* Full-screen SVG so the V-point matches the envelope body and pocket faces exactly (no svh/vh gap) */}
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ filter: 'drop-shadow(0 6px 14px rgba(90,50,26,0.12))' }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id="envFlapTop"><polygon points="0,0 100,0 50,50" /></clipPath>
          </defs>
          <polygon points="0,0 100,0 50,50" fill="#EFE1C6" />
          <image href="/assets/paper-texture.jpg" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.16" clipPath="url(#envFlapTop)" />
          <image href="/assets/damask-texture.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.09" clipPath="url(#envFlapTop)" />
        </svg>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'clamp(118px, 34vw, 156px)',
            height: 'clamp(118px, 34vw, 156px)',
            filter:
              'drop-shadow(0 1px 1px rgba(0,0,0,0.30))' +
              ' drop-shadow(0 5px 10px rgba(0,0,0,0.42))' +
              ' drop-shadow(0 12px 22px rgba(0,0,0,0.30))',
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-full bg-[#5A321A]">
            {sealUseImg ? (
              <img
                src="/assets/wax-seal.png"
                alt="Wax seal T and O"
                draggable={false}
                className="h-full w-full object-cover"
                style={{ filter: 'grayscale(1) contrast(1.2)', mixBlendMode: 'luminosity', opacity: 0.42 }}
                onError={() => setSealUseImg(false)}
              />
            ) : (
              <SealFallback />
            )}
            {sealUseImg && (
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ background: '#5A321A', mixBlendMode: 'color', opacity: 1 }}
              />
            )}
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 38%)',
                mixBlendMode: 'screen',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  'inset 0 0 14px rgba(0,0,0,0.28),' +
                  ' inset 0 -2px 8px rgba(0,0,0,0.32),' +
                  ' inset 0 2px 4px rgba(255,255,255,0.10)',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes envTap {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
