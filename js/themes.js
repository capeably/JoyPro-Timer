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
  if (bgCanvas) { bgCanvas.remove(); bgCanvas = null; bgCtx = null; }
  setBgTransparency(false);
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
  // Re-init clouds if growing tree active
  if (activeBackground === 'growingTree') {
    initTreeClouds();
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
    const outerGlow = bgCtx.createRadialGradient(x, y, 0, x, y, 40);
    outerGlow.addColorStop(0, `rgba(255, 200, 100, ${0.4 * fade})`);
    outerGlow.addColorStop(0.3, `rgba(255, 150, 50, ${0.15 * fade})`);
    outerGlow.addColorStop(1, `rgba(255, 100, 20, 0)`);
    bgCtx.beginPath();
    bgCtx.arc(x, y, 40, 0, Math.PI * 2);
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
  renderGrowingTree();
}

function getTreeProgress() {
  // progress: 0 = just started (sapling), 1 = done (full tree)
  if (!state || state.timerTotal <= 0) return 0;
  return 1 - (state.timerSeconds / state.timerTotal);
}

function renderGrowingTree() {
  if (activeBackground !== 'growingTree' || !bgCtx) return;
  const W = bgCanvas.width;
  const H = bgCanvas.height;
  const now = performance.now() / 1000;
  const progress = getTreeProgress(); // 0→1

  bgCtx.clearRect(0, 0, W, H);

  // ── Sky gradient ──
  const skyGrad = bgCtx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#5BB8F5');
  skyGrad.addColorStop(0.55, '#87CEEB');
  skyGrad.addColorStop(0.7, '#B5E3F5');
  bgCtx.fillStyle = skyGrad;
  bgCtx.fillRect(0, 0, W, H);

  // ── Sun ──
  const sunX = W * 0.82;
  const sunY = H * 0.12;
  const sunGlow = bgCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
  sunGlow.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
  sunGlow.addColorStop(0.3, 'rgba(255, 220, 120, 0.3)');
  sunGlow.addColorStop(1, 'rgba(255, 200, 80, 0)');
  bgCtx.fillStyle = sunGlow;
  bgCtx.fillRect(sunX - 80, sunY - 80, 160, 160);
  bgCtx.beginPath();
  bgCtx.arc(sunX, sunY, 28, 0, Math.PI * 2);
  bgCtx.fillStyle = '#FFE566';
  bgCtx.fill();

  // ── Clouds ── (slow drift)
  for (const c of treeClouds) {
    c.x += c.speed * (1 / 60); // ~60fps
    if (c.x > W + c.w) c.x = -c.w - 20;
    drawCloud(c.x, c.y, c.w, c.h);
  }

  // ── Ground ──
  const groundY = H * 0.72;
  // Rolling hills
  bgCtx.beginPath();
  bgCtx.moveTo(0, groundY);
  bgCtx.quadraticCurveTo(W * 0.15, groundY - 20, W * 0.3, groundY);
  bgCtx.quadraticCurveTo(W * 0.5, groundY + 15, W * 0.7, groundY - 10);
  bgCtx.quadraticCurveTo(W * 0.85, groundY + 10, W, groundY);
  bgCtx.lineTo(W, H);
  bgCtx.lineTo(0, H);
  bgCtx.closePath();
  const grassGrad = bgCtx.createLinearGradient(0, groundY, 0, H);
  grassGrad.addColorStop(0, '#5CB85C');
  grassGrad.addColorStop(0.3, '#4A9E4A');
  grassGrad.addColorStop(1, '#3A7A3A');
  bgCtx.fillStyle = grassGrad;
  bgCtx.fill();

  // ── Tree ──
  const treeCenterX = W * 0.5;
  const treeBaseY = groundY + 2;
  drawTree(treeCenterX, treeBaseY, progress, now);

  // ── Small grass tufts ──
  drawGrassTufts(W, H, groundY, now);

  bgAnimId = requestAnimationFrame(renderGrowingTree);
}

function drawCloud(x, y, w, h) {
  bgCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
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

  // ── Trunk ──
  const maxTrunkH = Math.min(180, bgCanvas.height * 0.22);
  const minTrunkH = 12;
  const trunkH = minTrunkH + (maxTrunkH - minTrunkH) * p;
  const maxTrunkW = 14;
  const minTrunkW = 3;
  const trunkBottomW = minTrunkW + (maxTrunkW - minTrunkW) * p;
  const trunkTopW = trunkBottomW * 0.4;

  // Slight trunk curve
  const trunkTopY = baseY - trunkH;

  bgCtx.beginPath();
  bgCtx.moveTo(cx - trunkBottomW / 2, baseY);
  bgCtx.quadraticCurveTo(cx - trunkTopW / 2 - 2, baseY - trunkH * 0.5, cx - trunkTopW / 2, trunkTopY);
  bgCtx.lineTo(cx + trunkTopW / 2, trunkTopY);
  bgCtx.quadraticCurveTo(cx + trunkTopW / 2 + 2, baseY - trunkH * 0.5, cx + trunkBottomW / 2, baseY);
  bgCtx.closePath();
  const trunkGrad = bgCtx.createLinearGradient(cx - trunkBottomW, 0, cx + trunkBottomW, 0);
  trunkGrad.addColorStop(0, '#5C3D2E');
  trunkGrad.addColorStop(0.5, '#7B5B44');
  trunkGrad.addColorStop(1, '#5C3D2E');
  bgCtx.fillStyle = trunkGrad;
  bgCtx.fill();

  // ── Branches (appear after 25% growth) ──
  if (p > 0.25) {
    const branchP = (p - 0.25) / 0.75; // 0→1 after 25%
    drawBranches(cx, trunkTopY, trunkH, branchP, time);
  }

  // ── Leaf canopy (appears after 15% growth) ──
  if (p > 0.15) {
    const leafP = (p - 0.15) / 0.85; // 0→1 for leaf growth
    drawCanopy(cx, trunkTopY, trunkH, leafP, time);
  }

  // ── Small sprout leaves at very beginning ──
  if (p < 0.3) {
    const sproutP = Math.min(1, p / 0.15);
    drawSproutLeaves(cx, baseY - trunkH, sproutP);
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

function drawBranches(cx, trunkTopY, trunkH, p, time) {
  const branchCount = Math.floor(2 + p * 4); // 2→6 branches
  bgCtx.strokeStyle = '#6B4C3B';
  bgCtx.lineCap = 'round';

  for (let i = 0; i < branchCount; i++) {
    const t = (i + 1) / (branchCount + 1); // position along trunk height
    const side = i % 2 === 0 ? -1 : 1;
    const branchY = trunkTopY + trunkH * t * 0.6;
    const branchLen = (15 + p * 35) * (1 - t * 0.4);
    const angle = side * (0.4 + t * 0.3);
    const sway = Math.sin(time * 0.8 + i * 1.5) * 0.03 * p;

    const endX = cx + Math.cos(-Math.PI / 2 + angle + sway) * branchLen * side;
    const endY = branchY + Math.sin(-Math.PI / 2 + angle + sway) * branchLen * -0.5;

    bgCtx.lineWidth = 1.5 + p * 2 * (1 - t * 0.5);
    bgCtx.beginPath();
    bgCtx.moveTo(cx, branchY);
    bgCtx.quadraticCurveTo(cx + side * branchLen * 0.3, branchY - branchLen * 0.3, endX, endY);
    bgCtx.stroke();
  }
}

function drawCanopy(cx, trunkTopY, trunkH, p, time) {
  // Canopy = layered circles of green
  const canopyR = (20 + 60 * p);
  const canopyCenterY = trunkTopY - canopyR * 0.3;
  const sway = Math.sin(time * 0.5) * 3 * p;

  // Shadow under canopy
  bgCtx.fillStyle = 'rgba(0, 80, 0, 0.08)';
  bgCtx.beginPath();
  bgCtx.ellipse(cx + sway * 0.5, trunkTopY + trunkH * 0.05, canopyR * 1.1, canopyR * 0.2, 0, 0, Math.PI * 2);
  bgCtx.fill();

  // Dark green back layer
  bgCtx.fillStyle = '#3A8A30';
  drawCanopyBlob(cx + sway, canopyCenterY, canopyR, 0.9, time, 0);

  // Mid green middle layer
  bgCtx.fillStyle = '#4EA842';
  drawCanopyBlob(cx + sway, canopyCenterY - canopyR * 0.1, canopyR * 0.85, 0.85, time, 1);

  // Light green front layer
  bgCtx.fillStyle = '#6CBF5C';
  drawCanopyBlob(cx + sway, canopyCenterY - canopyR * 0.15, canopyR * 0.65, 0.8, time, 2);

  // Highlight spots
  bgCtx.fillStyle = 'rgba(180, 230, 120, 0.35)';
  bgCtx.beginPath();
  bgCtx.arc(cx + sway - canopyR * 0.2, canopyCenterY - canopyR * 0.3, canopyR * 0.25, 0, Math.PI * 2);
  bgCtx.fill();
}

function drawCanopyBlob(cx, cy, r, scale, time, seed) {
  // Organic blob shape using overlapping circles
  const circles = 5;
  bgCtx.beginPath();
  for (let i = 0; i < circles; i++) {
    const a = (i / circles) * Math.PI * 2 + seed;
    const dist = r * 0.3;
    const sway = Math.sin(time * 0.7 + i + seed) * 2;
    const bx = cx + Math.cos(a) * dist + sway;
    const by = cy + Math.sin(a) * dist * 0.7;
    const br = r * scale * (0.5 + Math.sin(i * 1.3 + seed) * 0.15);
    bgCtx.moveTo(bx + br, by);
    bgCtx.arc(bx, by, br, 0, Math.PI * 2);
  }
  bgCtx.fill();
}

function drawGrassTufts(W, H, groundY, time) {
  bgCtx.strokeStyle = '#4A9E4A';
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
  document.documentElement.setAttribute('data-theme', theme.colorMode);
  document.documentElement.setAttribute('data-bg-theme', themeName);

  // Update theme toggle icon
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

  // Update picker selection
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === themeName);
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
    themePickerEl.style.right = (window.innerWidth - rect.right) + 'px';
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
