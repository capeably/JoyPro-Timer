/* ═══════════════════════════════════════════════════
   TIMER ENGINE
   ═══════════════════════════════════════════════════ */
function startTimer() {
  if (running) return;
  ensureAudioCtx();
  const seq = getCurrentSequence();
  if (!seq || !seq.sessions.length) return;

  running = true;
  timerStartedAt = Date.now();
  timerSecondsAtStart = state.timerSeconds;
  hideOverlays();
  renderSidebar();
  renderTimer();

  timerInterval = setInterval(tick, 250);
}

function pauseTimer() {
  running = false;
  timerStartedAt = null;
  timerSecondsAtStart = null;
  clearInterval(timerInterval);
  timerInterval = null;
  renderSidebar();
  renderTimer();
  markDirty();
}

function tick() {
  const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
  const remaining = Math.max(0, timerSecondsAtStart - elapsed);

  if (remaining === state.timerSeconds) return;
  state.timerSeconds = remaining;
  renderTimer();
  markDirty();

  if (remaining <= 0) {
    onSessionComplete();
  }
}

function onSessionComplete() {
  pauseTimer();
  playChime();
  triggerShootingStar();

  const seq = getCurrentSequence();
  if (!seq) return;

  const nextIndex = state.currentSessionIndex + 1;
  if (nextIndex >= seq.sessions.length) {
    showCompleteOverlay();
    return;
  }

  // Auto-advance directly to the next session
  advanceToSession(nextIndex);
  startTimer();
}

function advanceToSession(index) {
  const seq = getCurrentSequence();
  if (!seq || index < 0 || index >= seq.sessions.length) return;

  pauseTimer();
  hideOverlays();

  state.currentSessionIndex = index;
  const s = seq.sessions[index];
  state.timerTotal = sessionTotalSeconds(s);
  state.timerSeconds = state.timerTotal;

  renderSidebar();
  renderTimer();
  markDirty();
}

function resetSequence() {
  pauseTimer();
  hideOverlays();
  advanceToSession(0);
}
