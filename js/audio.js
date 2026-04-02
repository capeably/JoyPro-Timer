/* ═══════════════════════════════════════════════════
   SOUND SYSTEM
   ═══════════════════════════════════════════════════ */
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

/* ─── Built-in sound registry ─── */
const BUILT_IN_SOUNDS = [
  { key: 'default',       label: 'Classic Chime',   file: 'files/segment-finished.mp3' },
  { key: 'gentle-bell',   label: 'Gentle Bell',     file: 'files/gentle-bell.wav' },
  { key: 'digital-beep',  label: 'Digital Beep',    file: 'files/digital-beep.wav' },
  { key: 'wooden-block',  label: 'Wooden Block',    file: 'files/wooden-block.wav' },
  { key: 'singing-bowl',  label: 'Singing Bowl',    file: 'files/singing-bowl.wav' },
];

// Preload all built-in sounds
for (const snd of BUILT_IN_SOUNDS) {
  snd.audio = new Audio(snd.file);
  snd.audio.preload = 'auto';
}

function playChime() {
  if (state.globalMute) return;

  const sess = getCurrentSession();
  const segment = sess?.segments[state.currentSegmentIndex];
  if (segment && !segment.soundEnabled) return;

  // Check for custom sound first (per-segment upload)
  const customKey = state.currentSegmentIndex + '_' + state.currentSessionName;
  const customData = getCustomSoundData(customKey);
  if (customData) {
    ensureAudioCtx();
    playCustomSound(customData);
    return;
  }

  // Play built-in sound by key
  const soundKey = segment?.soundKey || 'default';
  const builtin = BUILT_IN_SOUNDS.find(s => s.key === soundKey);
  if (builtin && builtin.audio) {
    builtin.audio.currentTime = 0;
    builtin.audio.play().catch(() => {});
  }
}

function previewSound(soundKey) {
  // Preview a built-in sound by key
  const builtin = BUILT_IN_SOUNDS.find(s => s.key === soundKey);
  if (builtin && builtin.audio) {
    builtin.audio.currentTime = 0;
    builtin.audio.play().catch(() => {});
    return;
  }
  // Try custom sound
  const customData = getCustomSoundData(soundKey);
  if (customData) {
    ensureAudioCtx();
    playCustomSound(customData);
  }
}

/* ─── Custom sound helpers (backward compat: value can be string or {data,name}) ─── */
function getCustomSoundData(key) {
  const val = customSounds[key];
  if (!val) return null;
  return typeof val === 'string' ? val : val.data;
}

function getCustomSoundName(key) {
  const val = customSounds[key];
  if (!val) return 'Custom Sound';
  return (typeof val === 'object' && val.name) ? val.name : 'Custom Sound';
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

/* ─── Helper: build sound dropdown options HTML ─── */
function buildSoundOptionsHTML(selectedKey, segIdx, sessName) {
  let html = '<optgroup label="Default Sounds">';
  for (const snd of BUILT_IN_SOUNDS) {
    const sel = snd.key === selectedKey ? ' selected' : '';
    html += `<option value="${snd.key}"${sel}>${snd.label}</option>`;
  }
  html += '</optgroup>';

  // Custom sounds for this session
  const customKeys = Object.keys(customSounds).filter(k => k.endsWith('_' + sessName));
  if (customKeys.length > 0) {
    html += '<optgroup label="Custom Sounds">';
    for (const ck of customKeys) {
      const label = getCustomSoundName(ck);
      const sel = ck === (segIdx + '_' + sessName) ? ' selected' : '';
      html += `<option value="custom:${ck}"${sel}>${escHtml(label)}</option>`;
    }
    html += '</optgroup>';
  }

  return html;
}
