/* ═══════════════════════════════════════════════════
   SHARED INLINE SVG ICONS
   Emoji glyphs (✎ 💾 📋) render inconsistently across
   platforms — inline SVGs inherit currentColor instead.
   ═══════════════════════════════════════════════════ */
const ICON_PENCIL = '<svg class="menu-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
const ICON_COPY = '<svg class="menu-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const ICON_SAVE = '<svg class="menu-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';

/* ═══════════════════════════════════════════════════
   SIDEBAR PANEL COLLAPSE
   ═══════════════════════════════════════════════════ */
function updatePanelCollapse() {
  sessionPanel.classList.toggle('collapsed', state.panelCollapsed);
  sessionExpandBtn.classList.toggle('visible', state.panelCollapsed);

  // Re-center timer content after panel transition finishes
  const inner = document.querySelector('.session-panel-inner');
  if (inner) {
    const onEnd = () => {
      inner.removeEventListener('transitionend', onEnd);
      sizeTimerContent();
    };
    inner.addEventListener('transitionend', onEnd);
  }
}

/* ═══════════════════════════════════════════════════
   UI RENDERING
   ═══════════════════════════════════════════════════ */
function renderSessionHeader() {
  const nameEl = document.getElementById('sessionName');
  if (!nameEl) return; // name element may be replaced by input during inline edit
  const sess = getCurrentSession();
  const dirty = hasUnsavedChanges();
  nameEl.textContent = (sess ? sess.name : 'No Session') + (dirty ? ' *' : '');
}

function renderSessionPanel() {
  // Skip re-render while an inline edit input is active
  if (inlineEditActive) return;

  renderSessionHeader();

  const sess = getCurrentSession();
  if (!sess || !sess.segments.length) {
    sessionSegments.innerHTML = '<div class="empty-state compact"><div class="empty-state-icon">&#128203;</div><div class="empty-state-text">No segments yet</div><button class="empty-state-btn" onclick="openEditorNew()">Add Segments</button></div>';
    if (!running) {
      sessionSegments.innerHTML += '<button class="segment-add-btn">+ Add Segment</button>';
    }
    setupInlineEditing();
    return;
  }

  let html = sess.segments.map((s, i) => {
    const isActive = i === state.currentSegmentIndex;
    const isCompleted = i < state.currentSegmentIndex;
    let iconHtml = '';
    if (isCompleted) iconHtml = '<span class="segment-icon completed" aria-hidden="true">&#10003;</span>';
    else if (isActive && running) iconHtml = '<span class="segment-icon playing" aria-hidden="true"><span class="icon-play-sm"></span></span>';
    else if (isActive) iconHtml = '<span class="segment-icon playing" aria-hidden="true"><span class="icon-pause-sm"></span></span>';
    else iconHtml = '<span class="segment-icon" aria-hidden="true"></span>';

    const dur = segmentTotalSeconds(s);
    const durStr = formatTime(dur);

    return `<div class="segment-item ${isActive ? 'active' : ''}" data-index="${i}">
      <span class="segment-drag-handle" draggable="true" aria-hidden="true">&#10495;</span>
      <span class="segment-num" aria-hidden="true">${i + 1}</span>
      ${iconHtml}
      <span class="segment-title-text">${escHtml(s.title)}</span>
      <span class="segment-duration">${durStr}</span>
      <button class="segment-edit-btn" title="Edit segment" aria-label="Edit segment ${i + 1}">${ICON_PENCIL}</button>
      <button class="segment-delete-btn" title="Remove segment" aria-label="Remove segment ${i + 1}">&times;</button>
    </div>`;
  }).join('');

  // Add segment button (only when timer is stopped)
  if (!running) {
    html += '<button class="segment-add-btn">+ Add Segment</button>';
  }

  sessionSegments.innerHTML = html;

  // Click to jump (on the row itself, not on edit/delete buttons)
  sessionSegments.querySelectorAll('.segment-item').forEach(el => {
    el.addEventListener('click', () => {
      if (inlineEditActive) return;
      const idx = parseInt(el.dataset.index);
      if (idx !== state.currentSegmentIndex) {
        advanceToSegment(idx);
      }
    });
  });

  // Set up inline editing, drag reorder, add/delete handlers
  setupInlineEditing();
  setupPanelDragReorder();
}

function sizeTimerContent() {
  const digitsWidth = timerDigits.offsetWidth;
  progressBar.style.width = digitsWidth + 'px';

  currentTitle.style.maxWidth = (digitsWidth * 2) + 'px';

  const digitsFontSize = parseFloat(getComputedStyle(timerDigits).fontSize);
  const maxTitleSize = digitsFontSize * 0.75;
  const titleLen = currentTitle.textContent.replace(/[\u{1F000}-\u{1FFFF}]/gu, 'X').length;
  const scale = Math.min(1, 12 / Math.max(titleLen, 6));
  const titleSize = Math.max(14, Math.round(maxTitleSize * scale));
  currentTitle.style.fontSize = titleSize + 'px';
}

let sizeRafId = null;
function renderTimer() {
  // Don't clobber if user is editing the main timer display or title
  if (typeof mainTimerEditActive !== 'undefined' && mainTimerEditActive) return;
  if (typeof mainTitleEditActive !== 'undefined' && mainTitleEditActive) return;
  timerDigits.textContent = formatTime(state.timerSeconds);

  const fraction = state.timerTotal > 0 ? state.timerSeconds / state.timerTotal : 1;
  progressFill.style.width = (fraction * 100) + '%';

  const playIcon = playBtn.querySelector('span');
  if (playIcon) {
    playIcon.className = running ? 'icon-pause' : 'icon-play';
  }

  const sess = getCurrentSession();
  if (sess && sess.segments[state.currentSegmentIndex]) {
    currentTitle.textContent = sess.segments[state.currentSegmentIndex].title;
  }

  // Edit affordances: show cursor + tooltip hint when timer is paused
  const canEdit = !running;
  currentTitle.classList.toggle('editable', canEdit);
  timerDigits.classList.toggle('editable', canEdit);
  currentTitle.title = canEdit ? 'Double-click to edit' : '';
  timerDigits.title = canEdit ? 'Double-click to edit time' : '';

  if (!sizeRafId) {
    sizeRafId = requestAnimationFrame(() => { sizeTimerContent(); sizeRafId = null; });
  }

  if (running) {
    document.title = formatTime(state.timerSeconds) + ' - ' + currentTitle.textContent + ' | JoyPro Timer';
  } else {
    document.title = 'JoyPro Timer';
  }

  syncPopout();
}
