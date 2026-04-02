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

function enterDurationEdit(segmentEl, clickEvent) {
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

  // Determine which field to focus based on click position
  let focusSS = false;
  if (clickEvent && span) {
    const rect = span.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    focusSS = clickEvent.clientX > midX;
  }

  // Build split MM:SS editor
  const wrapper = document.createElement('span');
  wrapper.className = 'duration-edit-wrapper';

  const mmInput = document.createElement('input');
  mmInput.type = 'text';
  mmInput.className = 'segment-inline-input duration-mm';
  mmInput.value = String(seg.durationMinutes || 0);
  mmInput.maxLength = 3;
  mmInput.spellcheck = false;

  const sep = document.createElement('span');
  sep.className = 'duration-sep';
  sep.textContent = ':';

  const ssInput = document.createElement('input');
  ssInput.type = 'text';
  ssInput.className = 'segment-inline-input duration-ss';
  ssInput.value = String(seg.durationSeconds || 0).padStart(2, '0');
  ssInput.maxLength = 2;
  ssInput.spellcheck = false;

  wrapper.appendChild(mmInput);
  wrapper.appendChild(sep);
  wrapper.appendChild(ssInput);
  span.replaceWith(wrapper);

  const target = focusSS ? ssInput : mmInput;
  target.focus();
  target.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    inlineEditActive = false;
    if (save) {
      const mins = parseInt(mmInput.value) || 0;
      const secs = Math.min(59, Math.max(0, parseInt(ssInput.value) || 0));
      const total = mins * 60 + secs;
      if (total >= 1 && total !== originalTotal) {
        seg.durationMinutes = mins;
        seg.durationSeconds = secs;
        if (idx === state.currentSegmentIndex && !running) {
          state.timerTotal = total;
          state.timerSeconds = total;
          renderTimer();
        }
      } else if (total < 1) {
        showToast('Minimum duration is 1 second');
      }
    }
    renderSessionPanel();
  };

  const onKeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  };

  // Blur: only finish when focus leaves BOTH inputs
  const onBlur = () => {
    setTimeout(() => {
      if (document.activeElement !== mmInput && document.activeElement !== ssInput) {
        finish(true);
      }
    }, 0);
  };

  for (const inp of [mmInput, ssInput]) {
    inp.addEventListener('keydown', onKeydown);
    inp.addEventListener('blur', onBlur);
    inp.addEventListener('click', e => e.stopPropagation());
  }
}

/* ── Main Timer Display Editing ───────────────── */

let mainTimerEditActive = false;

function enterMainTimerEdit() {
  if (mainTimerEditActive || inlineEditActive) return;
  if (running) {
    showToast('Pause timer to edit time');
    return;
  }

  const sess = getCurrentSession();
  const seg = sess?.segments[state.currentSegmentIndex];
  if (!seg) return;

  mainTimerEditActive = true;
  const totalSecs = state.timerSeconds;
  const hh = Math.floor(totalSecs / 3600);
  const mm = Math.floor((totalSecs % 3600) / 60);
  const ss = totalSecs % 60;

  timerDigits.textContent = '';
  timerDigits.classList.add('editing');

  const wrapper = document.createElement('div');
  wrapper.className = 'timer-edit-wrapper';

  const allInputs = [];

  // Build a single time-unit column: chevron-up, input, chevron-down
  function buildColumn(value, max, cls) {
    const col = document.createElement('div');
    col.className = 'timer-edit-col';

    const upBtn = document.createElement('button');
    upBtn.className = 'timer-edit-chevron up';
    upBtn.innerHTML = '&#9650;';
    upBtn.tabIndex = -1;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'timer-edit-input ' + cls;
    input.value = String(value).padStart(2, '0');
    input.maxLength = 2;
    input.spellcheck = false;
    input.inputMode = 'numeric';

    const downBtn = document.createElement('button');
    downBtn.className = 'timer-edit-chevron down';
    downBtn.innerHTML = '&#9660;';
    downBtn.tabIndex = -1;

    col.appendChild(upBtn);
    col.appendChild(input);
    col.appendChild(downBtn);

    // ── Chevron: click to increment/decrement by 1 ──
    function adjust(delta) {
      let v = parseInt(input.value) || 0;
      v += delta;
      if (v > max) v = 0;
      if (v < 0) v = max;
      input.value = String(v).padStart(2, '0');
    }

    // ── Chevron: hold for auto-repeat with acceleration ──
    function setupHold(btn, delta) {
      let holdTimer = null;
      let interval = 400;

      function tick() {
        adjust(delta);
        interval = Math.max(80, interval * 0.82);
        holdTimer = setTimeout(tick, interval);
      }

      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        adjust(delta);
        interval = 400;
        holdTimer = setTimeout(tick, interval);
      });

      const stop = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
    }

    setupHold(upBtn, 1);
    setupHold(downBtn, -1);

    // ── Mouse wheel: snap to nearest multiple of 5, with wrapping ──
    input.addEventListener('wheel', e => {
      e.preventDefault();
      let v = parseInt(input.value) || 0;
      if (e.deltaY < 0) {
        v = (Math.floor(v / 5) + 1) * 5;
        if (v > max) v = 0;
      } else {
        v = (Math.ceil(v / 5) - 1) * 5;
        if (v < 0) v = Math.floor(max / 5) * 5;
      }
      input.value = String(v).padStart(2, '0');
    }, { passive: false });

    // ── Arrow keys: increment by 1 ──
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); adjust(1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); adjust(-1); }
    });

    // ── On blur: zero-pad and clamp ──
    input.addEventListener('blur', () => {
      let v = parseInt(input.value) || 0;
      v = Math.max(0, Math.min(max, v));
      input.value = String(v).padStart(2, '0');
    });

    // ── Filter to numeric only ──
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 2);
    });

    allInputs.push(input);
    return col;
  }

  function buildSep() {
    const sep = document.createElement('span');
    sep.className = 'timer-edit-sep';
    sep.textContent = ':';
    return sep;
  }

  const hhCol = buildColumn(hh, 99, 'timer-edit-hh');
  const mmCol = buildColumn(mm, 59, 'timer-edit-mm');
  const ssCol = buildColumn(ss, 59, 'timer-edit-ss');

  wrapper.appendChild(hhCol);
  wrapper.appendChild(buildSep());
  wrapper.appendChild(mmCol);
  wrapper.appendChild(buildSep());
  wrapper.appendChild(ssCol);
  timerDigits.appendChild(wrapper);

  // Focus the minutes field (most common edit)
  allInputs[1].focus();
  allInputs[1].select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    mainTimerEditActive = false;
    if (save) {
      const newHH = Math.min(99, Math.max(0, parseInt(allInputs[0].value) || 0));
      const newMM = Math.min(59, Math.max(0, parseInt(allInputs[1].value) || 0));
      const newSS = Math.min(59, Math.max(0, parseInt(allInputs[2].value) || 0));
      const total = newHH * 3600 + newMM * 60 + newSS;
      if (total >= 1) {
        seg.durationMinutes = newHH * 60 + newMM;
        seg.durationSeconds = newSS;
        state.timerTotal = total;
        state.timerSeconds = total;
      } else {
        showToast('Minimum duration is 1 second');
      }
    }
    timerDigits.textContent = '';
    timerDigits.classList.remove('editing');
    renderTimer();
    renderSessionPanel();
  };

  // ── Enter/Escape on any input ──
  for (const inp of allInputs) {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    inp.addEventListener('click', e => e.stopPropagation());
  }

  // ── Blur: finish only when focus leaves ALL inputs and chevrons ──
  wrapper.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!wrapper.contains(document.activeElement)) {
        finish(true);
      }
    }, 0);
  });
}

/* ── Main Title Editing (from main display) ───── */

let mainTitleEditActive = false;

function enterMainTitleEdit() {
  if (mainTitleEditActive || mainTimerEditActive || inlineEditActive) return;

  const sess = getCurrentSession();
  const seg = sess?.segments[state.currentSegmentIndex];
  if (!seg) return;

  mainTitleEditActive = true;
  const original = seg.title;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'main-title-edit-input';
  input.value = original;
  input.spellcheck = false;

  // Size input to fit the text content
  function sizeInput() {
    input.style.width = Math.max(8, input.value.length + 2) + 'ch';
  }
  sizeInput();
  input.addEventListener('input', sizeInput);

  currentTitle.textContent = '';
  currentTitle.appendChild(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    mainTitleEditActive = false;
    if (save) {
      const val = input.value.trim();
      if (val && val !== original) {
        seg.title = val;
      }
    }
    currentTitle.textContent = '';
    renderTimer();
    renderSessionPanel();
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
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
        enterDurationEdit(activeEl, e);
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

  // Populate sound dropdown
  const customKey = idx + '_' + state.currentSessionName;
  const hasCustom = !!customSounds[customKey];
  const selectedSoundKey = hasCustom ? ('custom:' + customKey) : (seg.soundKey || 'default');
  const soundKeySelect = document.getElementById('segEditSoundKey');
  soundKeySelect.innerHTML = buildSoundOptionsHTML(selectedSoundKey, idx, state.currentSessionName);
  if (hasCustom) soundKeySelect.value = 'custom:' + customKey;

  // Show/hide sound picker based on sound enabled, and delete btn based on selection
  const soundPicker = document.getElementById('segEditSoundPicker');
  soundPicker.style.display = seg.soundEnabled ? '' : 'none';
  document.getElementById('segEditDeleteCustom').classList.toggle('hidden', !soundKeySelect.value.startsWith('custom:'));

  // Toggle sound picker visibility when checkbox changes
  document.getElementById('segEditSound').addEventListener('change', function() {
    soundPicker.style.display = this.checked ? '' : 'none';
  });

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
  const soundVal = document.getElementById('segEditSoundKey').value;
  seg.soundKey = soundVal.startsWith('custom:') ? 'default' : soundVal;

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
