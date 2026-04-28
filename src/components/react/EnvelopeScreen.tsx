import { useRef, useEffect, useCallback, useState } from 'react';
import gsap from 'gsap';

const GRAIN: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
  backgroundSize: '220px',
  opacity: 0.08,
};

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

    // ════════════════════════════════════════════════════════════════════
    //  ONE CONTINUOUS MOTION
    //  As the flap opens, the white card emerges, lifts, and morphs into
    //  the hero — all chained together so the flap opening "triggers" the
    //  card's journey. No separate phases, no dead zones.
    // ════════════════════════════════════════════════════════════════════

    // Card is already hidden via useEffect; no need to re-set here.

    // 0.0-0.55s - Invitation script fades.
    tl.to(scriptRef.current, {
      opacity: 0,
      duration: 0.55,
      ease: 'power2.out',
    }, 0);

    if (isMobileEnvelope) {
      tl.to(flap, {
        yPercent: -16,
        opacity: 0,
        duration: 0.85,
        ease: 'power2.inOut',
      }, 0.15);
    } else {
      // 0.15-2.65s - Flap opens in 3D, revealing the paper inside slowly.
      tl.to(flap, {
        rotateX: -160,
        duration: 2.5,
        ease: 'power3.inOut',
      }, 0.15);
    }

    // Once the flap has lifted enough to reveal the paper, move it behind
    // the card but keep the side flaps and bottom pocket above the paper.
    // This prevents the rotating flap back face from covering the card again.
    if (!isMobileEnvelope) {
      tl.set(flap, { zIndex: 14 }, 1.45);
    }

    // 0.65-2.15s - Cream interior brightens as the flap rises.
    tl.to(liner, {
      opacity: 1,
      duration: 1.5,
      ease: 'power2.out',
    }, 0.65);

    // 2.85s - Reveal homepage underneath once the flap finishes opening.
    //        The bridge uses the same photo as the hero, so the handoff feels
    //        like the envelope is opening into Marrakesh instead of cutting away.
    tl.set(main, { opacity: 1 }, 2.85);
    tl.add(() => {
      document.body.dataset.heroPrimed = 'true';
      main.setAttribute('aria-hidden', 'false');
      window.dispatchEvent(new CustomEvent('envelope-opened'));
    }, 2.85);

    // 3.1-4.15s - Once T & O is visible on the paper, dissolve gently.
    tl.to(screen, {
      opacity: 0,
      duration: 1.05,
      ease: 'power2.inOut',
    }, 3.1);
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
      // The paper is present from the first frame. The closed flap and body
      // hide it naturally, then reveal it as the envelope opens.
      gsap.set(cardRef.current, { xPercent: -50 });
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
        perspective: '1600px',
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
          style={{
            // Full rectangle (no V-cut) so the interior reads as a flat
            // cream surface, not as another envelope shape.
            background: '#EFE1C6',
          }}
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
          {/* Soft natural shadow at the top (under the flap) — gentle,
              no hard inset edges that would suggest a second envelope. */}
          <div
            className="absolute left-0 right-0 top-0 h-[28%]"
            style={{
              background:
                'linear-gradient(180deg, rgba(90,50,26,0.10) 0%, rgba(90,50,26,0) 100%)',
            }}
          />
        </div>
      </div>

      {/* === WHITE CARD INSIDE THE ENVELOPE ===
          The card stays behind the envelope body so the full V pocket shape
          remains intact and the paper looks tucked inside. */}
      <div
        ref={cardRef}
        className="pointer-events-none absolute left-1/2 z-[15]"
        style={{
          top: '8%',
          width: 'min(70vw, 440px)',
          height: 'calc(min(70vw, 440px) * 1.35)',
          transformOrigin: '50% 50%',
          // iOS-safe: opt out of the parent's 3D perspective context so the
          // card paints as a flat 2D layer (otherwise iOS Safari composites
          // it as a black/transparent surface when GSAP applies a transform).
          transformStyle: 'flat',
          WebkitTransformStyle: 'flat',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          // iOS-safe: guarantee the card itself is opaque white even if
          // child layers (background images, gradients) fail to render.
          backgroundColor: '#ffffff',
          borderRadius: '3px',
          isolation: 'isolate',
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.20),' +
            ' 0 8px 18px rgba(0,0,0,0.30),' +
            ' 0 22px 44px rgba(0,0,0,0.32)',
        }}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fbf7ee 100%)',
            borderRadius: '3px',
          }}
        />
        {/* subtle paper grain on the card (opacity-only, no mix-blend
            so iOS Safari can't render it as a black overlay). */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/paper-texture.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.08,
            borderRadius: '3px',
          }}
        />
        {/* Monogram and note */}
        <div
          className="absolute inset-x-0 top-[8%] flex flex-col items-center px-8 text-center"
        >
          <span
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: 'clamp(2.7rem, 8vw, 4.25rem)',
              color: '#8a6337',
              letterSpacing: '0.01em',
              background: 'linear-gradient(180deg, #f1d18a 0%, #9b6a35 42%, #5f422c 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow:
                '0 1px 0 rgba(255,248,230,0.65),' +
                '0 0 16px rgba(255,171,72,0.22),' +
                '0 10px 24px rgba(75,43,18,0.18)',
            }}
          >
            T &amp; O
          </span>
          <p
            className="mt-3 max-w-[320px] italic leading-snug"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(0.85rem, 3.2vw, 1rem)',
              color: '#5d4634',
              WebkitTextFillColor: '#5d4634',
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            This space has been thoughtfully created to guide you through every
            detail as our wedding approaches. For now, please RSVP, and more
            information about the wedding schedule will be shared shortly.
          </p>
        </div>
      </div>

      {/* === ENVELOPE BODY (full backing — dark damask covering the
              whole envelope shape when closed. Fades out once the flap
              opens, leaving the cream liner + card + front pocket.) === */}
      <div
        ref={envelopeBodyRef}
        className="pointer-events-none absolute inset-0 z-[10]"
        style={{
          // shape excludes the top triangle (flap area)
          clipPath: 'polygon(0% 0%, 50% 50%, 100% 0%, 100% 100%, 0% 100%)',
        }}
      >
        <PaperSurface />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 95% 80% at 50% 50%, transparent 58%, rgba(90,50,26,0.08) 100%)',
          }}
        />
        <div className="absolute inset-0" style={GRAIN} />

        <div
          className="absolute inset-0"
          style={{ boxShadow: 'inset 0 0 54px rgba(90,50,26,0.08)' }}
        />
      </div>

      {/* === ENVELOPE TOP PIECES (side flaps + bottom V pocket) ===
          These stay above the paper so it reads as tucked inside, while the
          paper itself stays above the backing so it cannot disappear behind
          the envelope body during the opening. */}
      <div className="pointer-events-none absolute inset-0 z-[20]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0% 0%, 0% 100%, 50% 50%)' }}
        >
          <PaperSurface />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(90,50,26,0.05) 0%, rgba(90,50,26,0) 100%)',
            }}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(100% 0%, 100% 100%, 50% 50%)' }}
        >
          <PaperSurface />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(270deg, rgba(90,50,26,0.05) 0%, rgba(90,50,26,0) 100%)',
            }}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0% 100%, 100% 100%, 50% 50%)' }}
        >
          <PaperSurface />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(90,50,26,0.03) 0%, rgba(90,50,26,0.08) 100%)',
            }}
          />
        </div>
      </div>

      {/* Soft seam shading — visual folds, not hard construction lines. */}
      <svg
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
        Tap to Open
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
          WebkitTextStroke: '0.2px rgba(63,36,20,0.26)',
          textShadow:
            '0 1px 0 rgba(255,250,238,0.86),' +
            '0 2px 5px rgba(90,50,26,0.28),' +
            '0 8px 22px rgba(90,50,26,0.20)',
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

      {/* === FLAP + WAX SEAL — rotates as one piece in 3D === */}
      <div
        ref={flapRef}
        className="pointer-events-none absolute inset-0 z-[25] hidden md:block"
        style={{
          transformOrigin: '50% 0%',
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        {/* FLAP FRONT (cream paper — visible when closed) */}
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

        {/* FLAP BACK (cream — visible while opening) */}
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
          <div
            className="absolute inset-0"
            style={{ background: '#EFE1C6' }}
          />
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

        {/* === WAX SEAL — at the V-tip of the flap === */}
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

      {/* === MOBILE FLAP — solid div + clip-path polygon (iOS-safe) === */}
      <div
        ref={mobileFlapRef}
        className="pointer-events-none absolute inset-0 z-[25] md:hidden"
        aria-hidden
      >
        <div
          className="absolute left-0 top-0 w-full overflow-hidden"
          style={{
            height: '50svh',
            WebkitClipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
            clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
            boxShadow: '0 10px 18px rgba(90,50,26,0.10)',
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
        </div>
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
