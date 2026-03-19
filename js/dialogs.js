/* ═══════════════════════════════════════════════════
   TRANSITION & COMPLETE OVERLAYS
   ═══════════════════════════════════════════════════ */
function showTransitionOverlay(nextTitle, nextIndex, autoStart) {
  transitionTitle.textContent = nextTitle;
  transitionOverlay.classList.add('visible');

  if (autoStart) {
    let count = AUTO_ADVANCE_DELAY;
    transitionCountdown.textContent = `Starting in ${count}...`;
    transitionCountdown.style.display = '';

    transitionTimer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(transitionTimer);
        transitionTimer = null;
        advanceToSession(nextIndex);
        startTimer();
      } else {
        transitionCountdown.textContent = `Starting in ${count}...`;
      }
    }, 1000);
  } else {
    transitionCountdown.style.display = 'none';
  }

  transitionStart.onclick = () => {
    clearInterval(transitionTimer);
    transitionTimer = null;
    advanceToSession(nextIndex);
    startTimer();
  };

  transitionSkipBtn.onclick = () => {
    clearInterval(transitionTimer);
    transitionTimer = null;
    const seq = getCurrentSequence();
    if (seq && nextIndex + 1 < seq.sessions.length) {
      advanceToSession(nextIndex + 1);
      startTimer();
    } else {
      advanceToSession(nextIndex);
      startTimer();
    }
  };
}

function showCompleteOverlay() {
  completeOverlay.classList.add('visible');
  document.title = 'Complete! | JoyPro Timer';
}

function hideOverlays() {
  transitionOverlay.classList.remove('visible');
  completeOverlay.classList.remove('visible');
  clearInterval(transitionTimer);
  transitionTimer = null;
}

/* ═══════════════════════════════════════════════════
   CONFIRM DIALOG (2 buttons: Cancel / Confirm)
   ═══════════════════════════════════════════════════ */
let confirmCallback = null;

function showConfirm(msg, onConfirm) {
  confirmMsg.textContent = msg;
  confirmCallback = onConfirm;
  confirmOverlay.classList.add('open');
}

/* ═══════════════════════════════════════════════════
   SAVE PROMPT DIALOG (4 buttons)
   ═══════════════════════════════════════════════════ */
let savePromptCallbacks = null;

function showSavePrompt(onProceed) {
  savePromptMsg.textContent = `Save changes to "${state.currentSequenceName}"?`;
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
function doSaveCurrentSequence() {
  const seq = getCurrentSequence();
  if (!seq) return;

  const idx = sequences.findIndex(s => s.name === state.currentSequenceName);
  if (idx >= 0) {
    sequences[idx] = JSON.parse(JSON.stringify(seq));
  } else {
    sequences.push(JSON.parse(JSON.stringify(seq)));
  }

  saveSequences();
  takeSnapshot();
  showToast('Sequence saved');
}

function doSaveAsSequence(newName) {
  const seq = getCurrentSequence();
  if (!seq) return;

  const copy = JSON.parse(JSON.stringify(seq));
  copy.name = newName;
  sequences.push(copy);

  state.currentSequenceName = newName;

  saveSequences();
  saveState();
  takeSnapshot();
  renderSidebar();
  showToast(`Saved as "${newName}"`);
}

function revertCurrentSequence() {
  if (!savedSnapshot) return;
  const snapshotData = JSON.parse(savedSnapshot);
  const idx = sequences.findIndex(s => s.name === state.currentSequenceName);
  if (idx >= 0) {
    sequences[idx].name = snapshotData.name;
    sequences[idx].sessions = snapshotData.sessions;
    state.currentSequenceName = snapshotData.name;
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
function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
