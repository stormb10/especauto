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
   // Make it lighter at the very top and get darker as we scroll down the hero
const min = 0.15;   // overlay opacity at the very top (lighter)
const max = 0.85;   // overlay opacity when you've scrolled past the hero (darker)
const opacity = Math.min(max, Math.max(min, min + progress * (max - min)));
overlay.style.opacity = opacity.toFixed(3);


  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  window.addEventListener('resize', onScroll);
})();

// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();
