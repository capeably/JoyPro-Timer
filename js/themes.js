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
  if (bgCanvas) { bgCanvas.remove(); bgCanvas = null; bgCtx = null; }
  setBgTransparency(false);
  // Clear any dynamic CSS overrides from Growing Tree
  document.documentElement.style.removeProperty('--text');
  document.documentElement.style.removeProperty('--text-muted');
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

  // ── Tree ──
  const treeCenterX = W * 0.5;
  const treeBaseY = groundY + 2;
  drawTree(treeCenterX, treeBaseY, progress, now);

  // ── Grass tufts (darken at night) ──
  drawGrassTufts(W, H, groundY, now, progress);

  // ── Dynamic text color — lighten as sky darkens ──
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
  const root = document.documentElement;
  root.style.setProperty('--text', `rgb(${textColor[0]},${textColor[1]},${textColor[2]})`);
  root.style.setProperty('--text-muted', `rgb(${textMuted[0]},${textMuted[1]},${textMuted[2]})`);

  bgAnimId = requestAnimationFrame(renderGrowingTree);
}

function drawCloud(x, y, w, h, color, alpha) {
  const c = color || [255, 255, 255];
  const a = alpha !== undefined ? alpha : 0.85;
  bgCtx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  // Cloud made of overlapping circles
  const r = h * 0.7;
  bgCtx.beginPath();
  bgCtx.arc(x + w * 0.3, y, r, 0, Math.PI * 2);
  bgCtx.arc(x + w * 0.5, y - r * 0.4, r * 1.2, 0, Math.PI * 2);
  bgCtx.arc(x + w * 0.7, y, r * 0.9, 0, Math.PI * 2);
  bgCtx.arc(x + w * 0.15, y + r * 0.2, r * 0.7, 0, Math.PI * 2);
  bgCtx.arc(x + w * 0.85, y + r * 0.15, r * 0.6, 0, Math.PI * 2);
  bgCtx.fill();
}

function drawTree(cx, baseY, progress, time) {
  // ── Easing for organic growth ──
  const p = easeOutQuart(Math.min(1, progress));

  // ── Dimensions ──
  const maxTrunkH = Math.min(160, bgCanvas.height * 0.18);
  const minTrunkH = 12;
  const trunkH = minTrunkH + (maxTrunkH - minTrunkH) * p;
  const trunkBottomW = 4 + 18 * p;
  const trunkTopW = trunkBottomW * 0.2;

  // ── S-curve control points ── (develop as tree grows)
  const sCurve = p * 12; // max horizontal offset for S-curve
  const topOffsetX = sCurve * 0.4; // trunk top drifts slightly right
  const trunkTopX = cx + topOffsetX;
  const trunkTopY = baseY - trunkH;

  // ── Nebari / surface roots (after 40%) ──
  if (p > 0.4) {
    drawNebari(cx, baseY, trunkBottomW, (p - 0.4) / 0.6);
  }

  // ── Bonsai trunk (S-curved) ──
  // Left edge of trunk
  bgCtx.beginPath();
  bgCtx.moveTo(cx - trunkBottomW / 2, baseY);
  bgCtx.bezierCurveTo(
    cx - trunkBottomW * 0.3 - sCurve, baseY - trunkH * 0.35,
    cx - trunkTopW * 0.3 + sCurve * 0.6, baseY - trunkH * 0.65,
    trunkTopX - trunkTopW / 2, trunkTopY
  );
  // Right edge of trunk (reverse)
  bgCtx.lineTo(trunkTopX + trunkTopW / 2, trunkTopY);
  bgCtx.bezierCurveTo(
    cx + trunkTopW * 0.3 + sCurve * 0.6, baseY - trunkH * 0.65,
    cx + trunkBottomW * 0.3 - sCurve, baseY - trunkH * 0.35,
    cx + trunkBottomW / 2, baseY
  );
  bgCtx.closePath();
  const trunkGrad = bgCtx.createLinearGradient(cx - trunkBottomW, 0, cx + trunkBottomW, 0);
  trunkGrad.addColorStop(0, '#5C3D2E');
  trunkGrad.addColorStop(0.5, '#7B5B44');
  trunkGrad.addColorStop(1, '#5C3D2E');
  bgCtx.fillStyle = trunkGrad;
  bgCtx.fill();

  // ── Bark texture (after 50%) ──
  if (p > 0.5) {
    bgCtx.strokeStyle = 'rgba(60, 35, 20, 0.2)';
    bgCtx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const t = 0.2 + i * 0.18;
      const barkY = baseY - trunkH * t;
      const barkX = cx + Math.sin(t * 5) * sCurve * (0.5 - t);
      const barkW = trunkBottomW * (1 - t * 0.7) * 0.4;
      bgCtx.beginPath();
      bgCtx.arc(barkX, barkY, barkW, 0.2, Math.PI - 0.2);
      bgCtx.stroke();
    }
  }

  // ── Sample spine points for branch attachment ──
  const spine = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    // Approximate cubic bezier center-line position
    const sy = baseY - trunkH * t;
    const sx = cx + Math.sin(t * Math.PI) * sCurve * (0.5 - t) * 2 + topOffsetX * t;
    const sw = trunkBottomW * (1 - t * 0.8) + trunkTopW * t * 0.8;
    spine.push({ x: sx, y: sy, w: sw });
  }

  // ── Branches + foliage pads (after 25%) ──
  let branchEndpoints = [];
  if (p > 0.25) {
    const branchP = (p - 0.25) / 0.75;
    branchEndpoints = drawBonsaiBranches(spine, branchP, time);
  }

  // ── Foliage pads (after 20%) ──
  if (p > 0.20) {
    const leafP = (p - 0.20) / 0.80;
    // Crown pad at trunk apex
    const sway = Math.sin(time * 0.5) * 2 * p;
    branchEndpoints.push({
      x: trunkTopX + sway, y: trunkTopY, size: 1.3, tier: 0
    });
    drawFoliagePads(branchEndpoints, leafP, time);
  }

  // ── Sprout leaves at very beginning ──
  if (p < 0.3) {
    const sproutP = Math.min(1, p / 0.15);
    drawSproutLeaves(cx, baseY - trunkH, sproutP);
  }
}

function drawNebari(cx, baseY, trunkW, p) {
  // Surface roots spreading from trunk base
  bgCtx.lineCap = 'round';
  const roots = [
    { angle: -15, side: -1 }, { angle: -25, side: 1 },
    { angle: -10, side: -1 }, { angle: -20, side: 1 },
    { angle: -30, side: -1 }
  ];
  for (let i = 0; i < roots.length; i++) {
    const r = roots[i];
    const rootLen = (8 + 22 * p) * (1 - i * 0.1);
    const startX = cx + r.side * trunkW * 0.25;
    const rad = r.angle * Math.PI / 180;
    const endX = startX + Math.cos(rad) * rootLen * r.side;
    const endY = baseY + Math.sin(Math.abs(rad)) * rootLen * 0.4 + 2;

    // Thick to thin root
    bgCtx.strokeStyle = '#6B4C3B';
    bgCtx.lineWidth = trunkW * 0.12 * (1 - i * 0.12);
    bgCtx.beginPath();
    bgCtx.moveTo(startX, baseY);
    bgCtx.quadraticCurveTo(
      startX + r.side * rootLen * 0.5, baseY + rootLen * 0.15,
      endX, endY
    );
    bgCtx.stroke();
  }
}

function drawSproutLeaves(cx, topY, p) {
  if (p <= 0) return;
  const leafSize = 6 + 8 * p;
  bgCtx.save();
  bgCtx.fillStyle = '#6CBF5C';

  // Left leaf
  bgCtx.save();
  bgCtx.translate(cx - 2, topY);
  bgCtx.rotate(-0.5);
  bgCtx.beginPath();
  bgCtx.ellipse(0, -leafSize / 2, leafSize * 0.4, leafSize / 2, 0, 0, Math.PI * 2);
  bgCtx.fill();
  bgCtx.restore();

  // Right leaf
  bgCtx.save();
  bgCtx.translate(cx + 2, topY);
  bgCtx.rotate(0.5);
  bgCtx.beginPath();
  bgCtx.ellipse(0, -leafSize / 2, leafSize * 0.4, leafSize / 2, 0, 0, Math.PI * 2);
  bgCtx.fill();
  bgCtx.restore();

  bgCtx.restore();
}

function drawBonsaiBranches(spine, p, time) {
  // Bonsai branches: horizontal, tiered, alternating sides
  const branchDefs = [
    { spineIdx: 2, side: -1, angle: -5, lenFactor: 1.0 },
    { spineIdx: 2, side:  1, angle: -8, lenFactor: 0.85 },
    { spineIdx: 3, side: -1, angle: -3, lenFactor: 0.75 },
    { spineIdx: 3, side:  1, angle: -10, lenFactor: 0.65 },
    { spineIdx: 4, side: -1, angle: -6, lenFactor: 0.5 }
  ];

  const endpoints = [];
  const maxBranches = Math.floor(2 + p * 3); // 2→5 branches
  bgCtx.strokeStyle = '#6B4C3B';
  bgCtx.lineCap = 'round';

  for (let i = 0; i < Math.min(maxBranches, branchDefs.length); i++) {
    const def = branchDefs[i];
    const sp = spine[def.spineIdx];
    const branchLen = (20 + p * 45) * def.lenFactor;
    const rad = def.angle * Math.PI / 180;
    const sway = Math.sin(time * 0.8 + i * 1.5) * 0.04 * p;

    // Branch endpoint — mostly horizontal with slight droop/rise
    const endX = sp.x + def.side * branchLen;
    const endY = sp.y + Math.sin(rad + sway) * branchLen * 0.3 - branchLen * 0.1;

    // Draw branch
    const lw = 1.5 + p * 2.5 * (1 - i * 0.15);
    bgCtx.lineWidth = lw;
    bgCtx.beginPath();
    bgCtx.moveTo(sp.x, sp.y);
    bgCtx.quadraticCurveTo(
      sp.x + def.side * branchLen * 0.5,
      sp.y - branchLen * 0.08 + Math.sin(sway) * 3,
      endX, endY
    );
    bgCtx.stroke();

    endpoints.push({
      x: endX, y: endY,
      size: def.lenFactor, tier: def.spineIdx
    });

    // Sub-branches (after 60% growth)
    if (p > 0.6) {
      const subP = (p - 0.6) / 0.4;
      const subLen = branchLen * 0.4 * subP;
      const midX = sp.x + def.side * branchLen * 0.6;
      const midY = sp.y + (endY - sp.y) * 0.6;
      const subEndX = midX + def.side * subLen * 0.5;
      const subEndY = midY - subLen * 0.6;

      bgCtx.lineWidth = lw * 0.5;
      bgCtx.beginPath();
      bgCtx.moveTo(midX, midY);
      bgCtx.quadraticCurveTo(midX + def.side * subLen * 0.3, midY - subLen * 0.3, subEndX, subEndY);
      bgCtx.stroke();

      endpoints.push({
        x: subEndX, y: subEndY,
        size: def.lenFactor * 0.45, tier: def.spineIdx
      });
    }
  }

  return endpoints;
}

function drawFoliagePads(endpoints, p, time) {
  // Sort bottom-to-top so upper pads overlap lower
  endpoints.sort((a, b) => b.y - a.y);

  for (let i = 0; i < endpoints.length; i++) {
    const ep = endpoints[i];
    const padRx = (8 + 66 * p) * ep.size; // horizontal radius
    const padRy = padRx * 0.45; // flattened cloud shape
    const sway = Math.sin(time * 0.5 + i * 1.2) * 2 * p;

    // Shadow under pad
    bgCtx.fillStyle = 'rgba(0, 80, 0, 0.06)';
    bgCtx.beginPath();
    bgCtx.ellipse(ep.x + sway * 0.5, ep.y + padRy * 0.5, padRx * 0.9, padRy * 0.25, 0, 0, Math.PI * 2);
    bgCtx.fill();

    // Dark green back layer
    bgCtx.fillStyle = '#3A8A30';
    drawFoliagePad(ep.x + sway, ep.y - padRy * 0.1, padRx, padRy, 0.95, time, i);

    // Mid green layer
    bgCtx.fillStyle = '#4EA842';
    drawFoliagePad(ep.x + sway, ep.y - padRy * 0.25, padRx * 0.85, padRy * 0.85, 0.9, time, i + 10);

    // Light green front layer
    bgCtx.fillStyle = '#6CBF5C';
    drawFoliagePad(ep.x + sway, ep.y - padRy * 0.35, padRx * 0.65, padRy * 0.7, 0.85, time, i + 20);

    // Highlight
    bgCtx.fillStyle = 'rgba(180, 230, 120, 0.3)';
    bgCtx.beginPath();
    bgCtx.arc(ep.x + sway - padRx * 0.2, ep.y - padRy * 0.6, padRx * 0.2, 0, Math.PI * 2);
    bgCtx.fill();
  }
}

function drawFoliagePad(cx, cy, rx, ry, scale, time, seed) {
  // Flattened cloud-pad shape using overlapping circles
  const circles = 5;
  bgCtx.beginPath();
  for (let i = 0; i < circles; i++) {
    const a = (i / circles) * Math.PI * 2 + seed;
    const sway = Math.sin(time * 0.7 + i + seed) * 1.5;
    const bx = cx + Math.cos(a) * rx * 0.35 + sway;
    const by = cy + Math.sin(a) * ry * 0.3;
    const br = Math.min(rx, ry) * scale * (0.45 + Math.sin(i * 1.3 + seed) * 0.1);
    bgCtx.moveTo(bx + br, by);
    bgCtx.arc(bx, by, br, 0, Math.PI * 2);
  }
  bgCtx.fill();
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

  // Seed-based pseudo-random positions (deterministic)
  const tufts = Math.floor(W / 40);
  for (let i = 0; i < tufts; i++) {
    const x = (i * 47 + 13) % W;
    const baseYOffset = Math.sin(i * 3.7) * 8;
    const ty = groundY + baseYOffset + 2;
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
