// Fade logic: no text at first. As you start scrolling, subtitle + CTA fade in,
// and the hero image gently dims via overlay.

(function(){
  const overlay = document.getElementById('heroOverlay');
  const hero = document.getElementById('hero');
  const sub = document.querySelector('.hero-sub');
  const cta = document.querySelector('.cta');

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function onScroll(){
    const heroRect = hero.getBoundingClientRect();
    const vh = window.innerHeight;

    // How far through the hero have we scrolled? 0 at top, 1 when past hero
    const scrolled = clamp((vh - heroRect.bottom + vh) / vh, 0, 1);

    // Overlay opacity: start clear (0) at top, dim to ~0.45 as you move down the hero
    const minO = 0.0;
    const maxO = 0.45;
    const o = clamp(minO + scrolled * (maxO - minO), minO, maxO);
    overlay.style.opacity = o.toFixed(3);

    // Subtitle + CTA: fade in between 8% and 35% scroll of the hero
    const start = 0.08, end = 0.35;
    const t = clamp((scrolled - start) / (end - start), 0, 1);
    const easing = t * (2 - t); // easeOutQuad

    const opacity = easing;
    const translate = (1 - easing) * 14; // px upward as it fades in

    sub.style.opacity = opacity.toFixed(3);
    sub.style.transform = `translateY(${translate.toFixed(1)}px)`;

    cta.style.opacity = opacity.toFixed(3);
    cta.style.transform = `translateY(${translate.toFixed(1)}px)`;
  }

  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  window.addEventListener('resize', onScroll);

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();
})();
