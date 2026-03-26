/* ═══════════════════════════════════════════════════
   TIMER ENGINE
   ═══════════════════════════════════════════════════ */
function startTimer() {
  if (running) return;
  ensureAudioCtx();
  const sess = getCurrentSession();
  if (!sess || !sess.segments.length) return;

  running = true;
  timerStartedAt = Date.now();
  timerSecondsAtStart = state.timerSeconds;
  hideOverlays();
  renderSessionPanel();
  renderTimer();

  timerInterval = setInterval(tick, 250);
}

function pauseTimer() {
  running = false;
  timerStartedAt = null;
  timerSecondsAtStart = null;
  clearInterval(timerInterval);
  timerInterval = null;
  renderSessionPanel();
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
    onSegmentComplete();
  }
}

function onSegmentComplete() {
  pauseTimer();
  playChime();

  const sess = getCurrentSession();
  if (!sess) return;

  const completedSegment = sess.segments[state.currentSegmentIndex];
  const nextIndex = state.currentSegmentIndex + 1;

  if (nextIndex >= sess.segments.length) {
    showCompleteOverlay();
    return;
  }

  // Only auto-advance if the completed segment has autoAdvance enabled
  if (completedSegment && completedSegment.autoAdvance) {
    advanceToSegment(nextIndex);
    startTimer();
  } else {
    // Move to next segment but don't start — user must press play
    advanceToSegment(nextIndex);
  }
}

function advanceToSegment(index) {
  const sess = getCurrentSession();
  if (!sess || index < 0 || index >= sess.segments.length) return;

  pauseTimer();
  hideOverlays();

  state.currentSegmentIndex = index;
  const s = sess.segments[index];
  state.timerTotal = segmentTotalSeconds(s);
  state.timerSeconds = state.timerTotal;

  // Apply per-segment theme (or revert to global default)
  applySegmentTheme(s);

  renderSessionPanel();
  renderTimer();
  markDirty();
}

function resetSession() {
  pauseTimer();
  hideOverlays();
  advanceToSegment(0);
}
