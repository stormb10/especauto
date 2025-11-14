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

// === ESPEC IMPORT RUN – sprite version (with lights + bounce) ===
(function () {
  const canvas = document.getElementById("importRunCanvas");
  const scoreEl = document.getElementById("importRunScore");
  const messageEl = document.getElementById("importRunMessage");
  const playBtn = document.getElementById("importRunPlay");
  const helpBtn = document.getElementById("importRunHelp");

  if (!canvas || !scoreEl || !messageEl || !playBtn || !helpBtn) return;

  const ctx = canvas.getContext("2d");

  // --- SPRITES --------------------------------------------------------

  const carImg = new Image();
  carImg.src = "assets/car.png";

  const billboardImgs = [];
  for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = "assets/billboard" + i + ".png";
    billboardImgs.push(img);
  }

  // --- ROAD GEOMETRY --------------------------------------------------

  const laneCount = 3;
  const shoulderWidth = 30;
  const roadWidth = canvas.width - shoulderWidth * 2;
  const laneWidth = roadWidth / laneCount;

  // --- PLAYER CAR -----------------------------------------------------

  const player = {
    x: 0,
    y: 0,
    width: 40,  // temporary, overwritten after image load
    height: 80,
  };

  let leftPressed = false;
  let rightPressed = false;
  const steeringSpeed = 0.26; // px per ms

  // bounce timer (visual only)
  let bounceTime = 0;

  // when the car image loads, size it with correct aspect
  carImg.onload = () => {
    const targetHeight = canvas.height * 0.18; // ~18% of canvas height
    const scale = targetHeight / carImg.naturalHeight;

    player.height = targetHeight;
    player.width = carImg.naturalWidth * scale;

    player.y = canvas.height - player.height - 24;
    player.x = laneCenterX(1, player.width);
  };

  // --- GAME STATE -----------------------------------------------------

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
  let roadScroll = 0;
  let lastPlayerRect = null;

  // --- HELPERS --------------------------------------------------------

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
    const types = ["tax", "epa", "dot", "cbp", "semi"];
    return types[Math.floor(Math.random() * types.length)];
  }

  // --- GAME FLOW ------------------------------------------------------

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
    bounceTime = 0;

    // position player using current sprite size
    player.x = laneCenterX(1, player.width);
    player.y = canvas.height - player.height - 24;

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
      let width = 26;
      let height = 32;

      if (type === "semi") {
        width = laneWidth * 0.7;
        height = 80;
      }

      obstacles.push({
        lane,
        type,
        y: -height,
        width,
        height,
      });
    } else {
      pickups.push({
        lane,
        y: -24,
        width: 22,
        height: 22,
      });
    }
  }

  function spawnBillboard() {
    const side = Math.random() < 0.5 ? "left" : "right";
    const imgIndex = Math.floor(Math.random() * billboardImgs.length);

    const boardWidth = 90;
    const boardHeight = 54;
    const overhang = 28;

    const x =
      side === "left"
        ? -overhang
        : canvas.width - boardWidth + overhang - 12;

    billboards.push({
      side,
      imgIndex,
      x,
      y: -boardHeight - 60,
      width: boardWidth,
      height: boardHeight,
    });
  }

  function gameOver() {
    running = false;
    const finalScore = Math.floor(score);
    messageEl.textContent = "Seized at customs! Score: " + finalScore;
    helpBtn.style.display = "inline-block";

    if (lastPlayerRect) {
      drawScene(lastPlayerRect);
    }
    drawGameOverOverlay(finalScore);
  }

  function loop(timestamp) {
    if (!running) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;
    bounceTime += dt;

    // Steering
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

    // Difficulty & scroll
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
      height: player.height,
    };
    lastPlayerRect = playerRect;

    // Move entities
    obstacles.forEach((o) => (o.y += speed));
    pickups.forEach((p) => (p.y += speed));
    billboards.forEach((b) => (b.y += speed * 0.7));

    // Cull
    obstacles = obstacles.filter((o) => o.y < canvas.height + 80);
    pickups = pickups.filter((p) => p.y < canvas.height + 80);
    billboards = billboards.filter((b) => b.y < canvas.height + 130);

    // Collisions: obstacles
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const oRect = {
        x: laneCenterX(o.lane, o.width),
        y: o.y,
        width: o.width,
        height: o.height,
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
        height: p.height,
      };
      if (rectsCollide(playerRect, pRect)) {
        updateScore(25);
        pickups.splice(i, 1);
      }
    }

    drawScene(playerRect);
    requestAnimationFrame(loop);
  }

  // --- DRAWING --------------------------------------------------------

  function drawScene(playerRect) {
    drawRoad();
    drawObstacles();
    drawPickups();
    drawPlayer(playerRect);  // car
    drawBillboards();        // on top → car feels under them
  }

  function drawRoad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#050609";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sidewalk / buildings
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, shoulderWidth, canvas.height);
    ctx.fillRect(canvas.width - shoulderWidth, 0, shoulderWidth, canvas.height);

    // Building texture stripes
    for (let x = 2; x < shoulderWidth; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? "#262626" : "#2d2d2d";
      ctx.fillRect(x, 0, 5, canvas.height);
    }
    for (let x = canvas.width - shoulderWidth + 1; x < canvas.width - 2; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? "#262626" : "#2d2d2d";
      ctx.fillRect(x, 0, 5, canvas.height);
    }

    // Road base gradient
    const roadGradient = ctx.createLinearGradient(
      shoulderWidth,
      0,
      shoulderWidth,
      canvas.height
    );
    roadGradient.addColorStop(0, "#3c4250");
    roadGradient.addColorStop(0.5, "#363b48");
    roadGradient.addColorStop(1, "#313643");
    ctx.fillStyle = roadGradient;
    ctx.fillRect(shoulderWidth, 0, roadWidth, canvas.height);

    // Vertical wear strips
    for (let x = shoulderWidth + 5; x < shoulderWidth + roadWidth; x += 16) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(x, 0, 6, canvas.height);
    }

    // Outer solid lines
    ctx.strokeStyle = "#d7dde6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shoulderWidth + 2, 0);
    ctx.lineTo(shoulderWidth + 2, canvas.height);
    ctx.moveTo(shoulderWidth + roadWidth - 2, 0);
    ctx.lineTo(shoulderWidth + roadWidth - 2, canvas.height);
    ctx.stroke();

    // Rumble strips
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.moveTo(shoulderWidth + 6, 0);
    ctx.lineTo(shoulderWidth + 6, canvas.height);
    ctx.moveTo(shoulderWidth + roadWidth - 6, 0);
    ctx.lineTo(shoulderWidth + roadWidth - 6, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Road bands (movement)
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let y = -roadScroll; y < canvas.height; y += 26) {
      ctx.fillRect(shoulderWidth, y, roadWidth, 2);
    }

    // Yellow lane lines (scrolling)
    ctx.strokeStyle = "#ffd65f";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -roadScroll * 0.8;
    for (let i = 1; i < laneCount; i++) {
      const x = shoulderWidth + i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Light poles + beams (replacing crosswalks)
    const lightSpacing = 170;
    for (let base = -lightSpacing; base < canvas.height + lightSpacing; base += lightSpacing) {
      const y = base + (roadScroll * 0.9);

      // Left pole
      const leftPoleX = shoulderWidth - 10;
      const rightPoleX = shoulderWidth + roadWidth + 6;

      ctx.fillStyle = "#555";
      ctx.fillRect(leftPoleX, y, 3, 18);
      ctx.fillRect(rightPoleX, y, 3, 18);

      // Light beams (simple trapezoids on road)
      ctx.fillStyle = "rgba(255, 240, 180, 0.12)";
      ctx.beginPath();
      ctx.moveTo(leftPoleX + 1, y + 18);
      ctx.lineTo(leftPoleX + 16, y + 18);
      ctx.lineTo(shoulderWidth + 30, y + 80);
      ctx.lineTo(shoulderWidth + 8, y + 80);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(rightPoleX + 1, y + 18);
      ctx.lineTo(rightPoleX - 16, y + 18);
      ctx.lineTo(shoulderWidth + roadWidth - 8, y + 80);
      ctx.lineTo(shoulderWidth + roadWidth - 30, y + 80);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPlayer(r) {
    // tiny bounce, visual only
    const bounce = Math.sin(bounceTime * 0.008) * 2.5;
    const displayY = r.y + bounce;

    // small, tight shadow (no big rectangle)
    const shadowWidth = r.width * 0.7;
    const shadowX = r.x + r.width * 0.15;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(shadowX, displayY + r.height - 10, shadowWidth, 5);

    if (carImg.complete && carImg.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(carImg, r.x, displayY, r.width, r.height);
    } else {
      ctx.fillStyle = "#1cdc6e";
      ctx.fillRect(r.x, displayY, r.width, r.height);
    }
  }

  function drawObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const x = laneCenterX(o.lane, o.width);

      if (o.type === "semi") {
        const cabHeight = 24;
        const trailerHeight = o.height - cabHeight;

        // Trailer
        ctx.fillStyle = "#a0a4aa";
        ctx.fillRect(x, o.y, o.width, trailerHeight);
        ctx.fillStyle = "#7a7f86";
        ctx.fillRect(x + 3, o.y + 4, o.width - 6, trailerHeight - 8);

        ctx.fillStyle = "#5a5d64";
        ctx.fillRect(x + 4, o.y + trailerHeight - 8, o.width - 8, 4);

        // Cab
        ctx.fillStyle = "#50545d";
        ctx.fillRect(x, o.y + trailerHeight, o.width, cabHeight);
        ctx.fillStyle = "#2d3138";
        ctx.fillRect(
          x + 2,
          o.y + trailerHeight + 4,
          o.width - 4,
          cabHeight - 8
        );

        ctx.fillStyle = "#9be5ff";
        ctx.fillRect(x + 4, o.y + trailerHeight + 4, o.width - 8, 5);

        ctx.fillStyle = "#fffbd1";
        ctx.fillRect(x + 4, o.y + o.height - 3, 4, 2);
        ctx.fillRect(x + o.width - 8, o.y + o.height - 3, 4, 2);
      } else {
        const centerX = x + o.width / 2;
        const centerY = o.y + o.height / 2;
        const radius = Math.min(o.width, o.height) / 2;

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

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = color;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
        ctx.restore();

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
      const img = billboardImgs[b.imgIndex];

      // billboard sprite
      if (img && img.complete && img.naturalWidth) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, b.x, b.y, b.width, b.height);
      } else {
        ctx.fillStyle = "#30353f";
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.width, b.height);
      }

      // pole under billboard so it feels anchored
      const poleX =
        b.side === "left"
          ? shoulderWidth + 8
          : shoulderWidth + roadWidth - 12;
      ctx.fillStyle = "#444";
      ctx.fillRect(poleX, b.y + b.height, 4, 26);
    }
  }

  // --- GAME OVER OVERLAY ----------------------------------------------

  function drawGameOverOverlay(finalScore) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const title = "SEIZED BY CUSTOMS!";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000";
    ctx.strokeText(title, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = "#ffd93b";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

    const scoreText = "Score: " + finalScore;
    ctx.font = "bold 14px sans-serif";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctx.strokeText(scoreText, canvas.width / 2, canvas.height / 2 + 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(scoreText, canvas.width / 2, canvas.height / 2 + 5);

    const hint = "Click / tap or press Play to try again";
    ctx.font = "11px sans-serif";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.strokeText(hint, canvas.width / 2, canvas.height / 2 + 28);
    ctx.fillStyle = "#e0e0e0";
    ctx.fillText(hint, canvas.width / 2, canvas.height / 2 + 28);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  // --- CONTROLS -------------------------------------------------------

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
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const mid = rect.width / 2;
    const nudge = laneWidth * 0.7;

    if (x < mid) player.x -= nudge;
    else player.x += nudge;

    const minX = shoulderWidth + 4;
    const maxX = shoulderWidth + roadWidth - player.width - 4;
    if (player.x < minX) player.x = minX;
    if (player.x > maxX) player.x = maxX;
  }

  canvas.addEventListener("click", (e) => {
    if (!running) resetGame();
    else handleTapImpulse(e.clientX);
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      if (!running) resetGame();
      else handleTapImpulse(touch.clientX);
    },
    { passive: true }
  );

  playBtn.addEventListener("click", resetGame);

  helpBtn.addEventListener("click", () => {
    const contact = document.getElementById("contact");
    if (contact && contact.scrollIntoView) {
      contact.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.hash = "#contact";
    }
  });

  // --- RESPONSIVE CANVAS SIZING ---------------------------------------

  function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, 360);
    const width = Math.max(220, maxWidth);
    const aspect = canvas.height / canvas.width;
    canvas.style.width = width + "px";
    canvas.style.height = width * aspect + "px";
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Start first run
  resetGame();
})();
