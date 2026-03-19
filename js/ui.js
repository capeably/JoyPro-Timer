/* ═══════════════════════════════════════════════════
   SIDEBAR PANEL COLLAPSE
   ═══════════════════════════════════════════════════ */
function updatePanelCollapse() {
  sidebarPanel.classList.toggle('collapsed', state.panelCollapsed);
  sidebarExpandBtn.classList.toggle('visible', state.panelCollapsed);
}

/* ═══════════════════════════════════════════════════
   UI RENDERING
   ═══════════════════════════════════════════════════ */
function renderSidebarHeader() {
  const seq = getCurrentSequence();
  sidebarSeqName.textContent = seq ? seq.name : 'No Sequence';
}

function renderSidebar() {
  renderSidebarHeader();

  const seq = getCurrentSequence();
  if (!seq || !seq.sessions.length) {
    sidebarSessions.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">&#128203;</div><div class="empty-state-text">No sessions yet</div><button class="empty-state-btn" onclick="openEditorNew()">Add Sessions</button></div>';
    return;
  }

  sidebarSessions.innerHTML = seq.sessions.map((s, i) => {
    const isActive = i === state.currentSessionIndex;
    const isCompleted = i < state.currentSessionIndex;
    let iconHtml = '';
    if (isCompleted) iconHtml = '<span class="session-icon completed">&#10003;</span>';
    else if (isActive && running) iconHtml = '<span class="session-icon playing">&#9654;</span>';
    else if (isActive) iconHtml = '<span class="session-icon playing">&#9646;&#9646;</span>';
    else iconHtml = '<span class="session-icon"></span>';

    const dur = sessionTotalSeconds(s);
    const durStr = formatTime(dur);

    return `<div class="session-item ${isActive ? 'active' : ''}" data-index="${i}">
      <span class="session-num">${i + 1}</span>
      ${iconHtml}
      <span class="session-title-text">${escHtml(s.title)}</span>
      <span class="session-duration">${durStr}</span>
    </div>`;
  }).join('');

  // Click to jump
  sidebarSessions.querySelectorAll('.session-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      if (idx !== state.currentSessionIndex) {
        advanceToSession(idx);
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

  const seq = getCurrentSequence();
  if (seq && seq.sessions[state.currentSessionIndex]) {
    currentTitle.textContent = seq.sessions[state.currentSessionIndex].title;
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
