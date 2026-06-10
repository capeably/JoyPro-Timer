/* ═══════════════════════════════════════════════════
   DOM REFS
   ═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const sessionPanel = $('sessionPanel');
const sessionSegments = $('sessionSegments');
const sessionExpandBtn = $('sessionExpandBtn');
const timerDigits = $('timerDigits');
const progressFill = $('progressFill');
const progressBar = progressFill.parentElement;
const currentTitle = $('currentTitle');
const playBtn = $('playBtn');
const skipBtn = $('skipBtn');
const resetBtn = $('resetBtn');
const themeToggle = $('themeToggle');
const muteToggle = $('muteToggle');
const sessionActionsBtn = $('sessionActionsBtn');
const sessionActionsMenu = $('sessionActionsMenu');
const menuSaveBtn = $('menuSaveBtn');
const menuSaveAsBtn = $('menuSaveAsBtn');
const menuAdvEditBtn = $('menuAdvEditBtn');
const panelNewBtn = $('panelNewBtn');
const panelMenuBtn = $('panelMenuBtn');
const panelCollapseBtn = $('panelCollapseBtn');
const timerArea = $('timerArea');
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
const helpBtn = $('helpBtn');
const helpModal = $('helpModal');
const helpClose = $('helpClose');
const helpCloseBtn = $('helpCloseBtn');
const segEditPopover = $('segEditPopover');
const segEditBackdrop = $('segEditBackdrop');
const segEditClose = $('segEditClose');
const segEditCancel = $('segEditCancel');
const segEditSave = $('segEditSave');
const segEditManageSounds = $('segEditManageSounds');
const segEditSoundKey = $('segEditSoundKey');
const segEditPreview = $('segEditPreview');
const segEditDeleteCustom = $('segEditDeleteCustom');
const segEditSoundPicker = $('segEditSoundPicker');
const soundLibraryOverlay = $('soundLibraryOverlay');
const soundLibClose = $('soundLibClose');
const soundLibUploadBtn = $('soundLibUploadBtn');
const soundLibraryFileInput = $('soundLibraryFileInput');

/* ═══════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════ */
function applyTheme() {
  applyFullTheme(state.theme);
}

/* ─── Refresh any open sound dropdowns after library changes ─── */
function refreshSoundDropdowns() {
  // Segment edit popover
  if (segEditPopover.classList.contains('open')) {
    const prev = segEditSoundKey.value;
    segEditSoundKey.innerHTML = buildSoundOptionsHTML(prev);
    // If previous selection was deleted, fall back to default
    if (!segEditSoundKey.querySelector(`option[value="${prev}"]`)) {
      segEditSoundKey.value = 'default';
    }
    segEditDeleteCustom.classList.toggle('hidden', !segEditSoundKey.value.startsWith('custom:'));
  }
  // Editor modal
  if (editorModal.classList.contains('open')) {
    renderEditorSegments();
  }
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
        <div class="saved-sess-name">${escHtml(sess.name)}${isCurrent ? ' <span class="saved-sess-active-tag">(active)</span>' : ''}</div>
        <div class="saved-sess-meta">${segCount} segment${segCount !== 1 ? 's' : ''} &middot; ${totalMins} min</div>
      </div>
      <div class="saved-sess-actions">
        <button class="saved-sess-action-btn" data-action="copy" data-index="${i}" title="Duplicate" aria-label="Duplicate &quot;${escHtml(sess.name)}&quot;">${ICON_COPY}</button>
        <button class="saved-sess-action-btn" data-action="edit" data-index="${i}" title="Edit" aria-label="Edit &quot;${escHtml(sess.name)}&quot;">${ICON_PENCIL}</button>
        <button class="saved-sess-action-btn delete-btn" data-action="delete" data-index="${i}" title="Delete" aria-label="Delete &quot;${escHtml(sess.name)}&quot;">&times;</button>
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
  renderSessionPanel();
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

/** Coerce an imported segment to a known-safe shape; null if unusable. */
function sanitizeImportedSegment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const mins = Math.max(0, Math.min(999, parseInt(raw.durationMinutes, 10) || 0));
  const secs = Math.max(0, Math.min(59, parseInt(raw.durationSeconds, 10) || 0));
  if (mins * 60 + secs < 1) return null;
  return {
    title: (typeof raw.title === 'string' && raw.title.trim()) ? raw.title.trim().slice(0, 200) : 'Segment',
    durationMinutes: mins,
    durationSeconds: secs,
    soundEnabled: !!raw.soundEnabled,
    soundKey: (typeof raw.soundKey === 'string' && /^[\w:-]{1,64}$/.test(raw.soundKey)) ? raw.soundKey : 'default',
    autoAdvance: !!raw.autoAdvance,
    theme: (typeof raw.theme === 'string' && (raw.theme === 'default' || THEMES[raw.theme])) ? raw.theme : 'default'
  };
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
        if (!item || typeof item.name !== 'string' || !item.name.trim() || !Array.isArray(item.segments)) {
          skipped++;
          continue;
        }
        const name = item.name.trim().slice(0, 100);
        const segments = item.segments.map(sanitizeImportedSegment).filter(Boolean);
        if (!segments.length || sessions.some(s => s.name === name)) {
          skipped++;
          continue;
        }
        sessions.push({ name, segments });
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
   SHARED HELPERS
   ═══════════════════════════════════════════════════ */
/** Reset timer to segment 0 of the given session, persist, and refresh UI. */
function activateSession(sess) {
  state.currentSessionName = sess.name;
  state.currentSegmentIndex = 0;
  if (sess.segments.length) {
    state.timerTotal = segmentTotalSeconds(sess.segments[0]);
    state.timerSeconds = state.timerTotal;
  }
  running = false;
  clearInterval(timerInterval);
  saveSessions(); saveState(); takeSnapshot();
  if (sess.segments[0]) applySegmentTheme(sess.segments[0]);
  renderSessionPanel(); renderTimer(); hideOverlays(); closeEditor();
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

  // Help
  helpBtn.addEventListener('click', openHelpModal);
  helpClose.addEventListener('click', closeHelpModal);
  helpCloseBtn.addEventListener('click', closeHelpModal);
  helpModal.addEventListener('click', e => { if (e.target === helpModal) closeHelpModal(); });

  // Panel collapse/expand (click only)
  panelCollapseBtn.addEventListener('click', () => {
    state.panelCollapsed = !state.panelCollapsed;
    updatePanelCollapse();
    saveState();
  });

  sessionExpandBtn.addEventListener('click', () => {
    state.panelCollapsed = false;
    updatePanelCollapse();
    saveState();
  });

  // Timer display — double-click to edit time; title — double-click to edit title
  timerDigits.addEventListener('mousedown', (e) => {
    if (e.detail >= 2) e.preventDefault();
  });
  timerDigits.addEventListener('dblclick', () => enterMainTimerEdit());
  currentTitle.addEventListener('mousedown', (e) => {
    if (e.detail >= 2) e.preventDefault(); // prevent dblclick text selection
  });
  currentTitle.addEventListener('dblclick', (e) => {
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    enterMainTitleEdit();
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
    confirmOverlay.classList.remove('open', 'anchored');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  confirmNo.addEventListener('click', () => {
    confirmOverlay.classList.remove('open', 'anchored');
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
    }, sessionNameValidator);
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
    if (namePromptValidate) {
      const err = namePromptValidate(name);
      if (err) { showToast(err); return; }
    }
    namePromptOverlay.classList.remove('open');
    if (namePromptCallback) namePromptCallback(name);
    namePromptCallback = null;
    namePromptValidate = null;
  });

  namePromptCancel.addEventListener('click', () => {
    namePromptOverlay.classList.remove('open');
    namePromptCallback = null;
  });

  namePromptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') namePromptOk.click();
    if (e.key === 'Escape') namePromptCancel.click();
  });

  // Session actions menu (kebab ⋮)
  sessionActionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sessionActionsMenu.classList.toggle('open');
  });

  menuSaveBtn.addEventListener('click', () => {
    sessionActionsMenu.classList.remove('open');
    doSaveCurrentSession();
    renderSessionHeader();
  });
  menuSaveAsBtn.addEventListener('click', () => {
    sessionActionsMenu.classList.remove('open');
    showNamePrompt(state.currentSessionName + ' (copy)', (newName) => { doSaveAsSession(newName); }, sessionNameValidator);
  });
  menuAdvEditBtn.addEventListener('click', () => {
    sessionActionsMenu.classList.remove('open');
    openEditor();
  });

  // Segment edit popover
  segEditClose.addEventListener('click', closeSegEditPopover);
  segEditCancel.addEventListener('click', closeSegEditPopover);
  segEditBackdrop.addEventListener('click', closeSegEditPopover);
  segEditSave.addEventListener('click', saveSegEditPopover);
  segEditPopover.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); closeSegEditPopover(); }
    if (e.key === 'Enter' && e.target.tagName !== 'SELECT') { e.preventDefault(); saveSegEditPopover(); }
  });
  segEditManageSounds.addEventListener('click', () => {
    openSoundLibrary();
  });
  document.getElementById('segEditSound').addEventListener('change', function() {
    segEditSoundPicker.style.display = this.checked ? '' : 'none';
  });
  segEditPreview.addEventListener('click', () => {
    previewSound(segEditSoundKey.value);
  });
  segEditSoundKey.addEventListener('change', () => {
    if (segEditSoundKey.value === '__manage__') {
      // Revert to previous selection and open library
      const seg = getCurrentSession()?.segments[segEditIdx];
      segEditSoundKey.value = seg?.soundKey || 'default';
      openSoundLibrary();
      return;
    }
    segEditDeleteCustom.classList.toggle('hidden', !segEditSoundKey.value.startsWith('custom:'));
  });
  segEditDeleteCustom.addEventListener('click', () => {
    const val = segEditSoundKey.value;
    if (!val.startsWith('custom:')) return;
    const id = val.slice(7);

    if (segEditDeleteCustom.dataset.confirming === 'true') {
      deleteSoundFromLibrary(id);
      segEditSoundKey.innerHTML = buildSoundOptionsHTML('default');
      segEditSoundKey.value = 'default';
      segEditDeleteCustom.classList.add('hidden');
      segEditDeleteCustom.textContent = '\u00D7';
      segEditDeleteCustom.dataset.confirming = '';
      segEditDeleteCustom.classList.remove('confirming');
      return;
    }

    segEditDeleteCustom.textContent = 'Delete?';
    segEditDeleteCustom.dataset.confirming = 'true';
    segEditDeleteCustom.classList.add('confirming');
    setTimeout(() => {
      if (segEditDeleteCustom.dataset.confirming === 'true') {
        segEditDeleteCustom.textContent = '\u00D7';
        segEditDeleteCustom.dataset.confirming = '';
        segEditDeleteCustom.classList.remove('confirming');
      }
    }, 3000);
  });

  // Sound Library modal
  soundLibClose.addEventListener('click', closeSoundLibrary);
  soundLibUploadBtn.addEventListener('click', () => { soundLibraryFileInput.click(); });
  soundLibraryFileInput.addEventListener('change', e => {
    handleSoundLibraryUpload(e.target.files);
    soundLibraryFileInput.value = '';
  });
  soundLibraryOverlay.addEventListener('click', e => { if (e.target === soundLibraryOverlay) closeSoundLibrary(); });

  // Delegated events inside Sound Library list
  document.getElementById('soundLibList').addEventListener('click', e => {
    const item = e.target.closest('.sound-lib-item');
    if (!item) return;
    const id = item.dataset.id;

    if (e.target.closest('.sound-lib-preview-btn')) {
      previewSound(id);
    } else if (e.target.closest('.sound-lib-name')) {
      startSoundRename(e.target.closest('.sound-lib-name'));
    } else if (e.target.closest('.sound-lib-delete-btn')) {
      const btn = e.target.closest('.sound-lib-delete-btn');
      if (btn.classList.contains('confirming')) {
        deleteSoundFromLibrary(id);
      } else {
        btn.textContent = 'Delete?';
        btn.classList.add('confirming');
        setTimeout(() => {
          if (btn.classList.contains('confirming')) {
            btn.textContent = '\u00D7';
            btn.classList.remove('confirming');
          }
        }, 3000);
      }
    }
  });

  // Right-side navigation buttons
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
    if (editorData.length === 0) {
      showToast('Add at least one segment');
      return;
    }
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
      activateSession(newSess);
      showToast('New session created');
    } else {
      const sess = getCurrentSession();
      // Renaming onto another existing session would create ambiguous duplicates
      if (sessions.some(s => s.name === name && s !== sess)) {
        showToast('A session with that name already exists');
        return;
      }
      const prevTotal = state.timerTotal;
      const prevRemaining = state.timerSeconds;

      sess.name = name;
      sess.segments = editorData.map(s => ({ ...s }));
      state.currentSessionName = name;

      // Preserve the user's position instead of restarting the session
      const idx = Math.min(state.currentSegmentIndex, sess.segments.length - 1);
      state.currentSegmentIndex = idx;
      const newTotal = segmentTotalSeconds(sess.segments[idx]);
      if (newTotal === prevTotal) {
        // Active segment length unchanged — keep remaining time (and keep running)
        state.timerSeconds = Math.min(prevRemaining, newTotal);
      } else {
        // Active segment length changed — reset its clock, paused
        if (running) pauseTimer();
        state.timerTotal = newTotal;
        state.timerSeconds = newTotal;
      }

      saveSessions(); saveState(); takeSnapshot();
      applySegmentTheme(sess.segments[idx]);
      renderSessionPanel(); renderTimer(); closeEditor();
      showToast('Session saved');
    }
  });

  editorCancel.addEventListener('click', closeEditor);
  editorClose.addEventListener('click', closeEditor);

  // Legacy sound file input (kept for backward compat, redirects to library)
  soundFileInput.addEventListener('change', e => {
    handleSoundLibraryUpload(e.target.files);
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
      namePromptOverlay.classList.contains('open') ||
      segEditPopover.classList.contains('open') ||
      helpModal.classList.contains('open') ||
      soundLibraryOverlay.classList.contains('open') ||
      document.getElementById('onboardingModal').classList.contains('open');

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
      if (document.getElementById('onboardingModal').classList.contains('open')) { closeOnboarding(); }
      else if (soundLibraryOverlay.classList.contains('open')) { closeSoundLibrary(); }
      else if (helpModal.classList.contains('open')) { closeHelpModal(); }
      else if (segEditPopover.classList.contains('open')) { closeSegEditPopover(); }
      else if (sessionActionsMenu.classList.contains('open')) { sessionActionsMenu.classList.remove('open'); }
      else if (namePromptOverlay.classList.contains('open')) { namePromptOverlay.classList.remove('open'); namePromptCallback = null; }
      else if (savePromptOverlay.classList.contains('open')) { savePromptOverlay.classList.remove('open'); savePromptCallbacks = null; }
      else if (editorModal.classList.contains('open')) closeEditor();
      else if (savedModal.classList.contains('open')) closeSavedModal();
      else if (confirmOverlay.classList.contains('open')) { confirmOverlay.classList.remove('open', 'anchored'); confirmCallback = null; }
    }
  });

  // Close session actions menu on outside click
  document.addEventListener('click', () => {
    sessionActionsMenu.classList.remove('open');
  });

  // Modal close on backdrop
  editorModal.addEventListener('click', e => { if (e.target === editorModal) closeEditor(); });
  savedModal.addEventListener('click', e => { if (e.target === savedModal) closeSavedModal(); });
  confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) { confirmOverlay.classList.remove('open', 'anchored'); confirmCallback = null; }});
  savePromptOverlay.addEventListener('click', e => { if (e.target === savePromptOverlay) { savePromptOverlay.classList.remove('open'); savePromptCallbacks = null; }});
  namePromptOverlay.addEventListener('click', e => { if (e.target === namePromptOverlay) { namePromptOverlay.classList.remove('open'); namePromptCallback = null; }});
}

/* ═══════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════ */
async function init() {
  loadAll();
  await SoundStore.init();
  await migrateLegacySounds();
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
  renderSessionPanel();
  renderTimer();
  saveState();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && running) tick();
  });

  window.addEventListener('resize', () => sizeTimerContent());

  // Onboarding & contextual hints
  setupContextualHints();
  checkOnboarding();
}

setupEventListeners();
init();
