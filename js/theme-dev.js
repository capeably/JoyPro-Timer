/* ═══════════════════════════════════════════════════
   THEME DEV HARNESS — Controller
   ═══════════════════════════════════════════════════
   Provides manual progress control, playback, breakpoint
   markers, and a live state inspector for developing
   the Growing Tree / Bonsai animation.
   ═══════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── DOM refs ──
  const slider = document.getElementById('progressSlider');
  const display = document.getElementById('progressDisplay');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const stepBackBtn = document.getElementById('stepBackBtn');
  const stepBack1Btn = document.getElementById('stepBack1Btn');
  const stepFwdBtn = document.getElementById('stepFwdBtn');
  const stepFwd1Btn = document.getElementById('stepFwd1Btn');
  const inspectorToggle = document.getElementById('inspectorToggle');
  const inspectorEl = document.getElementById('inspector');
  const markersEl = document.getElementById('breakpointMarkers');
  const timerDigits = document.getElementById('timerDigits');

  // ── Playback state ──
  let playing = false;
  let speed = 1;
  let lastFrameTime = 0;

  // Total "session" duration for playback simulation (25 min default)
  const SESSION_DURATION = state.timerTotal;

  // ── Initialize the Growing Tree theme ──
  // The themeToggle button is referenced by themes.js — create a dummy
  if (!window.themeToggle) {
    const dummy = document.createElement('button');
    dummy.id = 'themeToggle';
    dummy.style.display = 'none';
    document.body.appendChild(dummy);
    window.themeToggle = dummy;
  }

  // Kick off the theme
  initGrowingTree();

  // ── Breakpoint markers ──
  function renderBreakpoints() {
    if (!markersEl) return;
    markersEl.innerHTML = '';

    // Trunk complete
    addMarker(BONSAI_TRUNK_PROGRESS_END, 'Trunk done', 'branch');

    // Branch triggers — we need to estimate progress values from Y triggers
    // These are approximate since triggers depend on trunk drawing length
    for (const trigger of BONSAI_BRANCH_TRIGGERS) {
      // Foliage markers (these are exact progress values)
      addMarker(trigger.foliageAt, trigger.padId.replace('bonsai-pad-', '') + ' leaf', 'foliage');
      addMarker(trigger.matureAt, trigger.padId.replace('bonsai-pad-', '') + ' mature', 'mature');
    }
  }

  function addMarker(progressVal, label, type) {
    const pct = (progressVal * 100).toFixed(0) + '%';
    const marker = document.createElement('div');
    marker.className = 'bp-marker ' + type;
    marker.style.left = pct;
    marker.title = label + ' @ ' + pct;

    const lbl = document.createElement('div');
    lbl.className = 'bp-marker-label';
    lbl.style.left = pct;
    lbl.textContent = label;

    markersEl.appendChild(marker);
    markersEl.appendChild(lbl);
  }

  renderBreakpoints();

  // ── Progress control ──
  function setProgress(value) {
    // value: 0-1
    const clamped = Math.max(0, Math.min(1, value));
    const sliderVal = Math.round(clamped * 1000);
    slider.value = sliderVal;

    // Update mock state so getTreeProgress() returns this value
    // progress = 1 - (timerSeconds / timerTotal)
    // timerSeconds = timerTotal * (1 - progress)
    state.timerSeconds = Math.round(state.timerTotal * (1 - clamped));

    // Update display
    display.textContent = (clamped * 100).toFixed(1) + '%';

    // Update mock timer digits
    const remaining = state.timerSeconds;
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    timerDigits.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');

    // Update inspector
    updateInspector(clamped);
  }

  function getProgress() {
    return parseInt(slider.value) / 1000;
  }

  // ── Slider input ──
  slider.addEventListener('input', () => {
    setProgress(parseInt(slider.value) / 1000);
  });

  // ── Step buttons ──
  stepBackBtn.addEventListener('click', () => setProgress(getProgress() - 0.05));
  stepBack1Btn.addEventListener('click', () => setProgress(getProgress() - 0.01));
  stepFwd1Btn.addEventListener('click', () => setProgress(getProgress() + 0.01));
  stepFwdBtn.addEventListener('click', () => setProgress(getProgress() + 0.05));

  resetBtn.addEventListener('click', () => {
    playing = false;
    playPauseBtn.innerHTML = '&#9654;';
    playPauseBtn.classList.remove('active');
    // Reset bonsai state fully
    resetBonsaiForSegment();
    setProgress(0);
  });

  // ── Play/Pause ──
  playPauseBtn.addEventListener('click', () => {
    playing = !playing;
    if (playing) {
      playPauseBtn.innerHTML = '&#9646;&#9646;';
      playPauseBtn.classList.add('active');
      lastFrameTime = performance.now();
      // If at end, restart
      if (getProgress() >= 0.999) {
        resetBonsaiForSegment();
        setProgress(0);
      }
      playbackLoop();
    } else {
      playPauseBtn.innerHTML = '&#9654;';
      playPauseBtn.classList.remove('active');
    }
  });

  function playbackLoop() {
    if (!playing) return;
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000; // seconds
    lastFrameTime = now;

    // Advance progress based on speed
    // At speed=1, it takes SESSION_DURATION seconds to go from 0 to 1
    const progressDelta = (dt * speed) / SESSION_DURATION;
    const newProgress = getProgress() + progressDelta;

    if (newProgress >= 1) {
      setProgress(1);
      playing = false;
      playPauseBtn.innerHTML = '&#9654;';
      playPauseBtn.classList.remove('active');
      return;
    }

    setProgress(newProgress);
    requestAnimationFrame(playbackLoop);
  }

  // ── Speed buttons ──
  document.querySelectorAll('[data-speed]').forEach(btn => {
    btn.addEventListener('click', () => {
      speed = parseFloat(btn.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Inspector toggle ──
  let inspectorOpen = false;
  inspectorToggle.addEventListener('click', () => {
    inspectorOpen = !inspectorOpen;
    inspectorEl.classList.toggle('open', inspectorOpen);
    inspectorToggle.textContent = inspectorOpen ? 'Inspector ▼' : 'Inspector ▲';
  });

  // ── Inspector update ──
  function updateInspector(progress) {
    if (!inspectorOpen) return;

    const items = [];

    // Progress info
    items.push(['Progress', (progress * 100).toFixed(1) + '%']);
    items.push(['Timer', timerDigits.textContent]);

    // Trunk info
    const trunkProgress = Math.min(1, progress / BONSAI_TRUNK_PROGRESS_END);
    const trunkEased = 1 - Math.pow(1 - trunkProgress, 1.6);
    items.push(['Trunk progress', (trunkProgress * 100).toFixed(1) + '%']);
    items.push(['Trunk drawn', (trunkEased * 100).toFixed(1) + '%']);

    // Branch states
    for (const id in bonsaiBranchState) {
      const bs = bonsaiBranchState[id];
      const elapsed = progress - bs.triggerProgress;
      const frac = Math.min(1, Math.max(0, elapsed / BONSAI_BRANCH_GROWTH_SPAN));
      const shortId = id.replace('bonsai-branch-', '');
      items.push([shortId + ' branch', (frac * 100).toFixed(0) + '%', frac > 0]);
    }

    // Foliage states
    for (const padId in bonsaiFoliageState) {
      const fs = bonsaiFoliageState[padId];
      const appearElapsed = progress - fs.triggerProgress;
      const appearFrac = Math.min(1, Math.max(0, appearElapsed / BONSAI_FOLIAGE_GROWTH_SPAN));
      const shortId = padId.replace('bonsai-pad-', '');
      const scaleVal = fs.padEl ? fs.padEl.style.scale : '0';
      items.push([shortId + ' foliage', 'scale=' + parseFloat(scaleVal).toFixed(2), appearFrac > 0]);
    }

    // Root info
    items.push(['Roots', trunkProgress > 0 ? (trunkProgress * 100).toFixed(0) + '%' : 'none']);

    // Render
    inspectorEl.innerHTML = items.map(([key, val, active]) =>
      `<div class="insp-item"><span class="insp-key">${key}</span><span class="insp-val${active ? ' active' : ''}">${val}</span></div>`
    ).join('');
  }

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;

    switch(e.key) {
      case ' ':
        e.preventDefault();
        playPauseBtn.click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        setProgress(getProgress() + (e.shiftKey ? 0.05 : 0.01));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setProgress(getProgress() - (e.shiftKey ? 0.05 : 0.01));
        break;
      case 'r':
      case 'R':
        resetBtn.click();
        break;
      case 'i':
      case 'I':
        inspectorToggle.click();
        break;
      case '0':
        setProgress(0);
        break;
      case '1':
        setProgress(0.1);
        break;
      case '2':
        setProgress(0.2);
        break;
      case '3':
        setProgress(0.3);
        break;
      case '4':
        setProgress(0.4);
        break;
      case '5':
        setProgress(0.5);
        break;
      case '6':
        setProgress(0.6);
        break;
      case '7':
        setProgress(0.7);
        break;
      case '8':
        setProgress(0.8);
        break;
      case '9':
        setProgress(0.9);
        break;
    }
  });

  // Set initial state
  setProgress(0);

})();
