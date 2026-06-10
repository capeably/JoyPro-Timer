/* ═══════════════════════════════════════════════════
   SOUND SYSTEM
   Decoupled playback utility — any component can call
   playSound(soundKey) without knowing about sessions.
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

/* ─── Core playback utility (decoupled from sessions) ─── */
function playSound(soundKey) {
  if (state.globalMute) return;

  // Custom sound — key starts with "custom:"
  if (soundKey.startsWith('custom:')) {
    const id = soundKey.slice(7);
    ensureAudioCtx();
    SoundStore.load(id).then(dataUrl => {
      if (dataUrl) playCustomSound(dataUrl);
    }).catch(() => {});
    return;
  }

  // Built-in sound
  const builtin = BUILT_IN_SOUNDS.find(s => s.key === soundKey);
  if (builtin && builtin.audio) {
    builtin.audio.currentTime = 0;
    builtin.audio.play().catch(() => {});
  }
}

/* ─── Session-aware wrapper (reads current segment) ─── */
function playChime() {
  if (state.globalMute) return;

  const sess = getCurrentSession();
  const segment = sess?.segments[state.currentSegmentIndex];
  if (segment && !segment.soundEnabled) return;

  const soundKey = segment?.soundKey || 'default';
  playSound(soundKey);
}

function previewSound(soundKey) {
  // Built-in
  const builtin = BUILT_IN_SOUNDS.find(s => s.key === soundKey);
  if (builtin && builtin.audio) {
    builtin.audio.currentTime = 0;
    builtin.audio.play().catch(() => {});
    return;
  }
  // Custom sound via SoundStore
  if (soundKey.startsWith('custom:')) {
    const id = soundKey.slice(7);
    ensureAudioCtx();
    SoundStore.load(id).then(dataUrl => {
      if (dataUrl) playCustomSound(dataUrl);
    }).catch(() => {});
    return;
  }
  // Try bare ID (preview from library)
  ensureAudioCtx();
  SoundStore.load(soundKey).then(dataUrl => {
    if (dataUrl) playCustomSound(dataUrl);
  }).catch(() => {});
}

/* ─── Custom sound helpers ─── */
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
  muteToggle.classList.toggle('muted', state.globalMute);
}

/* ─── Helper: build sound dropdown options HTML ─── */
function buildSoundOptionsHTML(selectedKey) {
  let html = '<optgroup label="Default Sounds">';
  for (const snd of BUILT_IN_SOUNDS) {
    const sel = snd.key === selectedKey ? ' selected' : '';
    html += `<option value="${snd.key}"${sel}>${snd.label}</option>`;
  }
  html += '</optgroup>';

  // Global custom sounds from the sound library
  const audioSounds = soundLibrary.filter(s => s.type === 'audio');
  if (audioSounds.length > 0) {
    html += '<optgroup label="My Sounds">';
    for (const snd of audioSounds) {
      const optVal = 'custom:' + snd.id;
      const sel = optVal === selectedKey ? ' selected' : '';
      html += `<option value="${optVal}"${sel}>${escHtml(snd.name)}</option>`;
    }
    html += '</optgroup>';
  }

  // Action option to open Sound Library
  html += '<optgroup label=""><option value="__manage__">Manage Sounds\u2026</option></optgroup>';

  return html;
}
