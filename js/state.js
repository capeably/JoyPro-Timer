/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const STORAGE_STATE = 'joypro_state';
const STORAGE_SEQUENCES = 'joypro_sequences';
const STORAGE_SOUNDS = 'joypro_custom_sounds';
const AUTO_ADVANCE_DELAY = 3; // seconds

const DEFAULT_SEQUENCE = {
  name: "JoyPro Coworking Session",
  sessions: [
    { title: "Intention Setting \u{1F9D8}\u200D\u2642\uFE0F", durationMinutes: 3, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
    { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
    { title: "\u26A1 Energy Reboot \u26A1", durationMinutes: 5, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
    { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
    { title: "\u{1F64F} Closing", durationMinutes: 2, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: false }
  ]
};

/* ═══════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════ */
let state = {
  currentSequenceName: DEFAULT_SEQUENCE.name,
  currentSessionIndex: 0,
  timerSeconds: 180,
  timerTotal: 180,
  globalMute: false,
  theme: "light",
  panelCollapsed: false
};

let sequences = [JSON.parse(JSON.stringify(DEFAULT_SEQUENCE))];
let customSounds = {};

let running = false;
let timerInterval = null;
let timerStartedAt = null;
let timerSecondsAtStart = null;
let transitionTimer = null;
let audioCtx = null;
let dirtyTimeout = null;
let currentEditSoundIndex = -1;

// Dirty tracking
let savedSnapshot = null;
let isNewSequenceMode = false;

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function getCurrentSequence() {
  return sequences.find(s => s.name === state.currentSequenceName) || sequences[0];
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function sessionTotalSeconds(session) {
  return (session.durationMinutes || 0) * 60 + (session.durationSeconds || 0);
}

function sequenceTotalMinutes(seq) {
  return seq.sessions.reduce((acc, s) => acc + sessionTotalSeconds(s), 0) / 60;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ═══════════════════════════════════════════════════
   PERSISTENCE
   ═══════════════════════════════════════════════════ */
function saveState() {
  try { localStorage.setItem(STORAGE_STATE, JSON.stringify(state)); } catch(e) {}
}

function saveSequences() {
  try { localStorage.setItem(STORAGE_SEQUENCES, JSON.stringify(sequences)); } catch(e) {}
}

function saveSounds() {
  try { localStorage.setItem(STORAGE_SOUNDS, JSON.stringify(customSounds)); }
  catch(e) { showToast('Sound too large to save locally'); }
}

function loadAll() {
  try {
    const s = localStorage.getItem(STORAGE_STATE);
    if (s) state = { ...state, ...JSON.parse(s) };
    const sq = localStorage.getItem(STORAGE_SEQUENCES);
    if (sq) sequences = JSON.parse(sq);
    const snd = localStorage.getItem(STORAGE_SOUNDS);
    if (snd) customSounds = JSON.parse(snd);
  } catch(e) {}
  if (!sequences.length) sequences = [JSON.parse(JSON.stringify(DEFAULT_SEQUENCE))];
}

function markDirty() {
  clearTimeout(dirtyTimeout);
  dirtyTimeout = setTimeout(saveState, 300);
}

/* ═══════════════════════════════════════════════════
   DIRTY TRACKING (snapshot comparison)
   ═══════════════════════════════════════════════════ */
function takeSnapshot() {
  const seq = getCurrentSequence();
  if (seq) {
    savedSnapshot = JSON.stringify({ name: seq.name, sessions: seq.sessions });
  } else {
    savedSnapshot = null;
  }
}

function hasUnsavedChanges() {
  if (!savedSnapshot) return false;
  const seq = getCurrentSequence();
  if (!seq) return false;
  const current = JSON.stringify({ name: seq.name, sessions: seq.sessions });
  return current !== savedSnapshot;
}
