// Header stays hidden on landing. As you scroll a little, header slides in,
// hero overlay gently dims image, and hero text fades in.

(function(){
  const header = document.querySelector('.site-header');
  const overlay = document.getElementById('heroOverlay');
  const hero = document.getElementById('hero');
  const title = document.querySelector('.hero-title');
  const sub = document.querySelector('.hero-sub');
  const cta = document.querySelector('.cta');

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function onScroll(){
    const heroH = hero.offsetHeight;
    const vh = window.innerHeight;

    // Progress through the hero only (0 at top, 1 when you pass the hero)
    const progress = clamp(window.scrollY / Math.max(1, (heroH - vh)), 0, 1);

    // Show header after a small scroll so it slides in
    if (progress > 0.08) {
      document.body.classList.add('header-on');
    } else {
      document.body.classList.remove('header-on');
    }

    // Overlay opacity: bright (0) at top → dim (0.45) near bottom of hero
    const minO = 0.0, maxO = 0.45;
    const o = clamp(minO + progress * (maxO - minO), minO, maxO);
    overlay.style.opacity = o.toFixed(3);

    // Fade in hero title + subtitle + buttons together (8% → 35% of hero)
    const start = 0.08, end = 0.35;
    const t = clamp((progress - start) / (end - start), 0, 1);
    const easing = t * (2 - t); // easeOutQuad
    const opacity = easing;
    const translate = (1 - easing) * 14; // px upward motion

    [title, sub, cta].forEach(el => {
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translateY(${translate.toFixed(1)}px)`;
    });
  }

  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  window.addEventListener('resize', onScroll);

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();
})();

// === ESPEC IMPORT RUN GAME ===
(function () {
  const canvas = document.getElementById("importRunCanvas");
  const scoreEl = document.getElementById("importRunScore");
  const messageEl = document.getElementById("importRunMessage");
  const playBtn = document.getElementById("importRunPlay");
  const helpBtn = document.getElementById("importRunHelp");

  // If the game section isn't on this page, don't run anything.
  if (!canvas || !scoreEl || !messageEl || !playBtn || !helpBtn) return;

  const ctx = canvas.getContext("2d");

  const laneCount = 3;
  let laneWidth = canvas.width / laneCount;

  const player = {
    lane: 1, // 0,1,2
    width: 30,
    height: 40,
    y: canvas.height - 60,
  };

  let obstacles = [];
  let pickups = [];
  let billboards = [];
  let lastSpawn = 0;
  let lastBillboardSpawn = 0;
  let spawnInterval = 900; // ms
  let billboardInterval = 2500; // ms
  let speed = 2;
  let running = false;
  let lastTime = 0;
  let score = 0;

  const billboardTexts = [
    "Avoid surprise costs",
    "Legal imports only",
    "ESpec has your back",
    "25-year rule pro",
    "From EU to US right",
  ];

  function resetGame() {
    console.log("ESpec Import Run: game started");
    obstacles = [];
    pickups = [];
    billboards = [];
    lastSpawn = 0;
    lastBillboardSpawn = 0;
    speed = 2;
    spawnInterval = 900;
    score = 0;
    player.lane = 1;
    running = true;
    lastTime = performance.now();
    messageEl.textContent = "Avoid the red blocks, grab the green 25s!";
    updateScore(0);
    playBtn.textContent = "Play again";
    helpBtn.style.display = "none";

    // Kick off the loop
    requestAnimationFrame(loop);
  }

  function updateScore(delta) {
    score += delta;
    scoreEl.textContent = "Score: " + Math.floor(score);
  }

  function randomObstacleType() {
    const types = ["tax", "epa", "dot", "cbp", "truck"];
    return types[Math.floor(Math.random() * types.length)];
  }

  function spawnStuff() {
    const lane = Math.floor(Math.random() * laneCount);
    if (Math.random() < 0.7) {
      obstacles.push({
        lane,
        y: -40,
        width: 30,
        height: 30,
        type: randomObstacleType(),
      });
    } else {
      pickups.push({
        lane,
        y: -30,
        width: 24,
        height: 24,
      });
    }
  }

  function spawnBillboard() {
    const side = Math.random() < 0.5 ? "left" : "right";
    const text =
      billboardTexts[Math.floor(Math.random() * billboardTexts.length)];
    const width = 70;
    const height = 40;
    const margin = 5;
    const x = side === "left" ? margin : canvas.width - width - margin;

    billboards.push({
      x,
      y: -height,
      width,
      height,
      text,
      side,
    });
  }

  function rectsCollide(a, b) {
    return !(
      a.x > b.x + b.width ||
      a.x + a.width < b.x ||
      a.y > b.y + b.height ||
      a.y + a.height < b.y
    );
  }

  function loop(timestamp) {
    if (!running) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    // Difficulty ramp
    updateScore(dt / 100);
    speed += dt * 0.00003;
    spawnInterval = Math.max(450, spawnInterval - dt * 0.005);

    // Spawn obstacles / pickups
    lastSpawn += dt;
    if (lastSpawn >= spawnInterval) {
      spawnStuff();
      lastSpawn = 0;
    }

    // Spawn billboards
    lastBillboardSpawn += dt;
    if (lastBillboardSpawn >= billboardInterval) {
      spawnBillboard();
      lastBillboardSpawn = 0;
    }

    const playerX = player.lane * laneWidth + (laneWidth - player.width) / 2;
    const playerRect = {
      x: playerX,
      y: player.y,
      width: player.width,
      height: player.height,
    };

    // Move elements
    for (let o of obstacles) o.y += speed;
    for (let p of pickups) p.y += speed;
    for (let b of billboards) b.y += speed * 0.8;

    // Remove off-screen
    obstacles = obstacles.filter((o) => o.y < canvas.height + 50);
    pickups = pickups.filter((p) => p.y < canvas.height + 50);
    billboards = billboards.filter((b) => b.y < canvas.height + 60);

    // Collisions with obstacles
    for (let o of obstacles) {
      const oRect = {
        x: o.lane * laneWidth + (laneWidth - o.width) / 2,
        y: o.y,
        width: o.width,
        height: o.height,
      };
      if (rectsCollide(playerRect, oRect)) {
        gameOver();
        return;
      }
    }

    // Collisions with pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const pRect = {
        x: p.lane * laneWidth + (laneWidth - p.width) / 2,
        y: p.y,
        width: p.width,
        height: p.height,
      };
      if (rectsCollide(playerRect, pRect)) {
        updateScore(25); // 25-year rule bonus
        pickups.splice(i, 1);
      }
    }

    // Draw everything
    drawRoad();
    drawBillboards();
    drawPlayer(playerRect);
    drawObstacles();
    drawPickups();

    requestAnimationFrame(loop);
  }

  function drawRoad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lane lines
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    for (let i = 1; i < laneCount; i++) {
      const x = i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawPlayer(r) {
    // Green E9-ish 8-bit silhouette

    // Base body
    ctx.fillStyle = "#33ff66";
    ctx.fillRect(r.x, r.y + 8, r.width, r.height - 16);

    // Roof / cabin
    ctx.fillStyle = "#22aa44";
    ctx.fillRect(r.x + 4, r.y + 12, r.width - 8, r.height - 24);

    // Windows stripe
    ctx.fillStyle = "#99e0ff";
    ctx.fillRect(r.x + 6, r.y + 16, r.width - 12, 6);

    // Front & rear bumpers
    ctx.fillStyle = "#111";
    ctx.fillRect(r.x + 2, r.y + 4, r.width - 4, 4);
    ctx.fillRect(r.x + 2, r.y + r.height - 8, r.width - 4, 4);

    // Wheels
    ctx.fillStyle = "#000";
    ctx.fillRect(r.x + 3, r.y + 10, 6, 10);
    ctx.fillRect(r.x + r.width - 9, r.y + 10, 6, 10);
    ctx.fillRect(r.x + 3, r.y + r.height - 20, 6, 10);
    ctx.fillRect(r.x + r.width - 9, r.y + r.height - 20, 6, 10);
  }

  function drawObstacles() {
    for (let o of obstacles) {
      const x = o.lane * laneWidth + (laneWidth - o.width) / 2;
      let color = "#ff3344";
      let label = "TAX";

      if (o.type === "epa") {
        color = "#ff8800";
        label = "EPA";
      } else if (o.type === "dot") {
        color = "#4488ff";
        label = "DOT";
      } else if (o.type === "cbp") {
        color = "#aa55ff";
        label = "CBP";
      } else if (o.type === "truck") {
        color = "#bbbbbb";
        label = "TRK";
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, o.y, o.width, o.height);

      ctx.fillStyle = "#000";
      ctx.font = "10px monospace";
      ctx.fillText(label, x + 3, o.y + 18);
    }
  }

  function drawPickups() {
    for (let p of pickups) {
      const x = p.lane * laneWidth + (laneWidth - p.width) / 2;
      ctx.fillStyle = "#33ff66";
      ctx.fillRect(x, p.y, p.width, p.height);
      ctx.fillStyle = "#000";
      ctx.font = "10px monospace";
      ctx.fillText("25", x + 5, p.y + 17);
    }
  }

  function drawBillboards() {
    ctx.font = "8px monospace";
    for (let b of billboards) {
      // Pole
      const poleX = b.side === "left" ? b.x + b.width - 5 : b.x + 5;
      ctx.fillStyle = "#666";
      ctx.fillRect(poleX, b.y + b.height, 3, 20);

      // Board
      ctx.fillStyle = "#111";
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeStyle = "#33ff66";
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.width, b.height);

      ctx.fillStyle = "#33ff66";
      const textX = b.x + 4;
      const textY = b.y + 14;
      ctx.fillText(b.text, textX, textY);
    }
  }

  function gameOver() {
    running = false;
    const finalScore = Math.floor(score);
    messageEl.textContent = "Seized at customs! Score: " + finalScore;
    helpBtn.style.display = "inline-block";
  }

  // Controls: keyboard
  window.addEventListener("keydown", (e) => {
    if (!running) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      player.lane = Math.max(0, player.lane - 1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      player.lane = Math.min(laneCount - 1, player.lane + 1);
    }
  });

  // Controls: click / touch
  function handleTap(clientX) {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < rect.width / 2) {
      player.lane = Math.max(0, player.lane - 1);
    } else {
      player.lane = Math.min(laneCount - 1, player.lane + 1);
    }
  }

  canvas.addEventListener("click", (e) => {
    handleTap(e.clientX);
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      handleTap(touch.clientX);
    },
    { passive: true }
  );

  // Buttons
  playBtn.addEventListener("click", () => {
    resetGame();
  });

  helpBtn.addEventListener("click", () => {
    // Smooth scroll to the brief form
    const contact = document.getElementById("contact");
    if (contact && contact.scrollIntoView) {
      contact.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.hash = "#contact";
    }
  });

  // Responsive scaling for the canvas (keeps 8-bit look)
  function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, 360);
    const scale = maxWidth / canvas.width;
    canvas.style.transformOrigin = "top center";
    canvas.style.transform = "scale(" + scale + ")";
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Draw a static scene before the first play so it doesn't look "blank"
  drawRoad();
  const initialPlayerRect = {
    x: player.lane * laneWidth + (laneWidth - player.width) / 2,
    y: player.y,
    width: player.width,
    height: player.height,
  };
  drawPlayer(initialPlayerRect);
})();

