/* ═══════════════════════════════════════════════════
   SOUND SYSTEM
   ═══════════════════════════════════════════════════ */
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playChime() {
  if (state.globalMute) return;
  ensureAudioCtx();

  const seq = getCurrentSequence();
  const session = seq?.sessions[state.currentSessionIndex];
  if (session && !session.soundEnabled) return;

  const soundKey = state.currentSessionIndex + '_' + state.currentSequenceName;
  if (customSounds[soundKey]) {
    playCustomSound(customSounds[soundKey]);
    return;
  }

  const now = audioCtx.currentTime;
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  const gain2 = audioCtx.createGain();

  osc1.type = 'sine';
  osc1.frequency.value = 830;
  osc2.type = 'sine';
  osc2.frequency.value = 1100;

  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  gain2.gain.setValueAtTime(0.2, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

  osc1.connect(gain1).connect(audioCtx.destination);
  osc2.connect(gain2).connect(audioCtx.destination);

  osc1.start(now);
  osc1.stop(now + 0.8);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.9);
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
