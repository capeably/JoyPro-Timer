/* ═══════════════════════════════════════════════════
   SOUND SYSTEM
   ═══════════════════════════════════════════════════ */
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

const defaultChimeAudio = new Audio('files/segment-finished.mp3');
defaultChimeAudio.preload = 'auto';

function loadDefaultChime() {
  // Audio element is created above and preloads automatically
}

function playChime() {
  if (state.globalMute) return;

  const sess = getCurrentSession();
  const segment = sess?.segments[state.currentSegmentIndex];
  if (segment && !segment.soundEnabled) return;

  const soundKey = state.currentSegmentIndex + '_' + state.currentSessionName;
  if (customSounds[soundKey]) {
    ensureAudioCtx();
    playCustomSound(customSounds[soundKey]);
    return;
  }

  // Play default mp3 chime
  defaultChimeAudio.currentTime = 0;
  defaultChimeAudio.play().catch(() => {});
}

function playCustomSound(dataUrl) {
  ensureAudioCtx();
  fetch(dataUrl)
    .then(r => r.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(decoded => {
      const src = audioCtx.createBufferSource();
      src.buffer = decoded;
      src.connect(audioCtx.destination);
      src.start();
    })
    .catch(() => {});
}

function updateMuteBtn() {
  muteToggle.innerHTML = state.globalMute ? '&#128264;' : '&#128276;';
  muteToggle.classList.toggle('muted', state.globalMute);
}
