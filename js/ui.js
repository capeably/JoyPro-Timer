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
    if (isCompleted) iconHtml = '<span class="segment-icon completed">&#10003;</span>';
    else if (isActive && running) iconHtml = '<span class="segment-icon playing">&#9654;</span>';
    else if (isActive) iconHtml = '<span class="segment-icon playing">&#9646;&#9646;</span>';
    else iconHtml = '<span class="segment-icon"></span>';

    const dur = segmentTotalSeconds(s);
    const durStr = formatTime(dur);

    return `<div class="segment-item ${isActive ? 'active' : ''}" data-index="${i}">
      <span class="segment-drag-handle" draggable="true">&#10495;</span>
      <span class="segment-num">${i + 1}</span>
      ${iconHtml}
      <span class="segment-title-text">${escHtml(s.title)}</span>
      <span class="segment-duration">${durStr}</span>
      <button class="segment-edit-btn" title="Edit segment">&#9998;</button>
      <button class="segment-delete-btn" title="Remove segment">&times;</button>
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
  timerDigits.textContent = formatTime(state.timerSeconds);

  const fraction = state.timerTotal > 0 ? state.timerSeconds / state.timerTotal : 1;
  progressFill.style.width = (fraction * 100) + '%';

  playBtn.innerHTML = running ? '&#9646;&#9646;' : '&#9654;';

  const sess = getCurrentSession();
  if (sess && sess.segments[state.currentSegmentIndex]) {
    currentTitle.textContent = sess.segments[state.currentSegmentIndex].title;
  }

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
