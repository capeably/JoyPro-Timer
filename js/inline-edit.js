/* ═══════════════════════════════════════════════════
   INLINE EDITING — title, duration, drag reorder,
   add/delete segments, session name editing
   ═══════════════════════════════════════════════════ */
let inlineEditActive = false;

/* ── Title & Duration Editing ──────────────────── */

function enterTitleEdit(segmentEl) {
  if (inlineEditActive) return;
  const idx = parseInt(segmentEl.dataset.index);
  const sess = getCurrentSession();
  if (!sess || !sess.segments[idx]) return;

  inlineEditActive = true;
  const span = segmentEl.querySelector('.segment-title-text');
  const original = sess.segments[idx].title;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'segment-inline-input title-input';
  input.value = original;
  input.spellcheck = false;
  span.replaceWith(input);
  input.focus();
  input.select();

  const finish = (save) => {
    if (!inlineEditActive) return;
    inlineEditActive = false;
    if (save) {
      const val = input.value.trim();
      if (val && val !== original) {
        sess.segments[idx].title = val;
        if (idx === state.currentSegmentIndex) renderTimer();
      }
    }
    renderSessionPanel();
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
  // Stop click from bubbling to segment-item (which would jump timer)
  input.addEventListener('click', e => e.stopPropagation());
}

function enterDurationEdit(segmentEl) {
  if (inlineEditActive) return;
  const idx = parseInt(segmentEl.dataset.index);
  const sess = getCurrentSession();
  if (!sess || !sess.segments[idx]) return;

  // Block editing active segment duration while timer is running
  if (running && idx === state.currentSegmentIndex) {
    showToast('Pause timer to edit active segment duration');
    return;
  }

  inlineEditActive = true;
  const span = segmentEl.querySelector('.segment-duration');
  const seg = sess.segments[idx];
  const originalTotal = segmentTotalSeconds(seg);
  const originalStr = formatTime(originalTotal);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'segment-inline-input duration-input';
  input.value = originalStr;
  input.spellcheck = false;
  span.replaceWith(input);
  input.focus();
  input.select();

  const finish = (save) => {
    if (!inlineEditActive) return;
    inlineEditActive = false;
    if (save) {
      const parsed = parseDuration(input.value);
      if (parsed !== null && parsed >= 1 && parsed !== originalTotal) {
        seg.durationMinutes = Math.floor(parsed / 60);
        seg.durationSeconds = parsed % 60;
        // If this is the active segment and timer is stopped, update timer
        if (idx === state.currentSegmentIndex && !running) {
          state.timerTotal = parsed;
          state.timerSeconds = parsed;
          renderTimer();
        }
      } else if (parsed !== null && parsed < 1) {
        showToast('Minimum duration is 1 second');
      }
    }
    renderSessionPanel();
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', e => e.stopPropagation());
}

function parseDuration(str) {
  str = str.trim();
  // MM:SS format
  const match = str.match(/^(\d+):(\d{1,2})$/);
  if (match) {
    const mins = parseInt(match[1]);
    const secs = parseInt(match[2]);
    if (secs > 59) return null;
    return mins * 60 + secs;
  }
  // Plain number → treat as minutes
  const num = parseInt(str);
  if (!isNaN(num) && num > 0) return num * 60;
  return null;
}

/* ── Session Name Editing ──────────────────────── */

function enterSessionNameEdit() {
  if (inlineEditActive) return;
  const sess = getCurrentSession();
  if (!sess) return;

  inlineEditActive = true;
  const nameEl = document.getElementById('sessionName');
  const original = sess.name;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'session-name-input';
  input.value = original;
  input.spellcheck = false;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = (save) => {
    if (!inlineEditActive) return;
    inlineEditActive = false;
    if (save) {
      const val = input.value.trim();
      if (val && val !== original) {
        // Check for name conflicts
        if (sessions.some(s => s.name === val && s !== sess)) {
          showToast('A session with that name already exists');
        } else {
          sess.name = val;
          state.currentSessionName = val;
          saveState();
        }
      }
    }
    // Restore the div element
    const div = document.createElement('div');
    div.className = 'session-name';
    div.id = 'sessionName';
    input.replaceWith(div);
    renderSessionPanel();
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
}

/* ── Setup Inline Editing Handlers ─────────────── */

function setupInlineEditing() {
  // Double-click on active segment's title or duration to edit (paused only)
  const activeEl = sessionSegments.querySelector('.segment-item.active');
  if (activeEl && !running) {
    const titleSpan = activeEl.querySelector('.segment-title-text');
    if (titleSpan) {
      titleSpan.addEventListener('dblclick', e => {
        e.stopPropagation();
        enterTitleEdit(activeEl);
      });
    }
    const durSpan = activeEl.querySelector('.segment-duration');
    if (durSpan) {
      durSpan.addEventListener('dblclick', e => {
        e.stopPropagation();
        enterDurationEdit(activeEl);
      });
    }
  }

  // Edit buttons (pencil → open segment edit popover)
  sessionSegments.querySelectorAll('.segment-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.closest('.segment-item').dataset.index);
      openSegEditPopover(idx, btn);
    });
  });

  // Delete buttons
  sessionSegments.querySelectorAll('.segment-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.closest('.segment-item').dataset.index);
      deleteSegmentInline(idx, btn);
    });
  });

  // Add segment button
  const addBtn = sessionSegments.querySelector('.segment-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      addSegmentInline();
    });
  }

  // Session name double-click to edit
  const nameEl = document.getElementById('sessionName');
  if (nameEl) {
    nameEl.addEventListener('dblclick', e => {
      e.preventDefault();
      enterSessionNameEdit();
    });
  }
}

/* ── Add & Delete Segments ─────────────────────── */

function addSegmentInline() {
  if (running) { showToast('Pause timer to add segments'); return; }
  const sess = getCurrentSession();
  if (!sess) return;

  sess.segments.push({
    title: "New Segment",
    durationMinutes: 5,
    durationSeconds: 0,
    soundEnabled: true,
    soundKey: "default",
    autoAdvance: true,
    theme: "default"
  });

  renderSessionPanel();

  // Scroll to bottom and auto-enter title edit on the new segment
  sessionSegments.scrollTop = sessionSegments.scrollHeight;
  const newSegEl = sessionSegments.querySelector(`.segment-item[data-index="${sess.segments.length - 1}"]`);
  if (newSegEl) {
    setTimeout(() => enterTitleEdit(newSegEl), 50);
  }
}

function deleteSegmentInline(idx, anchorEl) {
  if (running) { showToast('Pause timer to delete segments'); return; }
  const sess = getCurrentSession();
  if (!sess) return;

  if (sess.segments.length <= 1) {
    showToast('Session needs at least one segment');
    return;
  }

  showConfirm(`Delete "${sess.segments[idx].title}"?`, () => {
    sess.segments.splice(idx, 1);

    // Adjust current segment index if needed
    if (state.currentSegmentIndex >= sess.segments.length) {
      state.currentSegmentIndex = sess.segments.length - 1;
    } else if (idx < state.currentSegmentIndex) {
      state.currentSegmentIndex--;
    }

    // If we deleted the active segment, reset timer to new active
    if (idx === state.currentSegmentIndex || state.currentSegmentIndex >= sess.segments.length) {
      const s = sess.segments[state.currentSegmentIndex];
      if (s) {
        state.timerTotal = segmentTotalSeconds(s);
        state.timerSeconds = state.timerTotal;
      }
    }

    renderSessionPanel();
    renderTimer();
  }, anchorEl);
}

/* ── Segment Edit Popover ─────────────────────── */

let segEditIdx = -1;

function openSegEditPopover(idx, anchorEl) {
  const sess = getCurrentSession();
  if (!sess || !sess.segments[idx]) return;
  const seg = sess.segments[idx];
  segEditIdx = idx;

  // Populate fields
  const popover = document.getElementById('segEditPopover');
  const backdrop = document.getElementById('segEditBackdrop');
  document.getElementById('segEditTitle').value = seg.title;
  document.getElementById('segEditMin').value = seg.durationMinutes || 0;
  document.getElementById('segEditSec').value = String(seg.durationSeconds || 0).padStart(2, '0');
  document.getElementById('segEditSound').checked = seg.soundEnabled;
  document.getElementById('segEditAuto').checked = seg.autoAdvance;

  // Populate theme dropdown
  const themeSelect = document.getElementById('segEditTheme');
  themeSelect.innerHTML = `<option value="default" ${(!seg.theme || seg.theme === 'default') ? 'selected' : ''}>Default</option>`
    + Object.entries(THEMES).map(([key, t]) =>
      `<option value="${key}" ${seg.theme === key ? 'selected' : ''}>${t.label}</option>`
    ).join('');

  // Show/hide remove custom sound link
  const soundKey = idx + '_' + state.currentSessionName;
  const removeLink = document.getElementById('segEditRemoveSound');
  removeLink.classList.toggle('hidden', !customSounds[soundKey]);

  // Position near the anchor button
  const rect = anchorEl.getBoundingClientRect();
  const popW = 280;
  let left = rect.right - popW;
  let top = rect.bottom + 6;

  // Keep within viewport
  if (left < 8) left = 8;
  if (top + 300 > window.innerHeight) {
    top = rect.top - 6;
    popover.style.transform = 'translateY(-100%)';
  } else {
    popover.style.transform = '';
  }

  popover.style.left = left + 'px';
  popover.style.top = top + 'px';
  popover.classList.add('open');
  backdrop.classList.add('open');

  document.getElementById('segEditTitle').focus();
}

function closeSegEditPopover() {
  document.getElementById('segEditPopover').classList.remove('open');
  document.getElementById('segEditBackdrop').classList.remove('open');
  segEditIdx = -1;
}

function saveSegEditPopover() {
  const sess = getCurrentSession();
  if (!sess || segEditIdx < 0 || !sess.segments[segEditIdx]) return;
  const seg = sess.segments[segEditIdx];

  const title = document.getElementById('segEditTitle').value.trim();
  if (!title) { showToast('Title cannot be empty'); return; }

  const mins = parseInt(document.getElementById('segEditMin').value) || 0;
  const secs = Math.min(59, Math.max(0, parseInt(document.getElementById('segEditSec').value) || 0));
  const total = mins * 60 + secs;
  if (total < 1) { showToast('Minimum duration is 1 second'); return; }

  seg.title = title;
  seg.durationMinutes = mins;
  seg.durationSeconds = secs;
  seg.soundEnabled = document.getElementById('segEditSound').checked;
  seg.autoAdvance = document.getElementById('segEditAuto').checked;
  seg.theme = document.getElementById('segEditTheme').value;

  // Update timer if editing the active segment while stopped
  if (segEditIdx === state.currentSegmentIndex && !running) {
    state.timerTotal = total;
    state.timerSeconds = total;
  }

  closeSegEditPopover();
  renderSessionPanel();
  renderTimer();
}

/* ── Drag Reorder ──────────────────────────────── */

function setupPanelDragReorder() {
  if (running) {
    // Disable drag handles while running
    sessionSegments.querySelectorAll('.segment-drag-handle').forEach(h => h.classList.add('disabled'));
    return;
  }

  let dragSrcIdx = null;

  sessionSegments.querySelectorAll('.segment-drag-handle').forEach(handle => {
    handle.addEventListener('dragstart', e => {
      e.stopPropagation();
      const row = handle.closest('.segment-item');
      dragSrcIdx = parseInt(row.dataset.index);
      row.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    handle.addEventListener('dragend', () => {
      const row = handle.closest('.segment-item');
      if (row) row.style.opacity = '';
      sessionSegments.querySelectorAll('.segment-item').forEach(x => x.style.borderTop = '');
    });
  });

  sessionSegments.querySelectorAll('.segment-item').forEach(el => {
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.style.borderTop = '2px solid var(--accent)';
    });
    el.addEventListener('dragleave', () => {
      el.style.borderTop = '';
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.style.borderTop = '';
      const dropIdx = parseInt(el.dataset.index);
      if (dragSrcIdx !== null && dragSrcIdx !== dropIdx) {
        const sess = getCurrentSession();
        if (!sess) return;

        const [moved] = sess.segments.splice(dragSrcIdx, 1);
        sess.segments.splice(dropIdx, 0, moved);

        // Adjust currentSegmentIndex to follow the active segment
        if (state.currentSegmentIndex === dragSrcIdx) {
          state.currentSegmentIndex = dropIdx;
        } else if (dragSrcIdx < state.currentSegmentIndex && dropIdx >= state.currentSegmentIndex) {
          state.currentSegmentIndex--;
        } else if (dragSrcIdx > state.currentSegmentIndex && dropIdx <= state.currentSegmentIndex) {
          state.currentSegmentIndex++;
        }

        renderSessionPanel();
      }
    });
  });
}
