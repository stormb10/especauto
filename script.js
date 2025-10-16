// Fade logic: no text at first. As you start scrolling, subtitle + CTA fade in,
// and the hero image gently dims via overlay.

(function(){
  const overlay = document.getElementById('heroOverlay');
  const hero = document.getElementById('hero');
  const sub = document.querySelector('.hero-sub');
  const cta = document.querySelector('.cta');

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function onScroll(){
  const heroH = hero.offsetHeight;
  const vh = window.innerHeight;

  // Progress through the hero only (0 at top, 1 when you pass the hero)
  const progress = clamp(window.scrollY / Math.max(1, (heroH - vh)), 0, 1);

  // Overlay opacity: 0 at top → 0.45 by the time you've scrolled past the hero
  const minO = 0.0, maxO = 0.45;
  const o = clamp(minO + progress * (maxO - minO), minO, maxO);
  overlay.style.opacity = o.toFixed(3);

  // Subtitle + CTA fade in between 8% and 35% of hero scroll
  const start = 0.08, end = 0.35;
  const t = clamp((progress - start) / (end - start), 0, 1);
  const easing = t * (2 - t); // easeOutQuad
  const opacity = easing;
  const translate = (1 - easing) * 14; // px

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
