import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Premium scroll experience for the content pages:
 * - Lenis momentum/inertia smooth scrolling (the "not a regular website" feel)
 * - GSAP ScrollTrigger reveals (rise + fade, with stagger for grids)
 * - Subtle parallax on [data-parallax] elements
 * Synced so Lenis drives ScrollTrigger.
 */
export function initSmooth() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupReveals() {
    const revealEls = gsap.utils.toArray<HTMLElement>('.reveal');

    if (reduce) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Reveals are triggered by IntersectionObserver (reads real element
    // positions — immune to layout shifts from lazy-loaded images), then
    // animated by GSAP. This avoids content getting stuck hidden.
    revealEls.forEach((el) => gsap.set(el, { autoAlpha: 0 }));

    const isMaskable = (img: HTMLImageElement) =>
      !img.closest('.page-hero, .split-hero, #site-nav, footer, .marquee, .story-pin') &&
      !img.hasAttribute('data-hero-media') &&
      !img.hasAttribute('data-story-bg');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          io.unobserve(el);

          // Block: gentle rise + fade.
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 56 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 1.1,
              ease: 'power3.out',
              clearProps: 'transform',
            },
          );
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );
    revealEls.forEach((el) => io.observe(el));

    // Explicit parallax drift.
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
      gsap.to(el, {
        yPercent: -14,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Ken Burns — editorial images inside clipped containers slowly drift+zoom.
    gsap.utils.toArray<HTMLImageElement>('img').forEach((img) => {
      if (!isMaskable(img)) return;
      const parent = img.parentElement;
      if (!parent) return;
      if (getComputedStyle(parent).overflow !== 'hidden') return;
      if (getComputedStyle(img).objectFit === 'contain') return; // skip illustrations
      img.classList.add('kenburns');
    });
  }

  function setupPinnedStories() {
    gsap.utils.toArray<HTMLElement>('.story-pin').forEach((section) => {
      const beats = gsap.utils.toArray<HTMLElement>('[data-beat]', section);
      const bgs = gsap.utils.toArray<HTMLElement>('[data-story-bg]', section);
      if (!beats.length) return;

      gsap.set(beats, { autoAlpha: 0, y: 40 });
      gsap.set(bgs, { autoAlpha: 0, scale: 1.08 });
      if (bgs[0]) gsap.set(bgs[0], { autoAlpha: 1 });

      if (reduce) {
        gsap.set(beats[0], { autoAlpha: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=' + beats.length * 95 + '%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      beats.forEach((beat, i) => {
        const at = i;
        const bgAt = Math.max(0, at - 0.25);
        if (bgs[i]) {
          tl.to(bgs[i], { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'none' }, bgAt);
          if (i > 0 && bgs[i - 1]) {
            tl.to(bgs[i - 1], { autoAlpha: 0, duration: 0.6, ease: 'none' }, bgAt);
          }
        }
        tl.to(beat, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, at);
        if (i < beats.length - 1) {
          tl.to(beat, { autoAlpha: 0, y: -30, duration: 0.45, ease: 'power2.in' }, at + 0.55);
        }
      });
    });
  }

  if (reduce) {
    setupReveals();
    setupPinnedStories();
    return;
  }

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  setupReveals();
  setupPinnedStories();

  // Keep scrub triggers accurate as lazy images load and shift the layout.
  let refreshTimer: number | undefined;
  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    }, 120);
  };
  window.addEventListener('load', scheduleRefresh);
  document.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', scheduleRefresh, { once: true });
  });

  // expose for debugging / the anchor handler below
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

  // Smooth in-page anchor jumps too
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target as HTMLElement, { offset: -80 });
        }
      }
    });
  });
}

// Boot — wait until the content is unlocked so ScrollTrigger measures correctly.
export function bootSmooth() {
  const run = () => {
    try {
      initSmooth();
    } catch {
      // Never leave content hidden if the engine fails.
      document
        .querySelectorAll('.reveal')
        .forEach((el) => el.classList.add('is-visible'));
    }
  };
  if (document.documentElement.classList.contains('is-locked')) {
    window.addEventListener('site-unlocked', run, { once: true });
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
