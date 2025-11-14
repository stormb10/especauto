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

// === ESPEC IMPORT RUN – GTA-ish v3 (stable) ===
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
  const shoulderWidth = 30; // left/right shoulders
  const roadWidth = canvas.width - shoulderWidth * 2;
  const laneWidth = roadWidth / laneCount;

  // --- PLAYER CAR (continuous X, steering by holding key) ---
  const player = {
    x: 0, // set in resetGame()
    y: canvas.height - 80,
    width: 26,
    height: 48
  };

  let leftPressed = false;
  let rightPressed = false;
  const steeringSpeed = 0.26; // px per ms (~260px/s)

  // --- GAME STATE ---
  let obstacles = [];
  let pickups = [];
  let billboards = [];
  let lastSpawn = 0;
  let lastBillboardSpawn = 0;
  let spawnInterval = 900;
  let billboardInterval = 2600;
  let speed = 2.3;
  let running = false;
  let lastTime = 0;
  let score = 0;
  let roadScroll = 0; // for crosswalks/road texture

  const billboardTexts = [
    "Avoid fees",
    "Legal import",
    "ESpec help",
    "25-year rule",
    "No surprises"
  ];

  // --- HELPERS ---

  function laneCenterX(laneIndex, objWidth) {
    const laneStart = shoulderWidth + laneIndex * laneWidth;
    return laneStart + (laneWidth - objWidth) / 2;
  }

  function rectsCollide(a, b) {
    return !(
      a.x > b.x + b.width ||
      a.x + a.width < b.x ||
      a.y > b.y + b.height ||
      a.y + a.height < b.y
    );
  }

  function randomObstacleType() {
    // include semi trucks as bigger hazards
    const types = ["tax", "epa", "dot", "cbp", "semi"];
    const idx = Math.floor(Math.random() * types.length);
    return types[idx];
  }

  // --- GAME FLOW ---

  function resetGame() {
    obstacles = [];
    pickups = [];
    billboards = [];
    lastSpawn = 0;
    lastBillboardSpawn = 0;
    spawnInterval = 900;
    speed = 2.3;
    score = 0;
    roadScroll = 0;

    // start the car in the middle lane
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

  function spawnStuff() {
    const lane = Math.floor(Math.random() * laneCount);
    const type = randomObstacleType();

    if (Math.random() < 0.72) {
      // obstacle
      let width = 24;
      let height = 28;

      if (type === "semi") {
        width = laneWidth * 0.7;
        height = 72;
      }

      obstacles.push({
        lane: lane,
        type: type,
        y: -height,
        width: width,
        height: height
      });
    } else {
      // pickup
      pickups.push({
        lane: lane,
        y: -24,
        width: 20,
        height: 20
      });
    }
  }

  function spawnBillboard() {
    const side = Math.random() < 0.5 ? "left" : "right";
    const textIndex = Math.floor(Math.random() * billboardTexts.length);
    const text = billboardTexts[textIndex];

    const margin = 4;
    const boardWidth = shoulderWidth - margin * 2;
    const boardHeight = 36;
    const x = side === "left" ? margin : canvas.width - shoulderWidth + margin;

    billboards.push({
      side: side,
      text: text,
      x: x,
      y: -boardHeight - 20,
      width: boardWidth,
      height: boardHeight
    });
  }

  function gameOver() {
    running = false;
    const finalScore = Math.floor(score);
    messageEl.textContent = "Seized at customs! Score: " + finalScore;
    helpBtn.style.display = "inline-block";
  }

  function loop(timestamp) {
    if (!running) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    // Steering (hold key)
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

    // Difficulty + road scroll
    updateScore(dt / 100);
    speed += dt * 0.00003;
    spawnInterval = Math.max(430, spawnInterval - dt * 0.0045);
    roadScroll = (roadScroll + speed * 0.9) % 160;

    // Spawning
    lastSpawn += dt;
    if (lastSpawn >= spawnInterval) {
      spawnStuff();
      lastSpawn = 0;
    }

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

    // Move entities
    obstacles.forEach(o => { o.y += speed; });
    pickups.forEach(p => { p.y += speed; });
    billboards.forEach(b => { b.y += speed * 0.7; });

    // Cull off-screen
    obstacles = obstacles.filter(o => o.y < canvas.height + 80);
    pickups = pickups.filter(p => p.y < canvas.height + 80);
    billboards = billboards.filter(b => b.y < canvas.height + 100);

    // Collisions: obstacles
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
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

    // Background
    ctx.fillStyle = "#050609";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sidewalk / building strips
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, shoulderWidth, canvas.height);
    ctx.fillRect(canvas.width - shoulderWidth, 0, shoulderWidth, canvas.height);

    // Simple building texture
    for (let x = 2; x < shoulderWidth; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? "#242424" : "#2a2a2a";
      ctx.fillRect(x, 0, 5, canvas.height);
    }
    for (let x = canvas.width - shoulderWidth + 1; x < canvas.width - 2; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? "#242424" : "#2a2a2a";
      ctx.fillRect(x, 0, 5, canvas.height);
    }

    // Road base
    ctx.fillStyle = "#343845";
    ctx.fillRect(shoulderWidth, 0, roadWidth, canvas.height);

    // Road bands
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let y = -roadScroll; y < canvas.height; y += 26) {
      ctx.fillRect(shoulderWidth, y, roadWidth, 2);
    }

    // Crosswalks
    ctx.fillStyle = "rgba(240,240,240,0.55)";
    const spacing = 160;
    for (let y = -roadScroll; y < canvas.height + spacing; y += spacing) {
      for (let x = shoulderWidth + 10; x < shoulderWidth + roadWidth - 30; x += 26) {
        ctx.fillRect(x, y + 4, 18, 4);
        ctx.fillRect(x, y + 12, 18, 4);
      }
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
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(r.x - 3, r.y + 8, r.width + 6, r.height - 14);

    // Outline
    ctx.fillStyle = "#02110b";
    ctx.fillRect(r.x - 1, r.y, r.width + 2, r.height);

    // Sporty coupe body
    ctx.fillStyle = "#19e76b"; // bright green
    ctx.fillRect(r.x, r.y + 6, r.width, r.height - 12);

    // Side skirts
    ctx.fillStyle = "#10b753";
    ctx.fillRect(r.x, r.y + r.height - 18, r.width, 12);

    // Cabin
    ctx.fillStyle = "#0f8e3b";
    ctx.fillRect(r.x + 4, r.y + 13, r.width - 8, r.height - 26);

    // Glass
    ctx.fillStyle = "#9be5ff";
    ctx.fillRect(r.x + 5, r.y + 15, r.width - 10, 7);               // windshield
    ctx.fillRect(r.x + 5, r.y + r.height - 26, r.width - 10, 7);    // rear window

    // Hood & trunk
    ctx.fillStyle = "#16d75b";
    ctx.fillRect(r.x + 4, r.y + 7, r.width - 8, 6);
    ctx.fillRect(r.x + 4, r.y + r.height - 13, r.width - 8, 6);

    // Racing stripe
    ctx.fillStyle = "#f0fff5";
    ctx.fillRect(r.x + r.width / 2 - 2, r.y + 7, 4, r.height - 14);

    // Headlights
    ctx.fillStyle = "#fffbd1";
    ctx.fillRect(r.x + 4, r.y + 3, 4, 3);
    ctx.fillRect(r.x + r.width - 8, r.y + 3, 4, 3);

    // Taillights
    ctx.fillStyle = "#ff4545";
    ctx.fillRect(r.x + 4, r.y + r.height - 3, 4, 2);
    ctx.fillRect(r.x + r.width - 8, r.y + r.height - 3, 4, 2);

    // Wheels
    ctx.fillStyle = "#000";
    ctx.fillRect(r.x - 3, r.y + 11, 5, 13);
    ctx.fillRect(r.x - 3, r.y + r.height - 24, 5, 13);
    ctx.fillRect(r.x + r.width - 2, r.y + 11, 5, 13);
    ctx.fillRect(r.x + r.width - 2, r.y + r.height - 24, 5, 13);

    ctx.fillStyle = "#444";
    ctx.fillRect(r.x - 2, r.y + 13, 3, 5);
    ctx.fillRect(r.x - 2, r.y + r.height - 21, 3, 5);
    ctx.fillRect(r.x + r.width - 1, r.y + 13, 3, 5);
    ctx.fillRect(r.x + r.width - 1, r.y + r.height - 21, 3, 5);
  }

  function drawObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const x = laneCenterX(o.lane, o.width);

      if (o.type === "semi") {
        // Semi truck (cab + trailer)
        const cabHeight = 22;
        const trailerHeight = o.height - cabHeight;

        // Trailer
        ctx.fillStyle = "#999c9f";
        ctx.fillRect(x, o.y, o.width, trailerHeight);
        ctx.fillStyle = "#777a7f";
        ctx.fillRect(x + 3, o.y + 4, o.width - 6, trailerHeight - 8);

        // Rear doors detail
        ctx.fillStyle = "#555";
        ctx.fillRect(x + 4, o.y + trailerHeight - 8, o.width - 8, 4);

        // Cab
        ctx.fillStyle = "#44474d";
        ctx.fillRect(x, o.y + trailerHeight, o.width, cabHeight);
        ctx.fillStyle = "#2c2f35";
        ctx.fillRect(x + 2, o.y + trailerHeight + 4, o.width - 4, cabHeight - 8);

        // Windshield
        ctx.fillStyle = "#9be5ff";
        ctx.fillRect(x + 4, o.y + trailerHeight + 4, o.width - 8, 5);

        // Headlights
        ctx.fillStyle = "#fffbd1";
        ctx.fillRect(x + 4, o.y + o.height - 3, 4, 2);
        ctx.fillRect(x + o.width - 8, o.y + o.height - 3, 4, 2);
      } else {
        // Symbol-style hazard signs
        const centerX = x + o.width / 2;
        const centerY = o.y + o.height / 2;
        const radius = Math.min(o.width, o.height) / 2;

        // Pick color/label
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
        }

        // Diamond background
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = color;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
        ctx.restore();

        // Label
        ctx.fillStyle = "#000";
        ctx.font = "9px monospace";
        const textWidth = ctx.measureText(label).width;
        ctx.fillText(label, centerX - textWidth / 2, centerY + 3);
      }
    }
  }

  function drawPickups() {
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      const x = laneCenterX(p.lane, p.width);
      const cx = x + p.width / 2;
      const cy = p.y + p.height / 2;
      const r = p.width / 2;

      // Coin-style pickup
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#2bff7b";
      ctx.fill();
      ctx.strokeStyle = "#0e8536";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "9px monospace";
      const text = "25";
      const w = ctx.measureText(text).width;
      ctx.fillText(text, cx - w / 2, cy + 3);
    }
  }

  function drawBillboards() {
    for (let i = 0; i < billboards.length; i++) {
      const b = billboards[i];

      // Poles attach to the road edge
      const roadEdge =
        b.side === "left"
          ? shoulderWidth
          : shoulderWidth + roadWidth;

      ctx.fillStyle = "#555";
      // two poles
      ctx.fillRect(roadEdge - (b.side === "left" ? 4 : -1), b.y + b.height, 3, 24);
      ctx.fillRect(roadEdge - (b.side === "left" ? 12 : -9), b.y + b.height, 3, 24);

      // Board
      ctx.fillStyle = "#101010";
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeStyle = "#33ff66";
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.width, b.height);

      // Top header bar
      ctx.fillStyle = "#0b3519";
      ctx.fillRect(b.x, b.y, b.width, 7);

      // Little "lights"
      ctx.fillStyle = "#e8ffe8";
      ctx.fillRect(b.x + 4, b.y + 2, 3, 3);
      ctx.fillRect(b.x + b.width - 7, b.y + 2, 3, 3);

      // Text
      let text = b.text;
      let fontSize = 8;
      ctx.fillStyle = "#33ff66";
      ctx.font = fontSize + "px monospace";
      let w = ctx.measureText(text).width;

      while (w > b.width - 6 && fontSize > 6) {
        fontSize -= 1;
        ctx.font = fontSize + "px monospace";
        w = ctx.measureText(text).width;
      }

      const textX = b.x + (b.width - w) / 2;
      const textY = b.y + b.height / 2 + fontSize / 2 - 2;
      ctx.fillText(text, textX, textY);
    }
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
    // discrete nudge for mobile taps
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

  // --- RESPONSIVE CANVAS SIZING ---

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


