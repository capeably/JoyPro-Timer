/* ═══════════════════════════════════════════════════
   SIDEBAR PANEL COLLAPSE
   ═══════════════════════════════════════════════════ */
let _panelResizeTimer = null;
function updatePanelCollapse() {
  sidebarPanel.classList.toggle('collapsed', state.panelCollapsed);
  sidebarExpandBtn.classList.toggle('visible', state.panelCollapsed);

  // Apply saved panel height when expanded
  const inner = document.querySelector('.sidebar-panel-inner');
  if (inner && !state.panelCollapsed && state.panelHeight) {
    inner.style.maxHeight = state.panelHeight + 'px';
  }

  // Re-center timer content after panel transition finishes
  // Use both transitionend and a timeout fallback (300ms covers the 250ms transition)
  if (_panelResizeTimer) clearTimeout(_panelResizeTimer);
  let done = false;
  const recenter = () => {
    if (done) return;
    done = true;
    if (inner) inner.removeEventListener('transitionend', recenter);
    if (_panelResizeTimer) { clearTimeout(_panelResizeTimer); _panelResizeTimer = null; }
    sizeTimerContent();
  };
  if (inner) inner.addEventListener('transitionend', recenter);
  _panelResizeTimer = setTimeout(recenter, 300);
}

/* ═══════════════════════════════════════════════════
   UI RENDERING
   ═══════════════════════════════════════════════════ */
function renderSidebarHeader() {
  const sess = getCurrentSession();
  sidebarSessionName.textContent = sess ? sess.name : 'No Session';
}

function renderSidebar() {
  renderSidebarHeader();

  const sess = getCurrentSession();
  if (!sess || !sess.segments.length) {
    sidebarSegments.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">&#128203;</div><div class="empty-state-text">No segments yet</div><button class="empty-state-btn" onclick="openEditorNew()">Add Segments</button></div>';
    return;
  }

  sidebarSegments.innerHTML = sess.segments.map((s, i) => {
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
      <span class="segment-num">${i + 1}</span>
      ${iconHtml}
      <span class="segment-title-text">${escHtml(s.title)}</span>
      <span class="segment-duration">${durStr}</span>
    </div>`;
  }).join('');

  // Click to jump
  sidebarSegments.querySelectorAll('.segment-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      if (idx !== state.currentSegmentIndex) {
        advanceToSegment(idx);
      }
    });
  });
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
