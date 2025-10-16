// Fade the hero overlay as user scrolls into About
(function(){
  const overlay = document.getElementById('heroOverlay');
  const hero = document.getElementById('hero');
  const about = document.getElementById('about');

  function onScroll(){
    const heroBottom = hero.getBoundingClientRect().bottom;
    const vh = window.innerHeight;
    // When the top of About approaches, reduce hero overlay opacity
    const distance = Math.max(0, Math.min(vh, heroBottom)); // clamp 0..vh
    const progress = 1 - (distance / vh); // 0 at top, 1 when scrolled past
    const opacity = Math.max(0.0, Math.min(1.0, 1 - progress * 1.0)); // fade out to reveal page
    overlay.style.opacity = opacity.toFixed(3);
  }

  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  window.addEventListener('resize', onScroll);
})();

// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();
