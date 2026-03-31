/* ═══════════════════════════════════════════════════
   THEME SYSTEM
   ═══════════════════════════════════════════════════ */

const THEMES = {
  light: {
    label: 'Light',
    swatch: '#f6f3ee',
    colorMode: 'light',
    background: null
  },
  dark: {
    label: 'Dark',
    swatch: '#07273F',
    colorMode: 'dark',
    background: null
  },
  starryNight: {
    label: 'Starry Night',
    swatch: '#0b0e2a',
    colorMode: 'dark',
    background: 'starfield'
  },
  growingTree: {
    label: 'Growing Tree',
    swatch: '#4a8c3f',
    colorMode: 'light',
    background: 'growingTree'
  }
};

/* ─── Background layer management ─── */
let activeBackground = null;
let bgCanvas = null;
let bgCtx = null;
let bgAnimId = null;

function setBgTransparency(transparent) {
  const appEl = document.querySelector('.app');
  // Disable transition to prevent animation artifacts with transparent
  document.body.style.transition = 'none';
  if (appEl) appEl.style.transition = 'none';
  if (transparent) {
    document.body.style.background = 'transparent';
    if (appEl) appEl.style.background = 'transparent';
  } else {
    document.body.style.background = '';
    if (appEl) appEl.style.background = '';
    // Re-enable transition after a frame so the solid color snaps in
    requestAnimationFrame(() => {
      document.body.style.transition = '';
      if (appEl) appEl.style.transition = '';
    });
  }
}

function createBgCanvas() {
  if (bgCanvas) return;
  bgCanvas = document.createElement('canvas');
  bgCanvas.id = 'themeBgCanvas';
  bgCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.prepend(bgCanvas);
  setBgTransparency(true);
  bgCtx = bgCanvas.getContext('2d');
  resizeBgCanvas();
}

function removeBgCanvas() {
  if (bgAnimId) { cancelAnimationFrame(bgAnimId); bgAnimId = null; }
  stopShootingStarTimer();
  removeBonsaiSVG();
  if (bgCanvas) { bgCanvas.remove(); bgCanvas = null; bgCtx = null; }
  setBgTransparency(false);
  // Clear any inline color overrides from Growing Tree's day/night cycle
  const timerArea = document.getElementById('timerArea');
  if (timerArea) {
    timerArea.style.color = '';
    timerArea.querySelectorAll('.timer-controls button').forEach(btn => { btn.style.color = ''; });
  }
  activeBackground = null;
}

function resizeBgCanvas() {
  if (!bgCanvas) return;
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  // Re-init stars if starfield active (positions depend on canvas size)
  if (activeBackground === 'starfield') {
    stars = [];
    const count = Math.floor((bgCanvas.width * bgCanvas.height) / 2400);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        r: Math.random() * 1.5 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.3,
        alpha: 0,
        twinkleSpeed: Math.random() * 0.008 + 0.003,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }
  // Re-init clouds and stars if growing tree active
  if (activeBackground === 'growingTree') {
    initTreeClouds();
    initTwilightStars();
    positionBonsaiSVG();
  }
}

window.addEventListener('resize', resizeBgCanvas);

/* ═══════════════════════════════════════════════════
   STARFIELD BACKGROUND
   ═══════════════════════════════════════════════════ */
let stars = [];
let shootingStars = [];

function initStarfield() {
  createBgCanvas();
  activeBackground = 'starfield';
  bgCanvas.style.background = 'linear-gradient(180deg, #0b0e2a 0%, #1a1040 40%, #0d1137 100%)';
  stars = [];
  const count = Math.floor((window.innerWidth * window.innerHeight) / 2400);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      r: Math.random() * 1.5 + 0.3,
      baseAlpha: Math.random() * 0.6 + 0.3,
      alpha: 0,
      twinkleSpeed: Math.random() * 0.008 + 0.003,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
  shootingStars = [];
  renderStarfield();
  // Start random shooting star timer
  scheduleNextShootingStar();
}

function renderStarfield() {
  if (activeBackground !== 'starfield' || !bgCtx) return;
  const W = bgCanvas.width;
  const H = bgCanvas.height;
  const now = performance.now() / 1000;

  bgCtx.clearRect(0, 0, W, H);

  // Stars
  for (const s of stars) {
    s.alpha = s.baseAlpha + Math.sin(now * s.twinkleSpeed * 60 + s.twinkleOffset) * 0.3;
    s.alpha = Math.max(0.05, Math.min(1, s.alpha));
    bgCtx.beginPath();
    bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    bgCtx.fill();
  }

  // Shooting stars
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const ss = shootingStars[i];
    const elapsed = now - ss.startTime;
    const progress = elapsed / ss.duration;

    if (progress > 1) {
      shootingStars.splice(i, 1);
      continue;
    }

    const x = ss.x0 + (ss.x1 - ss.x0) * progress;
    const y = ss.y0 + (ss.y1 - ss.y0) * progress;

    // Fade in then out
    const fade = progress < 0.15 ? progress / 0.15
               : progress > 0.7 ? (1 - progress) / 0.3
               : 1;

    // Outer glow (large warm halo)
    const glowR = window.innerWidth < 480 ? 20 : 40;
    const outerGlow = bgCtx.createRadialGradient(x, y, 0, x, y, glowR);
    outerGlow.addColorStop(0, `rgba(255, 200, 100, ${0.4 * fade})`);
    outerGlow.addColorStop(0.3, `rgba(255, 150, 50, ${0.15 * fade})`);
    outerGlow.addColorStop(1, `rgba(255, 100, 20, 0)`);
    bgCtx.beginPath();
    bgCtx.arc(x, y, glowR, 0, Math.PI * 2);
    bgCtx.fillStyle = outerGlow;
    bgCtx.fill();

    // Fireball head — bright white-hot core with orange rim
    const headGrad = bgCtx.createRadialGradient(x, y, 0, x, y, 16);
    headGrad.addColorStop(0, `rgba(255, 255, 255, ${fade})`);
    headGrad.addColorStop(0.25, `rgba(255, 240, 200, ${0.9 * fade})`);
    headGrad.addColorStop(0.5, `rgba(255, 180, 60, ${0.7 * fade})`);
    headGrad.addColorStop(0.8, `rgba(255, 100, 20, ${0.3 * fade})`);
    headGrad.addColorStop(1, `rgba(255, 60, 10, 0)`);
    bgCtx.beginPath();
    bgCtx.arc(x, y, 16, 0, Math.PI * 2);
    bgCtx.fillStyle = headGrad;
    bgCtx.fill();

    // Trail — wide fiery streak
    const tailLen = ss.tailLength * fade;
    const angle = Math.atan2(ss.y1 - ss.y0, ss.x1 - ss.x0);
    const tx = x - Math.cos(angle) * tailLen;
    const ty = y - Math.sin(angle) * tailLen;

    // Wide outer trail (orange glow)
    const outerTrail = bgCtx.createLinearGradient(x, y, tx, ty);
    outerTrail.addColorStop(0, `rgba(255, 160, 40, ${0.5 * fade})`);
    outerTrail.addColorStop(0.3, `rgba(255, 100, 20, ${0.25 * fade})`);
    outerTrail.addColorStop(1, 'rgba(255, 60, 10, 0)');
    bgCtx.beginPath();
    bgCtx.moveTo(x, y);
    bgCtx.lineTo(tx, ty);
    bgCtx.strokeStyle = outerTrail;
    bgCtx.lineWidth = 8;
    bgCtx.lineCap = 'round';
    bgCtx.stroke();

    // Bright inner trail (white-yellow core)
    const innerTrail = bgCtx.createLinearGradient(x, y, tx, ty);
    innerTrail.addColorStop(0, `rgba(255, 255, 220, ${0.8 * fade})`);
    innerTrail.addColorStop(0.4, `rgba(255, 200, 100, ${0.35 * fade})`);
    innerTrail.addColorStop(1, 'rgba(255, 180, 60, 0)');
    bgCtx.beginPath();
    bgCtx.moveTo(x, y);
    bgCtx.lineTo(tx, ty);
    bgCtx.strokeStyle = innerTrail;
    bgCtx.lineWidth = 3;
    bgCtx.stroke();
    bgCtx.lineCap = 'butt';
  }

  bgAnimId = requestAnimationFrame(renderStarfield);
}

let shootingStarTimer = null;
let nextShootingStarTime = 0;

function scheduleNextShootingStar() {
  // Random interval between 30-60 seconds
  const delay = (30 + Math.random() * 30) * 1000;
  nextShootingStarTime = Date.now() + delay;
  shootingStarTimer = setTimeout(() => {
    triggerShootingStar();
    // Schedule the next one if still in starfield mode
    if (activeBackground === 'starfield') {
      scheduleNextShootingStar();
    }
  }, delay);
}

function stopShootingStarTimer() {
  if (shootingStarTimer) {
    clearTimeout(shootingStarTimer);
    shootingStarTimer = null;
  }
}

function triggerShootingStar() {
  if (activeBackground !== 'starfield' || !bgCanvas) return;
  const W = bgCanvas.width;
  const H = bgCanvas.height;

  // Launch from random top/left area, travel toward bottom-right
  const x0 = Math.random() * W * 0.7;
  const y0 = Math.random() * H * 0.3;
  const angle = (Math.random() * 0.4 + 0.3) * Math.PI; // 55-125 degrees-ish downward
  const dist = Math.max(W, H) * (0.4 + Math.random() * 0.3);

  shootingStars.push({
    x0, y0,
    x1: x0 + Math.cos(angle - Math.PI / 4) * dist,
    y1: y0 + Math.sin(angle - Math.PI / 4) * dist,
    startTime: performance.now() / 1000,
    duration: 1.2 + Math.random() * 0.6,
    tailLength: 180 + Math.random() * 120
  });
}

/* ═══════════════════════════════════════════════════
   GROWING TREE BACKGROUND
   ═══════════════════════════════════════════════════ */
let treeClouds = [];
let sunFaceState = { nextAppear: 0, phase: 'hidden', phaseStart: 0 };
// Sun face phases: hidden → fadeIn(0.5s) → open(1s) → blink(0.15s) → open(0.4s) → blink(0.15s) → fadeOut(0.5s) → hidden

function initSunFace() {
  sunFaceState = {
    nextAppear: performance.now() / 1000 + 30 + Math.random() * 60, // first appear 30-90s in
    phase: 'hidden',
    phaseStart: 0
  };
}

function updateSunFace(now) {
  const s = sunFaceState;
  if (s.phase === 'hidden') {
    if (now >= s.nextAppear) {
      s.phase = 'fadeIn';
      s.phaseStart = now;
    }
    return 0; // no face visible
  }

  const elapsed = now - s.phaseStart;
  const durations = { fadeIn: 0.5, open1: 1.0, blink1: 0.15, open2: 0.4, blink2: 0.15, fadeOut: 0.5 };
  const sequence = ['fadeIn', 'open1', 'blink1', 'open2', 'blink2', 'fadeOut'];

  // Advance through phases
  const currentDur = durations[s.phase];
  if (elapsed >= currentDur) {
    const idx = sequence.indexOf(s.phase);
    if (idx < sequence.length - 1) {
      s.phase = sequence[idx + 1];
      s.phaseStart = now;
    } else {
      // Animation complete, schedule next appearance (60-120s)
      s.phase = 'hidden';
      s.nextAppear = now + 60 + Math.random() * 60;
      return 0;
    }
  }

  const t = (now - s.phaseStart) / durations[s.phase];
  const isBlink = s.phase === 'blink1' || s.phase === 'blink2';
  let opacity = 1;
  if (s.phase === 'fadeIn') opacity = t;
  else if (s.phase === 'fadeOut') opacity = 1 - t;

  return { opacity, eyeOpen: isBlink ? Math.cos(t * Math.PI) * 0.5 + 0.5 : 1 };
}

function drawSunFace(cx, cy, r, faceData) {
  if (!faceData || faceData === 0) return;
  const { opacity, eyeOpen } = faceData;

  bgCtx.save();
  bgCtx.globalAlpha = opacity * 0.9;

  // Rosy cheeks
  bgCtx.fillStyle = 'rgba(255, 140, 110, 0.4)';
  bgCtx.beginPath();
  bgCtx.arc(cx - r * 0.5, cy + r * 0.2, r * 0.2, 0, Math.PI * 2);
  bgCtx.fill();
  bgCtx.beginPath();
  bgCtx.arc(cx + r * 0.5, cy + r * 0.2, r * 0.2, 0, Math.PI * 2);
  bgCtx.fill();

  // Eyes
  const eyeY = cy - r * 0.08;
  const eyeSpacing = r * 0.28;
  const eyeH = r * 0.16 * eyeOpen;
  const eyeW = r * 0.12;

  bgCtx.fillStyle = '#2d2d2d';
  if (eyeOpen > 0.3) {
    // Open eyes — oval dots
    bgCtx.beginPath();
    bgCtx.ellipse(cx - eyeSpacing, eyeY, eyeW, Math.max(1.5, eyeH), 0, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.beginPath();
    bgCtx.ellipse(cx + eyeSpacing, eyeY, eyeW, Math.max(1.5, eyeH), 0, 0, Math.PI * 2);
    bgCtx.fill();
    // Eye highlights
    bgCtx.fillStyle = 'rgba(255,255,255,0.7)';
    bgCtx.beginPath();
    bgCtx.arc(cx - eyeSpacing + eyeW * 0.3, eyeY - eyeH * 0.3, eyeW * 0.35, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.beginPath();
    bgCtx.arc(cx + eyeSpacing + eyeW * 0.3, eyeY - eyeH * 0.3, eyeW * 0.35, 0, Math.PI * 2);
    bgCtx.fill();
  } else {
    // Closed eyes — curved lines (happy squint)
    bgCtx.strokeStyle = '#2d2d2d';
    bgCtx.lineWidth = 2;
    bgCtx.lineCap = 'round';
    bgCtx.beginPath();
    bgCtx.arc(cx - eyeSpacing, eyeY + eyeW * 0.3, eyeW, 0.8 * Math.PI, 0.2 * Math.PI);
    bgCtx.stroke();
    bgCtx.beginPath();
    bgCtx.arc(cx + eyeSpacing, eyeY + eyeW * 0.3, eyeW, 0.8 * Math.PI, 0.2 * Math.PI);
    bgCtx.stroke();
  }

  // Smile
  bgCtx.strokeStyle = '#2d2d2d';
  bgCtx.lineWidth = 2;
  bgCtx.lineCap = 'round';
  bgCtx.beginPath();
  bgCtx.arc(cx, cy + r * 0.08, r * 0.25, 0.15 * Math.PI, 0.85 * Math.PI);
  bgCtx.stroke();

  bgCtx.restore();
}

function initTreeClouds() {
  treeClouds = [];
  const W = bgCanvas ? bgCanvas.width : window.innerWidth;
  const count = Math.max(3, Math.floor(W / 200));
  for (let i = 0; i < count; i++) {
    treeClouds.push({
      x: Math.random() * (W + 200) - 100,
      y: 30 + Math.random() * 120,
      w: 80 + Math.random() * 100,
      h: 30 + Math.random() * 20,
      speed: 6 + Math.random() * 10 // px per second
    });
  }
}

function initGrowingTree() {
  createBgCanvas();
  activeBackground = 'growingTree';
  bgCanvas.style.background = '';
  initTreeClouds();
  initSunFace();
  createBonsaiSVG();
  renderGrowingTree();
}

function getTreeProgress() {
  // progress: 0 = just started (sapling), 1 = done (full tree)
  if (!state || state.timerTotal <= 0) return 0;
  return 1 - (state.timerSeconds / state.timerTotal);
}

/* ─── Color interpolation helpers ─── */
function lerpColor(c1, c2, t) {
  // c1, c2 are [r, g, b] arrays, t is 0→1
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ];
}

function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }
function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

function multiLerp(stops, t) {
  // stops = [[pos, [r,g,b]], ...], t = 0→1
  if (t <= stops[0][0]) return stops[0][1];
  if (t >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      const local = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      return lerpColor(stops[i][1], stops[i + 1][1], local);
    }
  }
  return stops[stops.length - 1][1];
}

/* ─── Twilight stars (reused across frames) ─── */
let twilightStars = [];

function initTwilightStars() {
  twilightStars = [];
  const W = bgCanvas ? bgCanvas.width : window.innerWidth;
  const H = bgCanvas ? bgCanvas.height : window.innerHeight;
  const count = Math.floor((W * H) / 4000);
  for (let i = 0; i < count; i++) {
    twilightStars.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.7, // only above horizon
      r: Math.random() * 1.2 + 0.3,
      twinkleSpeed: Math.random() * 0.008 + 0.003,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
}

function renderGrowingTree() {
  if (activeBackground !== 'growingTree' || !bgCtx) return;
  const W = bgCanvas.width;
  const H = bgCanvas.height;
  const now = performance.now() / 1000;
  const progress = getTreeProgress(); // 0→1

  bgCtx.clearRect(0, 0, W, H);

  // Init twilight stars if needed
  if (twilightStars.length === 0) initTwilightStars();

  /*  ═══════════════════════════════════════════
      SUN POSITION — arc from upper-left to lower-right horizon
      ═══════════════════════════════════════════
      Timeline:
        0%   = high noon, sun at top-left
        60%  = afternoon, sun mid-sky right
        75%  = sky still blue, sun approaching lower-right
        80%  = golden hour begins (sun below title area)
        88%  = deep sunset, sun near horizon
        93%  = dusk, sun setting below horizon
        100% = night, sun fully set
  */
  const groundY = H * 0.72;

  // Sun arc: parametric arc from upper-left → below horizon right
  const arcCenterX = W * 0.5;
  const arcCenterY = groundY;
  const arcRadiusX = W * 0.48;
  const arcRadiusY = groundY * 0.85;
  const startAngle = Math.PI * 0.82;  // upper-left
  const endAngle   = Math.PI * -0.12; // well below horizon (negative = below groundY)
  const sunAngle = startAngle + (endAngle - startAngle) * progress;
  const sunX = arcCenterX + Math.cos(sunAngle) * arcRadiusX;
  const sunY = arcCenterY - Math.sin(sunAngle) * arcRadiusY;
  const sunR = Math.max(28, Math.min(42, W * 0.055));

  // Sun is visible as long as any part is above the ground line
  // (the disc is clipped at groundY, and ground draws on top)
  const sunVisible = (sunY - sunR < groundY) ? 1 : 0;

  /*  ═══════════════════════════════════════════
      SKY GRADIENT — transitions through day phases
      ═══════════════════════════════════════════ */
  // Sky top color
  const skyTop = multiLerp([
    [0,    [91, 184, 245]],   // bright blue
    [0.75, [91, 184, 245]],   // still blue
    [0.83, [180, 140, 80]],   // golden
    [0.88, [220, 100, 50]],   // orange
    [0.93, [80, 50, 100]],    // purple dusk
    [1.0,  [15, 15, 45]]      // night
  ], progress);

  const skyMid = multiLerp([
    [0,    [135, 206, 235]],  // sky blue
    [0.75, [135, 206, 235]],  // sky blue
    [0.83, [230, 170, 90]],   // warm gold
    [0.88, [240, 130, 70]],   // deep orange
    [0.93, [120, 60, 90]],    // dusky purple
    [1.0,  [20, 20, 55]]      // dark night
  ], progress);

  const skyBottom = multiLerp([
    [0,    [181, 227, 245]],  // pale blue
    [0.75, [181, 227, 245]],  // pale blue
    [0.83, [250, 200, 120]],  // golden glow
    [0.88, [255, 150, 80]],   // orange glow
    [0.93, [180, 100, 80]],   // warm dusk
    [1.0,  [30, 25, 60]]      // night horizon
  ], progress);

  const skyGrad = bgCtx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, rgb(skyTop));
  skyGrad.addColorStop(0.5, rgb(skyMid));
  skyGrad.addColorStop(1, rgb(skyBottom));
  bgCtx.fillStyle = skyGrad;
  bgCtx.fillRect(0, 0, W, H);

  /*  ═══════════════════════════════════════════
      TWILIGHT STARS — fade in during dusk/night
      ═══════════════════════════════════════════ */
  // Stars only appear once the sun starts sinking into the grass
  if (sunY > groundY - sunR) {
    const starAlphaMax = Math.min(1, (sunY - (groundY - sunR)) / (sunR * 2.5));
    for (const s of twilightStars) {
      const twinkle = Math.sin(now * s.twinkleSpeed * 60 + s.twinkleOffset) * 0.3 + 0.7;
      const alpha = starAlphaMax * twinkle * 0.8;
      if (alpha < 0.02) continue;
      bgCtx.beginPath();
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(255, 255, 230, ${alpha})`;
      bgCtx.fill();
    }
  }

  /*  ═══════════════════════════════════════════
      HORIZON GLOW — warm band near horizon during golden hour/sunset
      ═══════════════════════════════════════════ */
  if (progress > 0.76 && progress < 0.97) {
    const glowIntensity = progress < 0.85
      ? (progress - 0.76) / 0.09
      : 1 - (progress - 0.85) / 0.12;
    const horizonGlow = bgCtx.createLinearGradient(0, groundY - H * 0.15, 0, groundY);
    const glowColor = multiLerp([
      [0.76, [255, 220, 130]],
      [0.85, [255, 140, 60]],
      [0.93, [200, 80, 60]]
    ], progress);
    horizonGlow.addColorStop(0, rgba(glowColor, 0));
    horizonGlow.addColorStop(0.7, rgba(glowColor, 0.3 * Math.max(0, glowIntensity)));
    horizonGlow.addColorStop(1, rgba(glowColor, 0.5 * Math.max(0, glowIntensity)));
    bgCtx.fillStyle = horizonGlow;
    bgCtx.fillRect(0, groundY - H * 0.15, W, H * 0.15);
  }

  /*  ═══════════════════════════════════════════
      SUN — position, color, and glow shift with progress
      ═══════════════════════════════════════════ */
  if (sunVisible > 0) {
    // Sun color warms as it sets
    const sunColor = multiLerp([
      [0,    [255, 229, 102]],  // bright yellow
      [0.78, [255, 229, 102]],  // still yellow
      [0.86, [255, 180, 60]],   // warm orange
      [0.93, [255, 120, 50]],   // deep orange-red
      [1.0,  [220, 80, 40]]     // red
    ], progress);

    const glowColor = multiLerp([
      [0,    [255, 240, 180]],
      [0.78, [255, 240, 180]],
      [0.86, [255, 200, 100]],
      [0.93, [255, 140, 60]],
      [1.0,  [220, 90, 40]]
    ], progress);

    const glowSize = sunR * (2.8 + progress * 1.5); // glow expands near horizon
    // Fade glow as sun sinks below ground
    const glowFade = sunY < groundY ? 1 : Math.max(0, 1 - (sunY - groundY) / (sunR * 2));
    const sunGlow = bgCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowSize);
    sunGlow.addColorStop(0, rgba(glowColor, 0.9 * glowFade));
    sunGlow.addColorStop(0.3, rgba(glowColor, 0.3 * glowFade));
    sunGlow.addColorStop(1, rgba(glowColor, 0));
    bgCtx.fillStyle = sunGlow;
    bgCtx.fillRect(sunX - glowSize, sunY - glowSize, glowSize * 2, glowSize * 2);

    // Sun disc (clip to above horizon for partial setting)
    bgCtx.save();
    if (sunY + sunR > groundY) {
      bgCtx.beginPath();
      bgCtx.rect(0, 0, W, groundY);
      bgCtx.clip();
    }
    bgCtx.beginPath();
    bgCtx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    bgCtx.fillStyle = rgb(sunColor);
    bgCtx.fill();

    // Sun face — hide once sun center is below ground
    const faceData = updateSunFace(now);
    if (sunY < groundY) drawSunFace(sunX, sunY, sunR, faceData);
    bgCtx.restore();
  }

  /*  ═══════════════════════════════════════════
      CLOUDS — tinted by time of day
      ═══════════════════════════════════════════ */
  const cloudColor = multiLerp([
    [0,    [255, 255, 255]],  // white
    [0.78, [255, 255, 255]],  // white
    [0.85, [255, 220, 170]],  // warm peach
    [0.90, [240, 160, 130]],  // sunset pink
    [0.95, [100, 80, 120]],   // dusky purple
    [1.0,  [40, 35, 65]]      // dark night cloud
  ], progress);
  const cloudAlpha = progress > 0.95 ? Math.max(0.3, 1 - (progress - 0.95) / 0.05) : 0.85;

  for (const c of treeClouds) {
    c.x += c.speed * (1 / 60);
    if (c.x > W + c.w) c.x = -c.w - 20;
    drawCloud(c.x, c.y, c.w, c.h, cloudColor, cloudAlpha);
  }

  /*  ═══════════════════════════════════════════
      GROUND — darkens toward night
      ═══════════════════════════════════════════ */
  const grassTop = multiLerp([
    [0,    [92, 184, 92]],
    [0.80, [92, 184, 92]],
    [0.88, [80, 140, 60]],
    [0.94, [50, 90, 40]],
    [1.0,  [20, 40, 20]]
  ], progress);
  const grassMid = multiLerp([
    [0,    [74, 158, 74]],
    [0.80, [74, 158, 74]],
    [0.88, [60, 120, 50]],
    [0.94, [40, 75, 35]],
    [1.0,  [15, 32, 15]]
  ], progress);
  const grassBot = multiLerp([
    [0,    [58, 122, 58]],
    [0.80, [58, 122, 58]],
    [0.88, [45, 95, 40]],
    [0.94, [30, 60, 28]],
    [1.0,  [10, 25, 12]]
  ], progress);

  bgCtx.beginPath();
  bgCtx.moveTo(0, groundY);
  bgCtx.quadraticCurveTo(W * 0.15, groundY - 20, W * 0.3, groundY);
  bgCtx.quadraticCurveTo(W * 0.5, groundY + 15, W * 0.7, groundY - 10);
  bgCtx.quadraticCurveTo(W * 0.85, groundY + 10, W, groundY);
  bgCtx.lineTo(W, H);
  bgCtx.lineTo(0, H);
  bgCtx.closePath();
  const grassGrad = bgCtx.createLinearGradient(0, groundY, 0, H);
  grassGrad.addColorStop(0, rgb(grassTop));
  grassGrad.addColorStop(0.3, rgb(grassMid));
  grassGrad.addColorStop(1, rgb(grassBot));
  bgCtx.fillStyle = grassGrad;
  bgCtx.fill();

  // ── Bonsai SVG tree ──
  updateBonsaiProgress(progress);
  updateBonsaiColors(progress);

  // ── Grass tufts (darken at night) ──
  drawGrassTufts(W, H, groundY, now, progress);

  // ── Dynamic text color — lighten as sky darkens ──
  // Only apply to timer area elements (title, digits, controls), not panel/modals
  const textColor = multiLerp([
    [0,    [45, 58, 30]],      // dark green (daytime)
    [0.78, [45, 58, 30]],      // still dark green
    [0.85, [80, 70, 50]],      // warm brown (golden hour)
    [0.90, [200, 180, 150]],   // light tan (sunset)
    [0.95, [220, 210, 200]],   // pale (dusk)
    [1.0,  [240, 235, 230]]    // near-white (night)
  ], progress);
  const textMuted = multiLerp([
    [0,    [90, 110, 66]],     // muted green (daytime)
    [0.78, [90, 110, 66]],
    [0.85, [140, 120, 90]],
    [0.90, [170, 155, 135]],
    [0.95, [185, 180, 170]],
    [1.0,  [200, 195, 190]]
  ], progress);
  const textRgb = `rgb(${textColor[0]},${textColor[1]},${textColor[2]})`;
  const mutedRgb = `rgb(${textMuted[0]},${textMuted[1]},${textMuted[2]})`;
  const timerArea = document.getElementById('timerArea');
  if (timerArea) {
    timerArea.style.color = textRgb;
    // Also style the controls (reset, play, skip) which use --text-muted
    const controls = timerArea.querySelectorAll('.timer-controls button');
    controls.forEach(btn => { btn.style.color = mutedRgb; });
  }

  bgAnimId = requestAnimationFrame(renderGrowingTree);
}

function drawCloud(x, y, w, h, color, alpha) {
  const c = color || [255, 255, 255];
  const a = alpha !== undefined ? alpha : 0.85;
  bgCtx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  // Cloud made of overlapping circles — each drawn separately to avoid
  // subpath winding artifacts that cause missing chunks in overlapping areas
  const r = h * 0.7;
  const circles = [
    [x + w * 0.15, y + r * 0.2, r * 0.7],
    [x + w * 0.3,  y,           r],
    [x + w * 0.5,  y - r * 0.4, r * 1.2],
    [x + w * 0.7,  y,           r * 0.9],
    [x + w * 0.85, y + r * 0.15, r * 0.6],
  ];
  for (const [cx, cy, cr] of circles) {
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    bgCtx.fill();
  }
}

/* ═══════════════════════════════════════════════════
   SVG BONSAI TREE — replaces canvas-drawn tree
   ═══════════════════════════════════════════════════ */
let bonsaiSvgEl = null;
let bonsaiBranchState = {};   // branchId → { triggerProgress, branch, sub, branchLen, subLen }
let bonsaiFoliageState = {};  // padId → { triggerProgress, matureProgress, padEl }
let bonsaiRootPaths = [];     // [{el, len}] cached on init

// Tapered trunk: base is ~3x thicker than tip at full growth
const BONSAI_TRUNK_BASE_WIDTH_START = 2;
const BONSAI_TRUNK_BASE_WIDTH_END = 39;
const BONSAI_TRUNK_TIP_WIDTH_START = 2;
const BONSAI_TRUNK_TIP_WIDTH_END = 13;
const BONSAI_SHADOW_BASE_WIDTH_START = 3;
const BONSAI_SHADOW_BASE_WIDTH_END = 42;
const BONSAI_SHADOW_TIP_WIDTH_START = 3;
const BONSAI_SHADOW_TIP_WIDTH_END = 16;
const BONSAI_TRUNK_PROGRESS_END = 0.65; // trunk finishes at 65% of timer
const BONSAI_BRANCH_GROWTH_SPAN = 0.111;  // branch grows over 11.1% of total progress
const BONSAI_SUB_DELAY_SPAN = BONSAI_BRANCH_GROWTH_SPAN * 0.3;
const BONSAI_SUB_GROWTH_SPAN = BONSAI_BRANCH_GROWTH_SPAN * 0.65;
const BONSAI_FOLIAGE_GROWTH_SPAN = 0.08;  // scale 0→1 over 8% of total progress
const BONSAI_FOLIAGE_MATURE_SPAN = 0.06;  // scale 1→1.15 over 6% of total progress

const BONSAI_BRANCH_TRIGGERS = [
  { y: 345, branchId: 'bonsai-branch-L1',  subId: 'bonsai-sub-L1',  padId: 'bonsai-pad-L1',  foliageAt: 0.18, matureAt: 0.30 },
  { y: 285, branchId: 'bonsai-branch-R1',  subId: 'bonsai-sub-R1',  padId: 'bonsai-pad-R1',  foliageAt: 0.28, matureAt: 0.40 },
  { y: 225, branchId: 'bonsai-branch-L2',  subId: 'bonsai-sub-L2',  padId: 'bonsai-pad-L2',  foliageAt: 0.38, matureAt: 0.50 },
  { y: 178, branchId: 'bonsai-branch-R2',  subId: 'bonsai-sub-R2',  padId: 'bonsai-pad-R2',  foliageAt: 0.48, matureAt: 0.60 },
  { y: 105, branchId: 'bonsai-branch-apex', subId: 'bonsai-sub-apex', padId: 'bonsai-pad-apex', foliageAt: 0.56, matureAt: 0.68 },
];

const BONSAI_SVG_MARKUP = `
<svg class="bonsai-svg" viewBox="0 0 400 520" xmlns="http://www.w3.org/2000/svg">
  <g class="bonsai-pot" id="bonsai-pot">
    <polygon points="140,432 260,432 248,472 152,472" fill="var(--bonsai-pot)" />
    <rect x="132" y="424" width="136" height="10" rx="3" fill="var(--bonsai-pot-rim)" />
    <rect x="158" y="472" width="84" height="6" rx="2" fill="var(--bonsai-pot-dark)" />
    <line x1="155" y1="448" x2="245" y2="448" stroke="var(--bonsai-pot-dark)" stroke-width="1" opacity="0.3" />
    <ellipse class="bonsai-soil-surface" cx="200" cy="430" rx="58" ry="8" fill="var(--bonsai-soil)" />
    <ellipse cx="200" cy="428" rx="40" ry="4" fill="var(--bonsai-soil-highlight)" opacity="0.5" />
  </g>

  <g class="bonsai-tree-group" id="bonsai-tree-group">
    <path class="bonsai-growable bonsai-root-path" d="M 200,424 C 192,428 172,430 158,432" />
    <path class="bonsai-growable bonsai-root-path" d="M 200,424 C 208,428 228,429 242,431" />
    <path class="bonsai-growable bonsai-root-path" d="M 200,426 C 196,430 186,434 174,436" />

    <!-- Trunk fill paths (tapered, computed per-frame by JS) -->
    <path id="bonsai-trunk-fill-shadow" class="bonsai-trunk-fill-shadow" />
    <path id="bonsai-trunk-fill" class="bonsai-trunk-fill-main" />

    <!-- Trunk reference paths (invisible, used for getPointAtLength) -->
    <path id="bonsai-trunk-shadow" class="bonsai-growable bonsai-trunk-shadow"
          d="M 200,424 C 196,405 180,385 164,362 C 142,330 132,310 138,285 C 144,260 172,242 200,230 C 228,218 250,200 248,178 C 246,156 228,140 210,125 C 192,110 182,92 186,72 C 188,60 190,50 192,42" />
    <path id="bonsai-trunk-main" class="bonsai-growable bonsai-trunk-main"
          d="M 200,424 C 196,405 180,385 164,362 C 142,330 132,310 138,285 C 144,260 172,242 200,230 C 228,218 250,200 248,178 C 246,156 228,140 210,125 C 192,110 182,92 186,72 C 188,60 190,50 192,42" />

    <!-- Branches: origins sit exactly on trunk centerline -->
    <path id="bonsai-branch-L1" class="bonsai-growable bonsai-branch-primary"
          d="M 152,345 C 130,336 100,338 72,346 C 52,354 32,348 12,334" />
    <path id="bonsai-sub-L1" class="bonsai-growable bonsai-branch-secondary"
          d="M 72,346 C 58,332 44,318 28,308" />

    <path id="bonsai-branch-R1" class="bonsai-growable bonsai-branch-primary"
          d="M 138,285 C 164,274 202,268 244,276 C 268,282 294,276 324,262" />
    <path id="bonsai-sub-R1" class="bonsai-growable bonsai-branch-secondary"
          d="M 244,276 C 258,258 270,242 284,230" />

    <path id="bonsai-branch-L2" class="bonsai-growable bonsai-branch-primary"
          d="M 208,225 C 184,216 150,212 116,220 C 92,228 66,220 40,206" />
    <path id="bonsai-sub-L2" class="bonsai-growable bonsai-branch-secondary"
          d="M 116,220 C 102,206 86,192 70,182" />

    <path id="bonsai-branch-R2" class="bonsai-growable bonsai-branch-primary"
          d="M 248,178 C 270,168 296,166 320,174 C 340,180 358,172 376,158" />
    <path id="bonsai-sub-R2" class="bonsai-growable bonsai-branch-secondary"
          d="M 320,174 C 334,158 344,140 352,126" />

    <path id="bonsai-branch-apex" class="bonsai-growable bonsai-branch-primary"
          d="M 193,105 C 189,94 185,82 183,72 C 181,62 183,54 187,48" />
    <path id="bonsai-sub-apex" class="bonsai-growable bonsai-branch-secondary"
          d="M 193,105 C 201,92 210,82 218,72" />

    <!-- Foliage pads: fluffy overlapping circles in cloud clusters -->
    <g id="bonsai-pad-L1" class="bonsai-foliage-pad" style="transform-origin:50px 326px">
      <circle cx="22"  cy="340" r="24" fill="var(--bonsai-foliage-dark)" />
      <circle cx="52"  cy="344" r="28" fill="var(--bonsai-foliage-dark)" />
      <circle cx="80"  cy="338" r="22" fill="var(--bonsai-foliage-dark)" />
      <circle cx="36"  cy="346" r="20" fill="var(--bonsai-foliage-dark)" />
      <circle cx="30"  cy="320" r="26" fill="var(--bonsai-foliage-mid)" />
      <circle cx="60"  cy="316" r="30" fill="var(--bonsai-foliage-mid)" />
      <circle cx="86"  cy="322" r="22" fill="var(--bonsai-foliage-mid)" />
      <circle cx="42"  cy="300" r="22" fill="var(--bonsai-foliage-light)" />
      <circle cx="66"  cy="296" r="24" fill="var(--bonsai-foliage-light)" />
      <circle cx="14"  cy="330" r="18" fill="var(--bonsai-foliage-mid)" opacity="0.7" />
    </g>

    <g id="bonsai-pad-R1" class="bonsai-foliage-pad" style="transform-origin:292px 252px">
      <circle cx="262" cy="270" r="24" fill="var(--bonsai-foliage-dark)" />
      <circle cx="292" cy="274" r="28" fill="var(--bonsai-foliage-dark)" />
      <circle cx="320" cy="268" r="22" fill="var(--bonsai-foliage-dark)" />
      <circle cx="276" cy="278" r="20" fill="var(--bonsai-foliage-dark)" />
      <circle cx="270" cy="250" r="26" fill="var(--bonsai-foliage-mid)" />
      <circle cx="298" cy="246" r="30" fill="var(--bonsai-foliage-mid)" />
      <circle cx="324" cy="252" r="22" fill="var(--bonsai-foliage-mid)" />
      <circle cx="282" cy="232" r="22" fill="var(--bonsai-foliage-light)" />
      <circle cx="306" cy="228" r="24" fill="var(--bonsai-foliage-light)" />
      <circle cx="334" cy="260" r="18" fill="var(--bonsai-foliage-mid)" opacity="0.7" />
    </g>

    <g id="bonsai-pad-L2" class="bonsai-foliage-pad" style="transform-origin:65px 198px">
      <circle cx="38"  cy="214" r="22" fill="var(--bonsai-foliage-dark)" />
      <circle cx="66"  cy="218" r="26" fill="var(--bonsai-foliage-dark)" />
      <circle cx="92"  cy="212" r="20" fill="var(--bonsai-foliage-dark)" />
      <circle cx="50"  cy="222" r="18" fill="var(--bonsai-foliage-dark)" />
      <circle cx="44"  cy="196" r="24" fill="var(--bonsai-foliage-mid)" />
      <circle cx="72"  cy="192" r="28" fill="var(--bonsai-foliage-mid)" />
      <circle cx="96"  cy="198" r="20" fill="var(--bonsai-foliage-mid)" />
      <circle cx="56"  cy="178" r="20" fill="var(--bonsai-foliage-light)" />
      <circle cx="78"  cy="174" r="22" fill="var(--bonsai-foliage-light)" />
      <circle cx="28"  cy="206" r="16" fill="var(--bonsai-foliage-mid)" opacity="0.7" />
    </g>

    <g id="bonsai-pad-R2" class="bonsai-foliage-pad" style="transform-origin:340px 150px">
      <circle cx="314" cy="166" r="22" fill="var(--bonsai-foliage-dark)" />
      <circle cx="342" cy="170" r="26" fill="var(--bonsai-foliage-dark)" />
      <circle cx="368" cy="164" r="20" fill="var(--bonsai-foliage-dark)" />
      <circle cx="328" cy="174" r="18" fill="var(--bonsai-foliage-dark)" />
      <circle cx="322" cy="148" r="24" fill="var(--bonsai-foliage-mid)" />
      <circle cx="348" cy="144" r="28" fill="var(--bonsai-foliage-mid)" />
      <circle cx="372" cy="150" r="20" fill="var(--bonsai-foliage-mid)" />
      <circle cx="334" cy="130" r="20" fill="var(--bonsai-foliage-light)" />
      <circle cx="356" cy="128" r="22" fill="var(--bonsai-foliage-light)" />
      <circle cx="380" cy="158" r="16" fill="var(--bonsai-foliage-mid)" opacity="0.7" />
    </g>

    <g id="bonsai-pad-apex" class="bonsai-foliage-pad" style="transform-origin:198px 62px">
      <circle cx="168" cy="78"  r="26" fill="var(--bonsai-foliage-dark)" />
      <circle cx="198" cy="82"  r="30" fill="var(--bonsai-foliage-dark)" />
      <circle cx="228" cy="76"  r="24" fill="var(--bonsai-foliage-dark)" />
      <circle cx="148" cy="74"  r="20" fill="var(--bonsai-foliage-dark)" />
      <circle cx="246" cy="80"  r="18" fill="var(--bonsai-foliage-dark)" />
      <circle cx="176" cy="56"  r="28" fill="var(--bonsai-foliage-mid)" />
      <circle cx="206" cy="52"  r="32" fill="var(--bonsai-foliage-mid)" />
      <circle cx="234" cy="58"  r="24" fill="var(--bonsai-foliage-mid)" />
      <circle cx="156" cy="60"  r="20" fill="var(--bonsai-foliage-mid)" />
      <circle cx="188" cy="38"  r="24" fill="var(--bonsai-foliage-light)" />
      <circle cx="214" cy="36"  r="26" fill="var(--bonsai-foliage-light)" />
      <circle cx="174" cy="44"  r="18" fill="var(--bonsai-foliage-light)" />
    </g>
  </g>
</svg>`;

function createBonsaiSVG() {
  if (bonsaiSvgEl) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = BONSAI_SVG_MARKUP.trim();
  bonsaiSvgEl = wrapper.firstChild;
  document.body.appendChild(bonsaiSvgEl);
  initBonsaiPaths();
  positionBonsaiSVG();
}

function initBonsaiPaths() {
  if (!bonsaiSvgEl) return;
  // Reset all growth state
  bonsaiBranchState = {};
  bonsaiFoliageState = {};
  bonsaiRootPaths = [];

  bonsaiSvgEl.querySelectorAll('.bonsai-foliage-pad').forEach(el => {
    el.classList.remove('visible');
    el.style.opacity = '0';
    el.style.scale = '0';
    el.style.animation = '';
  });

  // Set strokeDasharray/offset for all growable paths (branches, roots, trunk ref)
  bonsaiSvgEl.querySelectorAll('.bonsai-growable').forEach(path => {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
  });

  // Cache root path info for JS per-frame animation
  bonsaiSvgEl.querySelectorAll('.bonsai-root-path').forEach(el => {
    bonsaiRootPaths.push({ el, len: el.getTotalLength() });
  });

  // Reset pot
  const pot = bonsaiSvgEl.querySelector('.bonsai-pot');
  if (pot) pot.classList.remove('visible');

  // Reset tapered trunk fill paths
  const trunkFill = bonsaiSvgEl.querySelector('#bonsai-trunk-fill');
  const trunkFillShadow = bonsaiSvgEl.querySelector('#bonsai-trunk-fill-shadow');
  if (trunkFill) trunkFill.setAttribute('d', '');
  if (trunkFillShadow) { trunkFillShadow.setAttribute('d', ''); trunkFillShadow.style.opacity = '0'; }
}

function removeBonsaiSVG() {
  if (bonsaiSvgEl) {
    bonsaiSvgEl.remove();
    bonsaiSvgEl = null;
  }
  bonsaiBranchState = {};
  bonsaiFoliageState = {};
  bonsaiRootPaths = [];
}

function resetBonsaiForSegment() {
  // Full destroy + recreate for a clean slate on segment change
  if (activeBackground !== 'growingTree') return;
  removeBonsaiSVG();
  createBonsaiSVG();
}

function positionBonsaiSVG() {
  if (!bonsaiSvgEl) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const groundY = H * 0.72;

  // Tree top (apex foliage ~y=16) should sit below the title area (~35% from top).
  // Soil (y=430) sits at groundY. Solve for display height:
  //   groundY - 0.796 * displayH = titleBottom
  //   displayH = (groundY - titleBottom) / 0.796
  const titleBottom = H * 0.35;
  const svgDisplayHeight = Math.min(450, Math.max(120, (groundY - titleBottom) / 0.796));
  const svgDisplayWidth = svgDisplayHeight * (400 / 520);

  const left = (W - svgDisplayWidth) / 2;
  // Soil surface (y=430) sits at groundY
  const soilInSvg = svgDisplayHeight * (430 / 520);
  const top = groundY - soilInSvg;

  bonsaiSvgEl.style.left = left + 'px';
  bonsaiSvgEl.style.top = top + 'px';
  bonsaiSvgEl.style.width = svgDisplayWidth + 'px';
  bonsaiSvgEl.style.height = svgDisplayHeight + 'px';
}

function buildTaperedTrunkPath(refPath, drawnLen, baseHalfW, tipHalfW) {
  if (drawnLen < 2) return '';
  const N = 24;
  const eps = 0.5;
  const leftPts = [];
  const rightPts = [];

  for (let i = 0; i <= N; i++) {
    const L = (i / N) * drawnLen;
    const t = i / N; // 0 = base, 1 = current tip
    const pt = refPath.getPointAtLength(L);

    // Tangent via finite difference
    const La = Math.max(0, L - eps);
    const Lb = Math.min(drawnLen, L + eps);
    const pA = refPath.getPointAtLength(La);
    const pB = refPath.getPointAtLength(Lb);
    let dx = pB.x - pA.x, dy = pB.y - pA.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= mag; dy /= mag;

    // Perpendicular normal
    const nx = -dy, ny = dx;
    const halfW = baseHalfW + (tipHalfW - baseHalfW) * t;

    leftPts.push({ x: pt.x + nx * halfW, y: pt.y + ny * halfW });
    rightPts.push({ x: pt.x - nx * halfW, y: pt.y - ny * halfW });
  }

  // Build path: left edge forward, arc tip cap, right edge backward, flat base into soil
  // Extend base below soil surface (y=440) so trunk is always anchored in the pot
  const soilY = 440;

  let d = `M ${leftPts[0].x.toFixed(1)},${soilY}`;
  d += ` L ${leftPts[0].x.toFixed(1)},${leftPts[0].y.toFixed(1)}`;
  for (let i = 1; i <= N; i++) {
    d += ` L ${leftPts[i].x.toFixed(1)},${leftPts[i].y.toFixed(1)}`;
  }
  // Semicircular tip cap
  const tipR = Math.abs(tipHalfW);
  if (tipR > 0.5) {
    d += ` A ${tipR.toFixed(1)},${tipR.toFixed(1)} 0 0 1 ${rightPts[N].x.toFixed(1)},${rightPts[N].y.toFixed(1)}`;
  } else {
    d += ` L ${rightPts[N].x.toFixed(1)},${rightPts[N].y.toFixed(1)}`;
  }
  for (let i = N - 1; i >= 0; i--) {
    d += ` L ${rightPts[i].x.toFixed(1)},${rightPts[i].y.toFixed(1)}`;
  }
  // Flat base extending into soil
  d += ` L ${rightPts[0].x.toFixed(1)},${soilY}`;
  d += ' Z';
  return d;
}

function updateBonsaiProgress(progress) {
  if (!bonsaiSvgEl) return;

  // ── Pot ──
  const pot = bonsaiSvgEl.querySelector('.bonsai-pot');
  if (pot && progress > 0 && !pot.classList.contains('visible')) {
    pot.classList.add('visible');
  }

  // ── Trunk (JS per-frame tapered filled polygon) ──
  const trunkMain = bonsaiSvgEl.querySelector('#bonsai-trunk-main');
  if (!trunkMain) return;

  const trunkProgress = Math.min(1, progress / BONSAI_TRUNK_PROGRESS_END);
  const eased = 1 - Math.pow(1 - trunkProgress, 1.6);
  const totalLen = trunkMain.getTotalLength();
  const drawnLen = eased * totalLen;

  // Compute tapered half-widths
  const baseHalfW = (BONSAI_TRUNK_BASE_WIDTH_START + (BONSAI_TRUNK_BASE_WIDTH_END - BONSAI_TRUNK_BASE_WIDTH_START) * eased) / 2;
  const tipHalfW = (BONSAI_TRUNK_TIP_WIDTH_START + (BONSAI_TRUNK_TIP_WIDTH_END - BONSAI_TRUNK_TIP_WIDTH_START) * eased) / 2;
  const shadowBaseHalfW = (BONSAI_SHADOW_BASE_WIDTH_START + (BONSAI_SHADOW_BASE_WIDTH_END - BONSAI_SHADOW_BASE_WIDTH_START) * eased) / 2;
  const shadowTipHalfW = (BONSAI_SHADOW_TIP_WIDTH_START + (BONSAI_SHADOW_TIP_WIDTH_END - BONSAI_SHADOW_TIP_WIDTH_START) * eased) / 2;

  const trunkFill = bonsaiSvgEl.querySelector('#bonsai-trunk-fill');
  const trunkFillShadow = bonsaiSvgEl.querySelector('#bonsai-trunk-fill-shadow');
  if (trunkFill) {
    trunkFill.setAttribute('d', buildTaperedTrunkPath(trunkMain, drawnLen, baseHalfW, tipHalfW));
  }
  if (trunkFillShadow) {
    trunkFillShadow.setAttribute('d', buildTaperedTrunkPath(trunkMain, drawnLen, shadowBaseHalfW, shadowTipHalfW));
    trunkFillShadow.style.opacity = 0.3 + 0.3 * eased;
  }

  // ── Branches (JS per-frame, like trunk) ──
  // Detect new branch triggers via getPointAtLength
  if (drawnLen > 1) {
    const point = trunkMain.getPointAtLength(drawnLen);
    for (const trigger of BONSAI_BRANCH_TRIGGERS) {
      if (!bonsaiBranchState[trigger.branchId] && point.y <= trigger.y) {
        const branch = bonsaiSvgEl.querySelector('#' + trigger.branchId);
        const sub = bonsaiSvgEl.querySelector('#' + trigger.subId);
        bonsaiBranchState[trigger.branchId] = {
          triggerProgress: progress,
          branch,
          sub,
          branchLen: branch ? branch.getTotalLength() : 0,
          subLen: sub ? sub.getTotalLength() : 0,
        };
      }
    }
  }

  // Animate all triggered branches proportionally to progress
  for (const id in bonsaiBranchState) {
    const bs = bonsaiBranchState[id];
    // Primary branch
    const elapsed = progress - bs.triggerProgress;
    const branchFrac = Math.min(1, Math.max(0, elapsed / BONSAI_BRANCH_GROWTH_SPAN));
    const branchEased = 1 - Math.pow(1 - branchFrac, 2); // ease-out
    if (bs.branch) {
      bs.branch.style.strokeDashoffset = bs.branchLen * (1 - branchEased);
    }
    // Sub-branch (starts after a delay in progress-space)
    const subElapsed = elapsed - BONSAI_SUB_DELAY_SPAN;
    const subFrac = Math.min(1, Math.max(0, subElapsed / BONSAI_SUB_GROWTH_SPAN));
    const subEased = 1 - Math.pow(1 - subFrac, 2);
    if (bs.sub) {
      bs.sub.style.strokeDashoffset = bs.subLen * (1 - subEased);
    }
  }

  // ── Foliage (JS per-frame, like trunk and branches) ──
  for (const trigger of BONSAI_BRANCH_TRIGGERS) {
    if (!bonsaiFoliageState[trigger.padId] && progress >= trigger.foliageAt) {
      const pad = bonsaiSvgEl.querySelector('#' + trigger.padId);
      if (pad) {
        bonsaiFoliageState[trigger.padId] = {
          triggerProgress: trigger.foliageAt,
          matureProgress: trigger.matureAt,
          padEl: pad,
        };
        pad.classList.add('visible'); // enables sway animation only
      }
    }
  }

  // Animate all triggered foliage pads
  for (const padId in bonsaiFoliageState) {
    const fs = bonsaiFoliageState[padId];
    // Phase 1: appear (scale 0→1, opacity 0→1)
    const appearElapsed = progress - fs.triggerProgress;
    const appearFrac = Math.min(1, Math.max(0, appearElapsed / BONSAI_FOLIAGE_GROWTH_SPAN));
    const appearEased = 1 - Math.pow(1 - appearFrac, 2.5); // ease-out
    // Phase 2: mature (scale 1→1.15)
    let matureScale = 1;
    if (progress >= fs.matureProgress) {
      const matureElapsed = progress - fs.matureProgress;
      const matureFrac = Math.min(1, Math.max(0, matureElapsed / BONSAI_FOLIAGE_MATURE_SPAN));
      matureScale = 1 + 0.15 * (1 - Math.pow(1 - matureFrac, 2));
    }
    fs.padEl.style.scale = appearEased * matureScale;
    fs.padEl.style.opacity = appearEased;
  }

  // ── Roots (JS per-frame, grow with trunk) ──
  // Roots grow proportionally to trunk progress (same 0→0.65 range)
  if (bonsaiRootPaths.length && trunkProgress > 0) {
    const rootEased = 1 - Math.pow(1 - trunkProgress, 2);
    for (const rp of bonsaiRootPaths) {
      rp.el.style.strokeDashoffset = rp.len * (1 - rootEased);
    }
  }
}

function updateBonsaiColors(progress) {
  if (!bonsaiSvgEl) return;
  // Darken bonsai colors during sunset/night (progress > 0.80)
  if (progress <= 0.78) return; // nothing to do during daytime

  const trunk = multiLerp([
    [0.78, [109, 76, 46]],   // #6D4C2E
    [0.90, [70, 50, 35]],
    [1.0,  [35, 25, 18]]
  ], progress);
  const trunkDark = multiLerp([
    [0.78, [78, 53, 36]],    // #4E3524
    [0.90, [50, 35, 25]],
    [1.0,  [25, 18, 12]]
  ], progress);
  const foliageDark = multiLerp([
    [0.78, [58, 138, 48]],   // #3A8A30
    [0.90, [30, 70, 25]],
    [1.0,  [15, 35, 12]]
  ], progress);
  const foliageMid = multiLerp([
    [0.78, [78, 168, 66]],   // #4EA842
    [0.90, [42, 90, 38]],
    [1.0,  [22, 45, 20]]
  ], progress);
  const foliageLight = multiLerp([
    [0.78, [108, 191, 92]],  // #6CBF5C
    [0.90, [58, 108, 48]],
    [1.0,  [30, 55, 25]]
  ], progress);
  const pot = multiLerp([
    [0.78, [181, 101, 29]],  // #B5651D
    [0.90, [110, 65, 20]],
    [1.0,  [55, 33, 10]]
  ], progress);

  bonsaiSvgEl.style.setProperty('--bonsai-trunk', rgb(trunk));
  bonsaiSvgEl.style.setProperty('--bonsai-trunk-dark', rgb(trunkDark));
  bonsaiSvgEl.style.setProperty('--bonsai-foliage-dark', rgb(foliageDark));
  bonsaiSvgEl.style.setProperty('--bonsai-foliage-mid', rgb(foliageMid));
  bonsaiSvgEl.style.setProperty('--bonsai-foliage-light', rgb(foliageLight));
  bonsaiSvgEl.style.setProperty('--bonsai-pot', rgb(pot));
  bonsaiSvgEl.style.setProperty('--bonsai-pot-dark', rgb(trunkDark));
  bonsaiSvgEl.style.setProperty('--bonsai-pot-rim', rgb(trunk));
}

// Returns the Y of the rolling-hill contour at a given X
function getHillY(x, W, groundY) {
  const t = x / W;
  // Match the quadratic curves: 0→0.3, 0.3→0.7, 0.7→1.0
  if (t <= 0.3) {
    // quadraticCurveTo(0.15, groundY-20, 0.3, groundY)
    const s = t / 0.3;
    const a = groundY, cp = groundY - 20, b = groundY;
    return (1 - s) * (1 - s) * a + 2 * (1 - s) * s * cp + s * s * b;
  } else if (t <= 0.7) {
    // quadraticCurveTo(0.5, groundY+15, 0.7, groundY-10)
    const s = (t - 0.3) / 0.4;
    const a = groundY, cp = groundY + 15, b = groundY - 10;
    return (1 - s) * (1 - s) * a + 2 * (1 - s) * s * cp + s * s * b;
  } else {
    // quadraticCurveTo(0.85, groundY+10, 1.0, groundY)
    const s = (t - 0.7) / 0.3;
    const a = groundY - 10, cp = groundY + 10, b = groundY;
    return (1 - s) * (1 - s) * a + 2 * (1 - s) * s * cp + s * s * b;
  }
}

function drawGrassTufts(W, H, groundY, time, progress) {
  const p = progress || 0;
  const tuftColor = multiLerp([
    [0,    [74, 158, 74]],
    [0.80, [74, 158, 74]],
    [0.90, [50, 100, 45]],
    [1.0,  [20, 45, 20]]
  ], p);
  bgCtx.strokeStyle = rgb(tuftColor);
  bgCtx.lineWidth = 1.5;
  bgCtx.lineCap = 'round';

  // Seed-based pseudo-random positions (deterministic), placed on hill contour
  const tufts = Math.floor(W / 40);
  for (let i = 0; i < tufts; i++) {
    const x = (i * 47 + 13) % W;
    const ty = getHillY(x, W, groundY) + 2;
    const bladeCount = 2 + (i % 3);
    for (let b = 0; b < bladeCount; b++) {
      const angle = -Math.PI / 2 + (b - bladeCount / 2) * 0.3 + Math.sin(time * 1.2 + i + b) * 0.1;
      const len = 6 + (i * 7 + b * 3) % 8;
      bgCtx.beginPath();
      bgCtx.moveTo(x, ty);
      bgCtx.lineTo(x + Math.cos(angle) * len, ty + Math.sin(angle) * len);
      bgCtx.stroke();
    }
  }
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/* ═══════════════════════════════════════════════════
   THEME APPLICATION
   ═══════════════════════════════════════════════════ */
function applyFullTheme(themeName) {
  const theme = THEMES[themeName];
  if (!theme) return;

  state.theme = themeName;
  applyThemeVisual(themeName);

  // Also re-apply to current segment if it uses "default"
  const sess = getCurrentSession();
  if (sess) {
    const seg = sess.segments[state.currentSegmentIndex];
    if (seg && seg.theme && seg.theme !== 'default' && THEMES[seg.theme]) {
      // Current segment has an override — keep its visual theme
      applyThemeVisual(seg.theme);
    }
  }
}

/* ─── Per-segment theme override ─── */
function applySegmentTheme(segment) {
  const segTheme = segment && segment.theme;
  if (segTheme && segTheme !== 'default' && THEMES[segTheme]) {
    // Segment has a specific theme override — apply it visually
    // but don't change state.theme (the user's global preference)
    applyThemeVisual(segTheme);
  } else {
    // Revert to the user's global theme choice
    applyThemeVisual(state.theme);
  }
}

/* ─── Apply theme visuals without changing global preference ─── */
function applyThemeVisual(themeName) {
  const theme = THEMES[themeName];
  if (!theme) return;

  document.documentElement.setAttribute('data-theme', theme.colorMode);
  document.documentElement.setAttribute('data-bg-theme', themeName);
  themeToggle.innerHTML = theme.colorMode === 'dark' ? '&#9788;' : '&#9789;';

  // Handle background layers
  if (theme.background !== activeBackground) {
    removeBgCanvas();
    if (theme.background === 'starfield') {
      initStarfield();
    } else if (theme.background === 'growingTree') {
      initGrowingTree();
    }
  }

  // Update picker selection to show the global theme, not the segment override
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === state.theme);
  });
}

/* ═══════════════════════════════════════════════════
   THEME PICKER UI
   ═══════════════════════════════════════════════════ */
let themePickerEl = null;
let themePickerOpen = false;

function createThemePicker() {
  themePickerEl = document.createElement('div');
  themePickerEl.className = 'theme-picker';
  themePickerEl.innerHTML = Object.entries(THEMES).map(([key, t]) =>
    `<button class="theme-swatch ${state.theme === key ? 'active' : ''}" data-theme="${key}" title="${t.label}">
      <span class="swatch-color" style="background:${t.swatch}"></span>
    </button>`
  ).join('');
  themePickerEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    applyFullTheme(btn.dataset.theme);
    saveState();
    closeThemePicker();
  });
  document.body.appendChild(themePickerEl);
}

function toggleThemePicker() {
  if (!themePickerEl) createThemePicker();
  themePickerOpen = !themePickerOpen;
  if (themePickerOpen) {
    // Position near the theme toggle button
    const rect = themeToggle.getBoundingClientRect();
    themePickerEl.style.top = (rect.bottom + 6) + 'px';
    themePickerEl.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
    themePickerEl.classList.add('open');
    // Close on outside click
    setTimeout(() => document.addEventListener('click', outsideClickThemePicker), 0);
  } else {
    closeThemePicker();
  }
}

function closeThemePicker() {
  themePickerOpen = false;
  if (themePickerEl) themePickerEl.classList.remove('open');
  document.removeEventListener('click', outsideClickThemePicker);
}

function outsideClickThemePicker(e) {
  if (themePickerEl && !themePickerEl.contains(e.target) && e.target !== themeToggle) {
    closeThemePicker();
  }
}
