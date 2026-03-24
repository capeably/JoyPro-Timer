/* ═══════════════════════════════════════════════════
   DOM REFS
   ═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const sidebarPanel = $('sidebarPanel');
const sidebarSegments = $('sidebarSegments');
const sidebarSessionName = $('sidebarSessionName');
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
const editorSessionName = $('editorSessionName');
const editorSegments = $('editorSegments');
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
const savedImportBtn = $('savedImportBtn');
const savedExportBtn = $('savedExportBtn');
const importFileInput = $('importFileInput');
const sidebarPanelInner = document.querySelector('.sidebar-panel-inner');
const panelResizeHandle = $('panelResizeHandle');

/* ═══════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════ */
function applyTheme() {
  applyFullTheme(state.theme);
}

/* ═══════════════════════════════════════════════════
   SAVED SESSIONS MODAL
   ═══════════════════════════════════════════════════ */
function openSavedModal() {
  renderSavedList();
  savedModal.classList.add('open');
}

function closeSavedModal() {
  savedModal.classList.remove('open');
}

function renderSavedList() {
  if (!sessions.length) {
    savedBody.innerHTML = '<div class="empty-state"><div class="empty-state-text">No saved sessions</div></div>';
    return;
  }

  savedBody.innerHTML = sessions.map((sess, i) => {
    const totalMins = Math.round(sessionTotalMinutes(sess));
    const segCount = sess.segments.length;
    const isCurrent = sess.name === state.currentSessionName;
    return `<div class="saved-sess-item" data-index="${i}">
      <div class="saved-sess-info">
        <div class="saved-sess-name">${escHtml(sess.name)}${isCurrent ? ' <span style="font-size:11px;color:var(--text-muted)">(active)</span>' : ''}</div>
        <div class="saved-sess-meta">${segCount} segment${segCount !== 1 ? 's' : ''} &middot; ${totalMins} min</div>
      </div>
      <div class="saved-sess-actions">
        <button class="saved-sess-action-btn" data-action="copy" data-index="${i}" title="Duplicate">&#128203;</button>
        <button class="saved-sess-action-btn" data-action="edit" data-index="${i}" title="Edit">&#9998;</button>
        <button class="saved-sess-action-btn delete-btn" data-action="delete" data-index="${i}" title="Delete">&times;</button>
      </div>
    </div>`;
  }).join('');

  // Click row to load
  savedBody.querySelectorAll('.saved-sess-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-action]')) return;
      const idx = parseInt(el.dataset.index);
      closeSavedModal();
      guardUnsavedChanges(() => { loadSession(idx); });
    });
  });

  // Copy
  savedBody.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const orig = sessions[idx];
      const copy = JSON.parse(JSON.stringify(orig));
      let copyName = orig.name + ' (copy)';
      let counter = 2;
      while (sessions.some(s => s.name === copyName)) {
        copyName = orig.name + ` (copy ${counter})`;
        counter++;
      }
      copy.name = copyName;
      sessions.push(copy);
      saveSessions();
      renderSavedList();
      showToast(`Duplicated "${orig.name}"`);
    });
  });

  // Edit
  savedBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const targetName = sessions[idx].name;
      closeSavedModal();
      if (targetName === state.currentSessionName) {
        openEditor();
      } else {
        guardUnsavedChanges(() => { loadSession(idx); openEditor(); });
      }
    });
  });

  // Delete
  savedBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      if (sessions.length <= 1) {
        showToast('Cannot delete last session');
        return;
      }
      showConfirm(`Delete "${sessions[idx].name}"?`, () => {
        const wasActive = sessions[idx].name === state.currentSessionName;
        sessions.splice(idx, 1);
        saveSessions();
        if (wasActive) loadSession(0);
        renderSavedList();
      });
    });
  });
}

function loadSession(index) {
  if (index < 0 || index >= sessions.length) return;
  pauseTimer();
  hideOverlays();

  const sess = sessions[index];
  state.currentSessionName = sess.name;
  state.currentSegmentIndex = 0;
  if (sess.segments.length) {
    state.timerTotal = segmentTotalSeconds(sess.segments[0]);
    state.timerSeconds = state.timerTotal;
  }

  saveState();
  takeSnapshot();
  renderSidebar();
  renderTimer();
  showToast(`Loaded "${sess.name}"`);
}

/* ═══════════════════════════════════════════════════
   IMPORT / EXPORT SESSIONS
   ═══════════════════════════════════════════════════ */
function exportSessions() {
  const data = JSON.stringify(sessions, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'joypro-sessions.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Sessions exported');
}

function importSessions(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) {
        showToast('Invalid file: expected an array of sessions');
        return;
      }
      let added = 0;
      let skipped = 0;
      for (const item of data) {
        if (!item.name || !Array.isArray(item.segments)) {
          skipped++;
          continue;
        }
        if (sessions.some(s => s.name === item.name)) {
          skipped++;
          continue;
        }
        sessions.push(JSON.parse(JSON.stringify(item)));
        added++;
      }
      if (added > 0) {
        saveSessions();
        renderSavedList();
      }
      let msg = `Imported ${added} session${added !== 1 ? 's' : ''}`;
      if (skipped > 0) msg += ` (${skipped} skipped)`;
      showToast(msg);
    } catch (e) {
      showToast('Failed to parse file');
    }
  };
  reader.readAsText(file);
}

/* ═══════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════ */
function setupEventListeners() {
  // Theme picker
  themeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleThemePicker();
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

  // Panel collapse/expand (click only)
  panelCollapseBtn.addEventListener('click', () => {
    state.panelCollapsed = !state.panelCollapsed;
    updatePanelCollapse();
    saveState();
  });

  // Panel drag-to-resize (on the resize handle bar)
  function panelResizeStart(startY) {
    const startHeight = sidebarPanelInner.offsetHeight;
    sidebarPanelInner.style.transition = 'none';
    const maxH = Math.min(400, window.innerHeight * 0.4);
    return { startHeight, maxH, startY };
  }
  function panelResizeMove(ctx, currentY) {
    const deltaY = ctx.startY - currentY;
    const newHeight = Math.min(ctx.maxH, Math.max(60, ctx.startHeight + deltaY));
    sidebarPanelInner.style.maxHeight = newHeight + 'px';
  }
  function panelResizeEnd() {
    sidebarPanelInner.style.transition = '';
    state.panelHeight = parseInt(sidebarPanelInner.style.maxHeight);
    saveState();
  }

  panelResizeHandle.addEventListener('mousedown', e => {
    e.preventDefault();
    const ctx = panelResizeStart(e.clientY);
    const onMouseMove = ev => panelResizeMove(ctx, ev.clientY);
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      panelResizeEnd();
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  panelResizeHandle.addEventListener('touchstart', e => {
    e.preventDefault();
    const ctx = panelResizeStart(e.touches[0].clientY);
    const onTouchMove = ev => { ev.preventDefault(); panelResizeMove(ctx, ev.touches[0].clientY); };
    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      panelResizeEnd();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, { passive: false });

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
    const sess = getCurrentSession();
    if (!sess) return;
    const next = state.currentSegmentIndex + 1;
    if (next >= sess.segments.length) {
      showToast('Already on last segment');
      return;
    }
    if (running || state.timerSeconds < state.timerTotal) {
      showConfirm('Skip to next segment?', () => {
        advanceToSegment(next);
        startTimer();
      });
    } else {
      advanceToSegment(next);
      startTimer();
    }
  });

  resetBtn.addEventListener('click', () => {
    if (running || state.currentSegmentIndex > 0 || state.timerSeconds < state.timerTotal) {
      showConfirm('Reset entire session?', () => { resetSession(); });
    } else {
      resetSession();
    }
  });

  restartBtn.addEventListener('click', () => { resetSession(); });

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
    doSaveCurrentSession();
    if (savePromptCallbacks) savePromptCallbacks();
    savePromptCallbacks = null;
  });

  savePromptSaveAs.addEventListener('click', () => {
    savePromptOverlay.classList.remove('open');
    const cb = savePromptCallbacks;
    savePromptCallbacks = null;
    showNamePrompt(state.currentSessionName + ' (copy)', (newName) => {
      doSaveAsSession(newName);
      if (cb) cb();
    });
  });

  savePromptDiscard.addEventListener('click', () => {
    savePromptOverlay.classList.remove('open');
    revertCurrentSession();
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
    if (sessions.some(s => s.name === name)) {
      showToast('A session with that name already exists');
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
  panelSaveBtn.addEventListener('click', () => { doSaveCurrentSession(); });
  panelSaveAsBtn.addEventListener('click', () => {
    showNamePrompt(state.currentSessionName + ' (copy)', (newName) => { doSaveAsSession(newName); });
  });
  panelNewBtn.addEventListener('click', () => { guardUnsavedChanges(() => { openEditorNew(); }); });
  panelMenuBtn.addEventListener('click', () => { openSavedModal(); });

  // Editor
  editorAdd.addEventListener('click', () => {
    editorData.push({
      title: "New Segment",
      durationMinutes: 25,
      durationSeconds: 0,
      soundEnabled: true,
      soundKey: "default",
      autoAdvance: true,
      theme: "default"
    });
    renderEditorSegments();
    editorSegments.parentElement.scrollTop = editorSegments.parentElement.scrollHeight;
  });

  editorSave.addEventListener('click', () => {
    const name = editorSessionName.value.trim() || "Untitled";
    for (const s of editorData) {
      const total = (s.durationMinutes || 0) * 60 + (s.durationSeconds || 0);
      if (total < 1) { showToast('Each segment needs at least 1 second'); return; }
    }

    if (isNewSessionMode) {
      if (sessions.some(s => s.name === name)) {
        showToast('A session with that name already exists');
        return;
      }
      const newSess = { name: name, segments: editorData.map(s => ({ ...s })) };
      sessions.push(newSess);
      state.currentSessionName = name;
      state.currentSegmentIndex = 0;
      if (newSess.segments.length) {
        state.timerTotal = segmentTotalSeconds(newSess.segments[0]);
        state.timerSeconds = state.timerTotal;
      }
      running = false;
      clearInterval(timerInterval);
      saveSessions(); saveState(); takeSnapshot();
      applySegmentTheme(newSess.segments[0]);
      renderSidebar(); renderTimer(); hideOverlays(); closeEditor();
      showToast('New session created');
    } else {
      const sess = getCurrentSession();
      const oldName = sess.name;
      sess.name = name;
      sess.segments = editorData.map(s => ({ ...s }));
      state.currentSessionName = name;
      const idx = sessions.findIndex(s => s === sess);
      if (idx >= 0) sessions[idx] = sess;
      state.currentSegmentIndex = 0;
      if (sess.segments.length) {
        state.timerTotal = segmentTotalSeconds(sess.segments[0]);
        state.timerSeconds = state.timerTotal;
      }
      running = false;
      clearInterval(timerInterval);
      saveSessions(); saveState(); takeSnapshot();
      applySegmentTheme(sess.segments[0]);
      renderSidebar(); renderTimer(); hideOverlays(); closeEditor();
      showToast('Session saved');
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
      const key = currentEditSoundIndex + '_' + state.currentSessionName;
      customSounds[key] = reader.result;
      saveSounds();
      showToast('Custom sound set');
    };
    reader.readAsDataURL(file);
    soundFileInput.value = '';
  });

  // Import / Export
  savedExportBtn.addEventListener('click', () => { exportSessions(); });
  savedImportBtn.addEventListener('click', () => { importFileInput.click(); });
  importFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importSessions(file);
    importFileInput.value = '';
  });

  // Saved modal close
  savedClose.addEventListener('click', closeSavedModal);
  savedCloseBtn.addEventListener('click', closeSavedModal);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    // Ignore when any modifier key is held (except for Escape)
    const hasModifier = e.ctrlKey || e.altKey || e.metaKey || e.shiftKey;
    const anyModalOpen = editorModal.classList.contains('open') ||
      savedModal.classList.contains('open') ||
      confirmOverlay.classList.contains('open') ||
      savePromptOverlay.classList.contains('open') ||
      namePromptOverlay.classList.contains('open');

    if (e.code === 'Space' && !anyModalOpen && !hasModifier) {
      e.preventDefault();
      if (running) pauseTimer(); else startTimer();
    } else if (e.code === 'KeyN' && !anyModalOpen && !hasModifier) {
      skipBtn.click();
    } else if (e.code === 'KeyM' && !hasModifier) {
      muteToggle.click();
    } else if (e.code === 'KeyE' && !anyModalOpen && !hasModifier) {
      openEditor();
    } else if (e.code === 'KeyR' && !anyModalOpen && !hasModifier) {
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

  const sess = getCurrentSession();
  if (!sess) {
    state.currentSessionName = sessions[0].name;
  }
  const currentSess = getCurrentSession();
  if (state.currentSegmentIndex >= currentSess.segments.length) {
    state.currentSegmentIndex = 0;
  }

  const currentSegment = currentSess.segments[state.currentSegmentIndex];
  if (currentSegment) {
    const total = segmentTotalSeconds(currentSegment);
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
