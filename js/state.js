/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const STORAGE_STATE = 'joypro_state';
const STORAGE_SESSIONS = 'joypro_sessions';
const STORAGE_SOUNDS = 'joypro_custom_sounds';
const AUTO_ADVANCE_DELAY = 3; // seconds

const DEFAULT_SESSIONS = [
  {
    name: "60m JoyPro Coworking Session",
    segments: [
      { title: "Intention Setting \u{1F9D8}\u200D\u2642\uFE0F", durationMinutes: 3, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u26A1 Energy Reboot \u26A1", durationMinutes: 5, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u{1F64F} Closing", durationMinutes: 2, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: false }
    ]
  },
  {
    name: "90m JoyPro Coworking Session",
    segments: [
      { title: "Intention Setting \u{1F9D8}\u200D\u2642\uFE0F", durationMinutes: 3, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u26A1 Energy Reboot \u26A1", durationMinutes: 5, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u26A1 Energy Reboot \u26A1", durationMinutes: 5, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u{1F64F} Closing", durationMinutes: 2, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: false }
    ]
  },
  {
    name: "120m JoyPro Coworking Session",
    segments: [
      { title: "Intention Setting \u{1F9D8}\u200D\u2642\uFE0F", durationMinutes: 3, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u26A1 Energy Reboot \u26A1", durationMinutes: 5, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u26A1 Energy Reboot \u26A1", durationMinutes: 5, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u26A1 Energy Reboot \u26A1", durationMinutes: 5, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u262E\uFE0F Joyful Productivity \u{1F333}", durationMinutes: 25, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: true },
      { title: "\u{1F64F} Closing", durationMinutes: 2, durationSeconds: 0, soundEnabled: true, soundKey: "default", autoAdvance: false }
    ]
  }
];

/* ═══════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════ */
let state = {
  currentSessionName: DEFAULT_SESSIONS[0].name,
  currentSegmentIndex: 0,
  timerSeconds: 180,
  timerTotal: 180,
  globalMute: false,
  theme: "growingTree",
  panelCollapsed: false
};

let sessions = JSON.parse(JSON.stringify(DEFAULT_SESSIONS));
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
let isNewSessionMode = false;

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function getCurrentSession() {
  return sessions.find(s => s.name === state.currentSessionName) || sessions[0];
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function segmentTotalSeconds(segment) {
  return (segment.durationMinutes || 0) * 60 + (segment.durationSeconds || 0);
}

function sessionTotalMinutes(sess) {
  return sess.segments.reduce((acc, s) => acc + segmentTotalSeconds(s), 0) / 60;
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

function saveSessions() {
  try { localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions)); } catch(e) {}
}

function saveSounds() {
  try { localStorage.setItem(STORAGE_SOUNDS, JSON.stringify(customSounds)); }
  catch(e) { showToast('Sound too large to save locally'); }
}

function loadAll() {
  try {
    const s = localStorage.getItem(STORAGE_STATE);
    if (s) {
      const parsed = JSON.parse(s);
      // Migrate old state property names
      if (parsed.currentSequenceName && !parsed.currentSessionName) {
        parsed.currentSessionName = parsed.currentSequenceName;
        delete parsed.currentSequenceName;
      }
      if ('currentSessionIndex' in parsed && !('currentSegmentIndex' in parsed)) {
        parsed.currentSegmentIndex = parsed.currentSessionIndex;
        delete parsed.currentSessionIndex;
      }
      state = { ...state, ...parsed };
    }
    // Try new key first, fall back to old key for migration
    const sess = localStorage.getItem(STORAGE_SESSIONS) || localStorage.getItem('joypro_sequences');
    if (sess) {
      const parsed = JSON.parse(sess);
      // Migrate old .sessions property to .segments
      sessions = parsed.map(item => {
        if (item.sessions && !item.segments) {
          item.segments = item.sessions;
          delete item.sessions;
        }
        return item;
      });
    }
    const snd = localStorage.getItem(STORAGE_SOUNDS);
    if (snd) customSounds = JSON.parse(snd);
  } catch(e) {}
  if (!sessions.length) sessions = JSON.parse(JSON.stringify(DEFAULT_SESSIONS));
}

function markDirty() {
  clearTimeout(dirtyTimeout);
  dirtyTimeout = setTimeout(saveState, 300);
}

/* ═══════════════════════════════════════════════════
   DIRTY TRACKING (snapshot comparison)
   ═══════════════════════════════════════════════════ */
function takeSnapshot() {
  const sess = getCurrentSession();
  if (sess) {
    savedSnapshot = JSON.stringify({ name: sess.name, segments: sess.segments });
  } else {
    savedSnapshot = null;
  }
}

function hasUnsavedChanges() {
  if (!savedSnapshot) return false;
  const sess = getCurrentSession();
  if (!sess) return false;
  const current = JSON.stringify({ name: sess.name, segments: sess.segments });
  return current !== savedSnapshot;
}
