import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function playHeroIntro() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  const heroPrimed = document.body.dataset.heroPrimed === 'true';
  delete document.body.dataset.heroPrimed;

  const bg = hero.querySelector('.hero-bg');
  const arch = hero.querySelector('.hero-arch');
  const lanterns = hero.querySelectorAll('.hero-lantern');
  const motes = hero.querySelectorAll('.hero-mote');
  const grain = hero.querySelector('.hero-grain');
  const topCard = hero.querySelector('.hero-top-card');
  const hint = hero.querySelector('.hero-scroll-hint');
  const reveal = hero.querySelector('.hero-reveal-block');
  const bottomScroll = hero.querySelector('.hero-bottom-scroll');

  const morph = hero.querySelectorAll('.hero-morph');

  if (bg) {
    if (heroPrimed) {
      gsap.set(bg, { opacity: 1, scale: 1.02 });
      gsap.to(bg, { scale: 1.08, duration: 18, ease: 'none', repeat: -1, yoyo: true, delay: 0.2 });
    } else {
      gsap.set(bg, { opacity: 0, scale: 1.08 });
      gsap.to(bg, { opacity: 1, scale: 1.02, duration: 0.8, ease: 'power2.out' });
      gsap.to(bg, { scale: 1.08, duration: 18, ease: 'none', repeat: -1, yoyo: true, delay: 0.9 });
    }
  }

  if (arch) {
    gsap.fromTo(arch, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 1.2, delay: 0.2, ease: 'power2.out' });
  }

  if (lanterns.length) {
    gsap.fromTo(
      lanterns,
      { opacity: 0, y: -18, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, stagger: 0.18, delay: 0.35, ease: 'power2.out' }
    );
  }

  if (motes.length) {
    gsap.fromTo(motes, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.8, stagger: 0.12, delay: 0.9, ease: 'power2.out' });
  }
  if (grain) {
    if (heroPrimed) {
      gsap.set(grain, { opacity: 0.28 });
    } else {
      gsap.set(grain, { opacity: 0 });
      gsap.to(grain, { opacity: 0.28, duration: 0.8, delay: 0.15, ease: 'power1.out' });
    }
  }

  if (morph.length) {
    gsap.set(morph, { opacity: 0, y: 32, filter: 'blur(8px)' });
    gsap.to(morph, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.9,
      stagger: 0.1,
      ease: 'power3.out',
    });
  }

  if (hint) {
    gsap.fromTo(hint, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.8, ease: 'power2.out' });
  }
  if (reveal) {
    gsap.fromTo(
      reveal,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, delay: 0.5, ease: 'power2.out' }
    );
  }
  if (bottomScroll) {
    gsap.to(bottomScroll, { opacity: 1, duration: 0.5, delay: 1.2, ease: 'power1.out' });
  }
  if (topCard) {
    gsap.fromTo(
      topCard,
      { scale: 0.98 },
      { scale: 1, duration: 0.6, delay: 0.3, ease: 'power2.out' }
    );
  }
}

export function initScrollAnimations() {
  const shell = document.querySelector<HTMLElement>('.morph-shell');
  if (shell) {
    initMorphSections(shell);
    return;
  }

  const reveal = (sel: string) => {
    const els = gsap.utils.toArray<HTMLElement>(sel);
    if (els.length === 0) return;
    els.forEach((el) => {
      gsap.set(el, { y: 16, opacity: 0 });
    });
    ScrollTrigger.batch(els, {
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.06, duration: 0.6, ease: 'power2.out' }),
      start: 'top 90%',
    });
  };

  reveal('#countdown .section-reveal, #countdown .countdown-unit, #countdown .countdown-colon');
  reveal('#story .section-reveal, #story .story-block');
  reveal('#order .section-reveal, #order .timeline-item, #order .timeline-dot');
  const line = document.querySelector('#order .timeline-line');
  if (line) {
    gsap.fromTo(
      line,
      { scaleY: 0 },
      {
        scaleY: 1,
        duration: 1.1,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: '#order', start: 'top 70%' },
      }
    );
  }
  reveal('#details .section-reveal, #details .detail-card, #details .detail-item');
  reveal('#gallery .section-reveal, #gallery .gallery-item');
  reveal('#dresscode .section-reveal, #dresscode .dresscode-card');
  reveal('.footer-content');
}

function initMorphSections(shell: HTMLElement) {
  if (shell.dataset.morphReady === 'true') return;
  shell.dataset.morphReady = 'true';

  document.documentElement.classList.add('morph-active');
  document.body.classList.add('morph-active');

  const sections = Array.from(shell.querySelectorAll<HTMLElement>(':scope > section, :scope > footer'));
  const dotsWrap = shell.querySelector<HTMLElement>('.morph-dots');
  const prev = shell.querySelector<HTMLButtonElement>('[data-morph-prev]');
  const next = shell.querySelector<HTMLButtonElement>('[data-morph-next]');
  if (!sections.length) return;

  const revealSelector = [
    '.section-reveal',
    '.countdown-unit',
    '.countdown-colon',
    '.story-block',
    '.timeline-item',
    '.timeline-dot',
    '.detail-card',
    '.detail-item',
    '.gallery-item',
    '.dresscode-card',
    '.footer-content',
  ].join(', ');

  sections.forEach((section, sectionIndex) => {
    section.dataset.morphIndex = String(sectionIndex);
    gsap.set(section, {
      opacity: sectionIndex === 0 ? 1 : 0,
      yPercent: sectionIndex === 0 ? 0 : 100,
      scale: 1,
      filter: 'blur(0px)',
      zIndex: sectionIndex === 0 ? 2 : 1,
    });
    section.classList.toggle('is-morph-active', sectionIndex === 0);

    if (section.id !== 'hero') {
      gsap.set(section.querySelectorAll(revealSelector), { opacity: 0, y: 14 });
    }
  });

  let current = 0;
  let animating = false;
  let touchStartY = 0;
  let touchStartX = 0;

  const dots = sections.map((section, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `morph-dot${index === 0 ? ' is-active' : ''}`;
    dot.setAttribute('aria-label', `Go to ${section.dataset.sectionTitle || section.id || `section ${index + 1}`}`);
    dot.addEventListener('click', () => goTo(index));
    dotsWrap?.appendChild(dot);
    return dot;
  });

  const updateControls = () => {
    dots.forEach((dot, index) => dot.classList.toggle('is-active', index === current));
    if (prev) prev.disabled = current === 0;
    if (next) next.disabled = current === sections.length - 1;
  };

  const revealActiveContent = (section: HTMLElement) => {
    if (section.id === 'hero') return;

    const targets = section.querySelectorAll(revealSelector);
    if (targets.length) {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.42, stagger: 0.04, ease: 'power2.out' }
      );
    }

    const line = section.querySelector('.timeline-line');
    if (line) {
      gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: 'power2.inOut' });
    }
  };

  const goTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(sections.length - 1, nextIndex));
    if (clamped === current || animating) return;

    animating = true;
    const from = sections[current];
    const to = sections[clamped];
    const direction = clamped > current ? 1 : -1;

    to.classList.add('is-morph-active');
    gsap.set(to, { zIndex: 3, yPercent: direction * 100, y: 0, scale: 1, filter: 'blur(0px)', opacity: 1 });
    gsap.set(from, { zIndex: 2 });

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        from.classList.remove('is-morph-active');
        gsap.set(from, { zIndex: 1 });
        current = clamped;
        animating = false;
        updateControls();
        revealActiveContent(to);
      },
    });

    tl.to(from, { yPercent: -direction * 100, duration: 0.86 }, 0)
      .to(to, { yPercent: 0, duration: 0.86 }, 0)
      .set(from, { opacity: 0, yPercent: direction * -100 }, 0.86);
  };

  prev?.addEventListener('click', () => goTo(current - 1));
  next?.addEventListener('click', () => goTo(current + 1));

  shell.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 18) return;
      goTo(current + (event.deltaY > 0 ? 1 : -1));
    },
    { passive: false }
  );

  shell.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0]?.clientY ?? 0;
    touchStartX = event.touches[0]?.clientX ?? 0;
  }, { passive: true });

  shell.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dy = touchStartY - touch.clientY;
    const dx = touchStartX - touch.clientX;
    if (Math.abs(dy) < 48 || Math.abs(dy) < Math.abs(dx)) return;
    goTo(current + (dy > 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      goTo(current + 1);
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      goTo(current - 1);
    }
  });

  updateControls();
}
