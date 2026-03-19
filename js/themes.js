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

