/* ═══════════════════════════════════════════════════
   DOM REFS
   ═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const sidebarPanel = $('sidebarPanel');
const sidebarSessions = $('sidebarSessions');
const sidebarSeqName = $('sidebarSeqName');
const sidebarExpandBtn = $('sidebarExpandBtn');
const timerDigits = $('timerDigits');
const progressFill = $('progressFill');
const progressBar = progressFill.parentElement;
const currentTitle = $('currentTitle');
const playBtn = $('playBtn');
const skipBtn = $('skipBtn');
const resetBtn = $('resetBtn');
const themeToggle = $('themeToggle');
const muteToggle = $('muteToggle');
const panelEditBtn = $('panelEditBtn');
const panelSaveBtn = $('panelSaveBtn');
const panelSaveAsBtn = $('panelSaveAsBtn');
const panelNewBtn = $('panelNewBtn');
const panelMenuBtn = $('panelMenuBtn');
const panelCollapseBtn = $('panelCollapseBtn');
const timerArea = $('timerArea');
const transitionOverlay = $('transitionOverlay');
const transitionTitle = $('transitionTitle');
const transitionCountdown = $('transitionCountdown');
const transitionStart = $('transitionStart');
const transitionSkipBtn = $('transitionSkipBtn');
const completeOverlay = $('completeOverlay');
const restartBtn = $('restartBtn');
const editorModal = $('editorModal');
const editorModalTitle = $('editorModalTitle');
const editorClose = $('editorClose');
const editorBody = $('editorBody');
const editorSeqName = $('editorSeqName');
const editorSessions = $('editorSessions');
const editorAdd = $('editorAdd');
const editorCancel = $('editorCancel');
const editorSave = $('editorSave');
const savedModal = $('savedModal');
const savedClose = $('savedClose');
const savedBody = $('savedBody');
const savedCloseBtn = $('savedCloseBtn');
const confirmOverlay = $('confirmOverlay');
const confirmMsg = $('confirmMsg');
const confirmYes = $('confirmYes');
const confirmNo = $('confirmNo');
const savePromptOverlay = $('savePromptOverlay');
const savePromptMsg = $('savePromptMsg');
const savePromptSave = $('savePromptSave');
const savePromptSaveAs = $('savePromptSaveAs');
const savePromptDiscard = $('savePromptDiscard');
const savePromptCancel = $('savePromptCancel');
const namePromptOverlay = $('namePromptOverlay');
const namePromptInput = $('namePromptInput');
const namePromptOk = $('namePromptOk');
const namePromptCancel = $('namePromptCancel');
const soundFileInput = $('soundFileInput');
const popoutBtn = $('popoutBtn');

/* ═══════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  themeToggle.innerHTML = state.theme === 'dark' ? '&#9788;' : '&#9789;';
}

/* ═══════════════════════════════════════════════════
   SAVED SEQUENCES MODAL
   ═══════════════════════════════════════════════════ */
function openSavedModal() {
  renderSavedList();
  savedModal.classList.add('open');
}

function closeSavedModal() {
  savedModal.classList.remove('open');
}

function renderSavedList() {
  if (!sequences.length) {
    savedBody.innerHTML = '<div class="empty-state"><div class="empty-state-text">No saved sequences</div></div>';
    return;
  }

  savedBody.innerHTML = sequences.map((seq, i) => {
    const totalMins = Math.round(sequenceTotalMinutes(seq));
    const sessCount = seq.sessions.length;
    const isCurrent = seq.name === state.currentSequenceName;
    return `<div class="saved-seq-item" data-index="${i}">
      <div class="saved-seq-info">
        <div class="saved-seq-name">${escHtml(seq.name)}${isCurrent ? ' <span style="font-size:11px;color:var(--text-muted)">(active)</span>' : ''}</div>
        <div class="saved-seq-meta">${sessCount} session${sessCount !== 1 ? 's' : ''} &middot; ${totalMins} min</div>
      </div>
      <div class="saved-seq-actions">
        <button class="saved-seq-action-btn" data-action="copy" data-index="${i}" title="Duplicate">&#128203;</button>
        <button class="saved-seq-action-btn" data-action="edit" data-index="${i}" title="Edit">&#9998;</button>
        <button class="saved-seq-action-btn delete-btn" data-action="delete" data-index="${i}" title="Delete">&times;</button>
      </div>
    </div>`;
  }).join('');

  // Click row to load
  savedBody.querySelectorAll('.saved-seq-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-action]')) return;
      const idx = parseInt(el.dataset.index);
      closeSavedModal();
      guardUnsavedChanges(() => { loadSequence(idx); });
    });
  });

  // Copy
  savedBody.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const orig = sequences[idx];
      const copy = JSON.parse(JSON.stringify(orig));
      let copyName = orig.name + ' (copy)';
      let counter = 2;
      while (sequences.some(s => s.name === copyName)) {
        copyName = orig.name + ` (copy ${counter})`;
        counter++;
      }
      copy.name = copyName;
      sequences.push(copy);
      saveSequences();
      renderSavedList();
      showToast(`Duplicated "${orig.name}"`);
    });
  });

  // Edit
  savedBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const targetName = sequences[idx].name;
      closeSavedModal();
      if (targetName === state.currentSequenceName) {
        openEditor();
      } else {
        guardUnsavedChanges(() => { loadSequence(idx); openEditor(); });
      }
    });
  });

  // Delete
  savedBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      if (sequences.length <= 1) {
        showToast('Cannot delete last sequence');
        return;
      }
      showConfirm(`Delete "${sequences[idx].name}"?`, () => {
        const wasActive = sequences[idx].name === state.currentSequenceName;
        sequences.splice(idx, 1);
        saveSequences();
        if (wasActive) loadSequence(0);
        renderSavedList();
      });
    });
  });
}

function loadSequence(index) {
  if (index < 0 || index >= sequences.length) return;
  pauseTimer();
  hideOverlays();

  const seq = sequences[index];
  state.currentSequenceName = seq.name;
  state.currentSessionIndex = 0;
  if (seq.sessions.length) {
    state.timerTotal = sessionTotalSeconds(seq.sessions[0]);
    state.timerSeconds = state.timerTotal;
  }

  saveState();
  takeSnapshot();
  renderSidebar();
  renderTimer();
  showToast(`Loaded "${seq.name}"`);
}

/* ═══════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════ */
function setupEventListeners() {
  // Theme
  themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
  });

  // Mute
  muteToggle.addEventListener('click', () => {
    ensureAudioCtx();
    state.globalMute = !state.globalMute;
    updateMuteBtn();
    saveState();
    showToast(state.globalMute ? 'Sound muted' : 'Sound on');
  });

  // Popout
  popoutBtn.addEventListener('click', openPopout);

  // Panel collapse/expand
  panelCollapseBtn.addEventListener('click', () => {
    state.panelCollapsed = !state.panelCollapsed;
    updatePanelCollapse();
    saveState();
  });

  sidebarExpandBtn.addEventListener('click', () => {
    state.panelCollapsed = false;
    updatePanelCollapse();
    saveState();
  });

  // Timer controls
  playBtn.addEventListener('click', () => {
    if (running) pauseTimer();
    else startTimer();
  });

  skipBtn.addEventListener('click', () => {
    const seq = getCurrentSequence();
    if (!seq) return;
    const next = state.currentSessionIndex + 1;
    if (next >= seq.sessions.length) {
      showToast('Already on last session');
      return;
    }
    if (running || state.timerSeconds < state.timerTotal) {
      showConfirm('Skip to next session?', () => {
        advanceToSession(next);
        startTimer();
      });
    } else {
      advanceToSession(next);
      startTimer();
    }
  });

  resetBtn.addEventListener('click', () => {
    if (running || state.currentSessionIndex > 0 || state.timerSeconds < state.timerTotal) {
      showConfirm('Reset entire sequence?', () => { resetSequence(); });
    } else {
      resetSequence();
    }
  });

  restartBtn.addEventListener('click', () => { resetSequence(); });

  // Confirm dialog
  confirmYes.addEventListener('click', () => {
    confirmOverlay.classList.remove('open');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  confirmNo.addEventListener('click', () => {
    confirmOverlay.classList.remove('open');
    confirmCallback = null;
  });

  // Save prompt dialog
  savePromptSave.addEventListener('click', () => {
    savePromptOverlay.classList.remove('open');
    doSaveCurrentSequence();
    if (savePromptCallbacks) savePromptCallbacks();
    savePromptCallbacks = null;
  });

  savePromptSaveAs.addEventListener('click', () => {
    savePromptOverlay.classList.remove('open');
    const cb = savePromptCallbacks;
    savePromptCallbacks = null;
    showNamePrompt(state.currentSequenceName + ' (copy)', (newName) => {
      doSaveAsSequence(newName);
      if (cb) cb();
    });
  });

  savePromptDiscard.addEventListener('click', () => {
    savePromptOverlay.classList.remove('open');
    revertCurrentSequence();
    if (savePromptCallbacks) savePromptCallbacks();
    savePromptCallbacks = null;
  });

  savePromptCancel.addEventListener('click', () => {
    savePromptOverlay.classList.remove('open');
    savePromptCallbacks = null;
  });

  // Name prompt
  namePromptOk.addEventListener('click', () => {
    const name = namePromptInput.value.trim();
    if (!name) { showToast('Please enter a name'); return; }
    if (sequences.some(s => s.name === name)) {
      showToast('A sequence with that name already exists');
      return;
    }
    namePromptOverlay.classList.remove('open');
    if (namePromptCallback) namePromptCallback(name);
    namePromptCallback = null;
  });

  namePromptCancel.addEventListener('click', () => {
    namePromptOverlay.classList.remove('open');
    namePromptCallback = null;
  });

  namePromptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') namePromptOk.click();
    if (e.key === 'Escape') namePromptCancel.click();
  });

  // Panel toolbar
  panelEditBtn.addEventListener('click', openEditor);
  panelSaveBtn.addEventListener('click', () => { doSaveCurrentSequence(); });
  panelSaveAsBtn.addEventListener('click', () => {
    showNamePrompt(state.currentSequenceName + ' (copy)', (newName) => { doSaveAsSequence(newName); });
  });
  panelNewBtn.addEventListener('click', () => { guardUnsavedChanges(() => { openEditorNew(); }); });
  panelMenuBtn.addEventListener('click', () => { openSavedModal(); });

  // Editor
  editorAdd.addEventListener('click', () => {
    editorData.push({
      title: "New Session",
      durationMinutes: 25,
      durationSeconds: 0,
      soundEnabled: true,
      soundKey: "default",
      autoAdvance: true
    });
    renderEditorSessions();
    editorSessions.parentElement.scrollTop = editorSessions.parentElement.scrollHeight;
  });

  editorSave.addEventListener('click', () => {
    const name = editorSeqName.value.trim() || "Untitled";
    for (const s of editorData) {
      const total = (s.durationMinutes || 0) * 60 + (s.durationSeconds || 0);
      if (total < 1) { showToast('Each session needs at least 1 second'); return; }
    }

    if (isNewSequenceMode) {
      if (sequences.some(s => s.name === name)) {
        showToast('A sequence with that name already exists');
        return;
      }
      const newSeq = { name: name, sessions: editorData.map(s => ({ ...s })) };
      sequences.push(newSeq);
      state.currentSequenceName = name;
      state.currentSessionIndex = 0;
      if (newSeq.sessions.length) {
        state.timerTotal = sessionTotalSeconds(newSeq.sessions[0]);
        state.timerSeconds = state.timerTotal;
      }
      running = false;
      clearInterval(timerInterval);
      saveSequences(); saveState(); takeSnapshot();
      renderSidebar(); renderTimer(); hideOverlays(); closeEditor();
      showToast('New sequence created');
    } else {
      const seq = getCurrentSequence();
      const oldName = seq.name;
      seq.name = name;
      seq.sessions = editorData.map(s => ({ ...s }));
      state.currentSequenceName = name;
      const idx = sequences.findIndex(s => s === seq);
      if (idx >= 0) sequences[idx] = seq;
      state.currentSessionIndex = 0;
      if (seq.sessions.length) {
        state.timerTotal = sessionTotalSeconds(seq.sessions[0]);
        state.timerSeconds = state.timerTotal;
      }
      running = false;
      clearInterval(timerInterval);
      saveSequences(); saveState(); takeSnapshot();
      renderSidebar(); renderTimer(); hideOverlays(); closeEditor();
      showToast('Sequence saved');
    }
  });

  editorCancel.addEventListener('click', closeEditor);
  editorClose.addEventListener('click', closeEditor);

  // Custom sound file
  soundFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) {
      showToast('Sound file too large (max 500KB)');
      soundFileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const key = currentEditSoundIndex + '_' + state.currentSequenceName;
      customSounds[key] = reader.result;
      saveSounds();
      showToast('Custom sound set');
    };
    reader.readAsDataURL(file);
    soundFileInput.value = '';
  });

  // Saved modal close
  savedClose.addEventListener('click', closeSavedModal);
  savedCloseBtn.addEventListener('click', closeSavedModal);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const anyModalOpen = editorModal.classList.contains('open') ||
      savedModal.classList.contains('open') ||
      confirmOverlay.classList.contains('open') ||
      savePromptOverlay.classList.contains('open') ||
      namePromptOverlay.classList.contains('open');

    if (e.code === 'Space' && !anyModalOpen) {
      e.preventDefault();
      if (running) pauseTimer(); else startTimer();
    } else if (e.code === 'KeyN' && !anyModalOpen) {
      skipBtn.click();
    } else if (e.code === 'KeyM') {
      muteToggle.click();
    } else if (e.code === 'KeyE' && !anyModalOpen) {
      openEditor();
    } else if (e.code === 'KeyR' && !anyModalOpen && !e.ctrlKey && !e.metaKey) {
      resetBtn.click();
    } else if (e.code === 'Escape') {
      if (namePromptOverlay.classList.contains('open')) { namePromptOverlay.classList.remove('open'); namePromptCallback = null; }
      else if (savePromptOverlay.classList.contains('open')) { savePromptOverlay.classList.remove('open'); savePromptCallbacks = null; }
      else if (editorModal.classList.contains('open')) closeEditor();
      else if (savedModal.classList.contains('open')) closeSavedModal();
      else if (confirmOverlay.classList.contains('open')) { confirmOverlay.classList.remove('open'); confirmCallback = null; }
    }
  });

  // Modal close on backdrop
  editorModal.addEventListener('click', e => { if (e.target === editorModal) closeEditor(); });
  savedModal.addEventListener('click', e => { if (e.target === savedModal) closeSavedModal(); });
  confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) { confirmOverlay.classList.remove('open'); confirmCallback = null; }});
  savePromptOverlay.addEventListener('click', e => { if (e.target === savePromptOverlay) { savePromptOverlay.classList.remove('open'); savePromptCallbacks = null; }});
  namePromptOverlay.addEventListener('click', e => { if (e.target === namePromptOverlay) { namePromptOverlay.classList.remove('open'); namePromptCallback = null; }});
}

/* ═══════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════ */
function init() {
  loadAll();
  applyTheme();
  updateMuteBtn();
  updatePanelCollapse();

  const seq = getCurrentSequence();
  if (!seq) {
    state.currentSequenceName = sequences[0].name;
  }
  const currentSeq = getCurrentSequence();
  if (state.currentSessionIndex >= currentSeq.sessions.length) {
    state.currentSessionIndex = 0;
  }

  const currentSession = currentSeq.sessions[state.currentSessionIndex];
  if (currentSession) {
    const total = sessionTotalSeconds(currentSession);
    if (state.timerTotal !== total) {
      state.timerTotal = total;
      state.timerSeconds = total;
    }
    if (state.timerSeconds > state.timerTotal) state.timerSeconds = state.timerTotal;
    if (state.timerSeconds < 0) state.timerSeconds = 0;
  }

  takeSnapshot();
  renderSidebar();
  renderTimer();
  saveState();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && running) tick();
  });

  window.addEventListener('resize', () => sizeTimerContent());
}

setupEventListeners();
init();
