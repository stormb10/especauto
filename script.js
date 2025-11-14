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
// === ESPEC IMPORT RUN – GTA-ISH TOP-DOWN VERSION v2 ===
(function () {
  const canvas = document.getElementById("importRunCanvas");
  const scoreEl = document.getElementById("importRunScore");
  const messageEl = document.getElementById("importRunMessage");
  const playBtn = document.getElementById("importRunPlay");
  const helpBtn = document.getElementById("importRunHelp");

  // Safety: if game elements don't exist, do nothing
  if (!canvas || !scoreEl || !messageEl || !playBtn || !helpBtn) return;

  const ctx = canvas.getContext("2d");

  // --- ROAD GEOMETRY ---
  const laneCount = 3;
  const shoulderWidth = 30;                     // left/right shoulders
  const roadWidth = canvas.width - shoulderWidth * 2;
  let laneWidth = roadWidth / laneCount;

  // --- PLAYER CAR (continuous X, not lane-locked) ---
  const player = {
    x: shoulderWidth + roadWidth / 2,           // center; will be reset
    width: 26,
    height: 48,
    y: canvas.height - 80
  };

  // steering flags
  let leftPressed = false;
  let rightPressed = false;
  const steeringSpeed = 0.25; // px per ms (~250px/s)

  // --- GAME STATE ---
  let obstacles = [];
  let pickups = [];
  let billboards = [];
  let lastSpawn = 0;
  let lastBillboardSpawn = 0;
  let spawnInterval = 900;      // ms between obstacles/pickups
  let billboardInterval = 2600; // ms between billboards
  let speed = 2.3;
  let running = false;
  let lastTime = 0;
  let score = 0;

  const billboardTexts = [
    "Fees",
    "Legal",
    "ESpec",
    "25yr",
    "No fees"
  ];

  // Center X for a lane, given object width
  function laneCenterX(laneIndex, objWidth) {
    const laneStart = shoulderWidth + laneIndex * laneWidth;
    return laneStart + (laneWidth - objWidth) / 2;
  }

  // --- CORE GAME FUNCTIONS ---

  function resetGame() {
    obstacles = [];
    pickups = [];
    billboards = [];
    lastSpawn = 0;
    lastBillboardSpawn = 0;
    speed = 2.3;
    spawnInterval = 900;
    score = 0;

    // start the car in middle lane
    player.x = laneCenterX(1, player.width);

    running = true;
    lastTime = performance.now();
    messageEl.textContent = "Avoid TAX / EPA / DOT / CBP, grab the green 25s!";
    updateScore(0);
    playBtn.textContent = "Play again";
    helpBtn.style.display = "none";
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
        y: -50,
        width: 26,
        height: 30,
        type: randomObstacleType()
      });
    } else {
      pickups.push({
        lane,
        y: -30,
        width: 20,
        height: 20
      });
    }
  }

  function spawnBillboard() {
    const side = Math.random() < 0.5 ? "left" : "right";
    const text = billboardTexts[Math.floor(Math.random() * billboardTexts.length)];
    const margin = 4;
    const boardWidth = shoulderWidth - margin * 2;
    const boardHeight = 36;
    const x = side === "left" ? margin : canvas.width - shoulderWidth + margin;

    billboards.push({
      x,
      y: -boardHeight - 20,
      width: boardWidth,
      height: boardHeight,
      text,
      side
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

    // Steering – hold key to slide across lanes
    let steerDir = 0;
    if (leftPressed && !rightPressed) steerDir = -1;
    if (rightPressed && !leftPressed) steerDir = 1;

    if (steerDir !== 0) {
      player.x += steerDir * steeringSpeed * dt;
      const minX = shoulderWidth + 4;
      const maxX = shoulderWidth + roadWidth - player.width - 4;
      if (player.x < minX) player.x = minX;
      if (player.x > maxX) player.x = maxX;
    }

    // Gradually ramp difficulty
    updateScore(dt / 100);
    speed += dt * 0.00003;
    spawnInterval = Math.max(430, spawnInterval - dt * 0.0045);

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

    const playerRect = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height
    };

    // Move everything down
    for (let o of obstacles) o.y += speed;
    for (let p of pickups) p.y += speed;
    for (let b of billboards) b.y += speed * 0.7;

    // Cull off-screen
    obstacles = obstacles.filter(o => o.y < canvas.height + 60);
    pickups = pickups.filter(p => p.y < canvas.height + 60);
    billboards = billboards.filter(b => b.y < canvas.height + 80);

    // Collisions: obstacles
    for (let o of obstacles) {
      const oRect = {
        x: laneCenterX(o.lane, o.width),
        y: o.y,
        width: o.width,
        height: o.height
      };
      if (rectsCollide(playerRect, oRect)) {
        gameOver();
        return;
      }
    }

    // Collisions: pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const pRect = {
        x: laneCenterX(p.lane, p.width),
        y: p.y,
        width: p.width,
        height: p.height
      };
      if (rectsCollide(playerRect, pRect)) {
        updateScore(25);
        pickups.splice(i, 1);
      }
    }

    drawScene(playerRect);
    requestAnimationFrame(loop);
  }

  // --- DRAWING ---

  function drawScene(playerRect) {
    drawRoad();
    drawBillboards();
    drawPlayer(playerRect);
    drawObstacles();
    drawPickups();
  }

  function drawRoad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Whole background
    ctx.fillStyle = "#050609";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Shoulders / sidewalks base
    ctx.fillStyle = "#191919";
    ctx.fillRect(0, 0, shoulderWidth, canvas.height);
    ctx.fillRect(canvas.width - shoulderWidth, 0, shoulderWidth, canvas.height);

    // Simple "building" texture: vertical stripes in shoulders
    for (let x = 2; x < shoulderWidth; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? "#232323" : "#272727";
      ctx.fillRect(x, 0, 5, canvas.height);
    }
    for (let x = canvas.width - shoulderWidth + 1; x < canvas.width - 2; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? "#232323" : "#272727";
      ctx.fillRect(x, 0, 5, canvas.height);
    }

    // Road base
    ctx.fillStyle = "#333642";
    ctx.fillRect(shoulderWidth, 0, roadWidth, canvas.height);

    // Road texture: faint horizontal bands
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let y = 10; y < canvas.height; y += 18) {
      ctx.fillRect(shoulderWidth, y, roadWidth, 2);
    }

    // Lane lines
    ctx.strokeStyle = "#8a8a8f";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    for (let i = 1; i < laneCount; i++) {
      const x = shoulderWidth + i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawPlayer(r) {
    // Dark shadow under car
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(r.x - 2, r.y + 6, r.width + 4, r.height - 12);

    // Main body outline
    ctx.fillStyle = "#02150b";
    ctx.fillRect(r.x - 1, r.y, r.width + 2, r.height);

    // Two-tone body for "sporty" look
    ctx.fillStyle = "#1df56b";             // main green
    ctx.fillRect(r.x, r.y + 4, r.width, r.height - 8);

    ctx.fillStyle = "#10c14c";             // darker side skirts
    ctx.fillRect(r.x, r.y + r.height - 16, r.width, 12);

    // Roof / cabin
    ctx.fillStyle = "#0f8e3b";
    ctx.fillRect(r.x + 4, r.y + 11, r.width - 8, r.height - 24);

    // Windows (slightly angled look)
    ctx.fillStyle = "#9be5ff";
    ctx.fillRect(r.x + 5, r.y + 13, r.width - 10, 7);                // windshield
    ctx.fillRect(r.x + 5, r.y + r.height - 22, r.width - 10, 7);     // rear window

    // Hood & trunk panels
    ctx.fillStyle = "#16d75b";
    ctx.fillRect(r.x + 4, r.y + 5, r.width - 8, 6);                  // hood
    ctx.fillRect(r.x + 4, r.y + r.height - 11, r.width - 8, 6);      // trunk

    // Center stripe
    ctx.fillStyle = "#eafff2";
    ctx.fillRect(r.x + r.width / 2 - 2, r.y + 6, 4, r.height - 12);

    // Headlights
    ctx.fillStyle = "#fffbd1";
    ctx.fillRect(r.x + 4, r.y + 2, 4, 3);
    ctx.fillRect(r.x + r.width - 8, r.y + 2, 4, 3);

    // Taillights
    ctx.fillStyle = "#ff4545";
    ctx.fillRect(r.x + 4, r.y + r.height - 3, 4, 2);
    ctx.fillRect(r.x + r.width - 8, r.y + r.height - 3, 4, 2);

    // Wheels
    ctx.fillStyle = "#000";
    ctx.fillRect(r.x - 3, r.y + 8, 5, 13);
    ctx.fillRect(r.x - 3, r.y + r.height - 21, 5, 13);
    ctx.fillRect(r.x + r.width - 2, r.y + 8, 5, 13);
    ctx.fillRect(r.x + r.width - 2, r.y + r.height - 21, 5, 13);

    // Little wheel highlights
    ctx.fillStyle = "#444";
    ctx.fillRect(r.x - 2, r.y + 11, 3, 5);
    ctx.fillRect(r.x - 2, r.y + r.height - 18, 3, 5);
    ctx.fillRect(r.x + r.width - 1, r.y + 11, 3, 5);
    ctx.fillRect(r.x + r.width - 1, r.y + r.height - 18, 3, 5);
  }

  function drawObstacles() {
    for (let o of obstacles) {
      const x = laneCenterX(o.lane, o.width);
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
      ctx.fillText(label, x + 2, o.y + 18);
    }
  }

  function drawPickups() {
    for (let p of pickups) {
      const x = laneCenterX(p.lane, p.width);
      ctx.fillStyle = "#33ff66";
      ctx.fillRect(x, p.y, p.width, p.height);
      ctx.fillStyle = "#000";
      ctx.font = "10px monospace";
      ctx.fillText("25", x + 3, p.y + 15);
    }
  }

  function drawBillboards() {
    ctx.font = "8px monospace";
    for (let b of billboards) {
      const poleWidth = 3;
      const poleX =
        b.side === "left"
          ? shoulderWidth - poleWidth
          : shoulderWidth + roadWidth;

      // Pole
      ctx.fillStyle = "#555";
      ctx.fillRect(poleX, b.y + b.height, poleWidth, 24);

      // Board
      ctx.fillStyle = "#101010";
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeStyle = "#33ff66";
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.width, b.height);

      // Centered short text so it doesn't hang off
      const text = b.text;
      ctx.fillStyle = "#33ff66";
      ctx.font = "8px monospace";
      let textWidth = ctx.measureText(text).width;
      let fontSize = 8;

      // If still too wide, shrink font a bit
      if (textWidth > b.width - 4) {
        fontSize = 7;
        ctx.font = fontSize + "px monospace";
        textWidth = ctx.measureText(text).width;
      }

      const textX = b.x + (b.width - textWidth) / 2;
      const textY = b.y + 14;
      ctx.fillText(text, textX, textY);
    }
  }

  function gameOver() {
    running = false;
    const finalScore = Math.floor(score);
    messageEl.textContent = "Seized at customs! Score: " + finalScore;
    helpBtn.style.display = "inline-block";
  }

  // --- CONTROLS ---

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      leftPressed = true;
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      rightPressed = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      leftPressed = false;
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      rightPressed = false;
    }
  });

  function handleTapImpulse(clientX) {
    // Simple discrete nudge per tap on mobile
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const mid = rect.width / 2;
    const nudge = laneWidth * 0.7;

    if (x < mid) {
      player.x -= nudge;
    } else {
      player.x += nudge;
    }

    const minX = shoulderWidth + 4;
    const maxX = shoulderWidth + roadWidth - player.width - 4;
    if (player.x < minX) player.x = minX;
    if (player.x > maxX) player.x = maxX;
  }

  // Click: move lanes while running, restart if stopped
  canvas.addEventListener("click", (e) => {
    if (!running) {
      resetGame();
    } else {
      handleTapImpulse(e.clientX);
    }
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      if (!running) {
        resetGame();
      } else {
        handleTapImpulse(touch.clientX);
      }
    },
    { passive: true }
  );

  playBtn.addEventListener("click", () => {
    resetGame();
  });

  helpBtn.addEventListener("click", () => {
    const contact = document.getElementById("contact");
    if (contact && contact.scrollIntoView) {
      contact.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.hash = "#contact";
    }
  });

  // --- RESPONSIVE CANVAS SIZING (no transform overlay issues) ---

  function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, 360);
    const width = Math.max(220, maxWidth);
    const aspect = canvas.height / canvas.width;
    canvas.style.width = width + "px";
    canvas.style.height = width * aspect + "px";
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Start a round immediately
  resetGame();
})();



