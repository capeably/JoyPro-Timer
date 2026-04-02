/* ═══════════════════════════════════════════════════
   COMPLETE OVERLAY
   ═══════════════════════════════════════════════════ */
const COMPLETE_MESSAGES = [
  'Great session. Take a moment to breathe.',
  'Well done. You showed up and stayed focused.',
  'Another session in the books. Nice work.',
  'You did it. Time for a well-earned break.',
  'Focus achieved. Give yourself a moment.',
  'Session complete. Celebrate the small wins.'
];

function showCompleteOverlay() {
  completeOverlay.classList.add('visible');
  document.title = 'Complete! | JoyPro Timer';

  // Populate stats
  const sess = getCurrentSession();
  const statsEl = document.getElementById('completeStats');
  const subEl = document.getElementById('completeSub');
  if (sess && statsEl) {
    const totalMins = Math.round(sessionTotalMinutes(sess));
    const segCount = sess.segments.length;
    statsEl.textContent = `${totalMins} minutes across ${segCount} segment${segCount !== 1 ? 's' : ''}`;
  }

  // Random encouraging message
  if (subEl) {
    subEl.textContent = COMPLETE_MESSAGES[Math.floor(Math.random() * COMPLETE_MESSAGES.length)];
  }
}

function hideOverlays() {
  completeOverlay.classList.remove('visible');
}

/* ═══════════════════════════════════════════════════
   CONFIRM DIALOG (2 buttons: Cancel / Confirm)
   ═══════════════════════════════════════════════════ */
let confirmCallback = null;

function showConfirm(msg, onConfirm, anchorEl) {
  confirmMsg.textContent = msg;
  confirmCallback = onConfirm;

  const box = confirmOverlay.querySelector('.confirm-box');
  if (anchorEl) {
    // Position near the anchor element
    confirmOverlay.classList.add('anchored');
    const rect = anchorEl.getBoundingClientRect();
    let left = rect.right - box.offsetWidth;
    let top = rect.bottom + 6;
    if (left < 8) left = 8;
    if (top + 160 > window.innerHeight) top = rect.top - 6 - 160;
    box.style.left = left + 'px';
    box.style.top = top + 'px';
  } else {
    confirmOverlay.classList.remove('anchored');
    box.style.left = '';
    box.style.top = '';
  }

  confirmOverlay.classList.add('open');
}

/* ═══════════════════════════════════════════════════
   SAVE PROMPT DIALOG (4 buttons)
   ═══════════════════════════════════════════════════ */
let savePromptCallbacks = null;

function showSavePrompt(onProceed) {
  savePromptMsg.textContent = `Save changes to "${state.currentSessionName}"?`;
  savePromptCallbacks = onProceed;
  savePromptOverlay.classList.add('open');
}

/* ═══════════════════════════════════════════════════
   NAME PROMPT (for Save As)
   ═══════════════════════════════════════════════════ */
let namePromptCallback = null;

function showNamePrompt(defaultName, onOk) {
  namePromptInput.value = defaultName;
  namePromptCallback = onOk;
  namePromptOverlay.classList.add('open');
  setTimeout(() => { namePromptInput.focus(); namePromptInput.select(); }, 100);
}

/* ═══════════════════════════════════════════════════
   SAVE / SAVE-AS / REVERT LOGIC
   ═══════════════════════════════════════════════════ */
function doSaveCurrentSession() {
  const sess = getCurrentSession();
  if (!sess) return;

  const idx = sessions.findIndex(s => s.name === state.currentSessionName);
  if (idx >= 0) {
    sessions[idx] = JSON.parse(JSON.stringify(sess));
  } else {
    sessions.push(JSON.parse(JSON.stringify(sess)));
  }

  saveSessions();
  takeSnapshot();
  showToast('Session saved', 'success');
}

function doSaveAsSession(newName) {
  const sess = getCurrentSession();
  if (!sess) return;

  const copy = JSON.parse(JSON.stringify(sess));
  copy.name = newName;
  sessions.push(copy);

  state.currentSessionName = newName;

  saveSessions();
  saveState();
  takeSnapshot();
  renderSessionPanel();
  showToast(`Saved as "${newName}"`, 'success');
}

function revertCurrentSession() {
  if (!savedSnapshot) return;
  const snapshotData = JSON.parse(savedSnapshot);
  const idx = sessions.findIndex(s => s.name === state.currentSessionName);
  if (idx >= 0) {
    sessions[idx].name = snapshotData.name;
    sessions[idx].segments = snapshotData.segments;
    state.currentSessionName = snapshotData.name;
  }
}

function guardUnsavedChanges(proceed) {
  if (hasUnsavedChanges()) {
    showSavePrompt(proceed);
  } else {
    proceed();
  }
}

/* ═══════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════ */
function showToast(msg, type) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' toast-' + type : '');
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
