/* ═══════════════════════════════════════════════════
   SEQUENCE EDITOR
   ═══════════════════════════════════════════════════ */
let editorData = [];

function openEditor() {
  isNewSequenceMode = false;
  editorModalTitle.textContent = 'Edit Sequence';
  const seq = getCurrentSequence();
  editorSeqName.value = seq.name;
  editorData = seq.sessions.map(s => ({ ...s }));
  renderEditorSessions();
  editorModal.classList.add('open');
}

function openEditorNew() {
  isNewSequenceMode = true;
  editorModalTitle.textContent = 'New Sequence';
  editorSeqName.value = 'New Sequence';
  editorData = [];
  renderEditorSessions();
  editorModal.classList.add('open');
}

function closeEditor() {
  editorModal.classList.remove('open');
  isNewSequenceMode = false;
}

function renderEditorSessions() {
  editorSessions.innerHTML = editorData.map((s, i) => `
    <div class="editor-session" data-index="${i}" draggable="true">
      <span class="drag-handle">&#9776;</span>
      <div class="editor-session-fields">
        <div class="editor-row">
          <input type="text" value="${escHtml(s.title)}" data-field="title" placeholder="Session name">
          <input type="number" value="${s.durationMinutes || 0}" data-field="min" min="0" max="999" title="Minutes">
          <span class="editor-time-sep">:</span>
          <input type="number" value="${String(s.durationSeconds || 0).padStart(2,'0')}" data-field="sec" min="0" max="59" title="Seconds">
        </div>
        <div class="editor-session-options">
          <label><input type="checkbox" data-field="sound" ${s.soundEnabled ? 'checked' : ''}> Sound</label>
          <label><input type="checkbox" data-field="auto" ${s.autoAdvance ? 'checked' : ''}> Auto-advance</label>
          <span class="sound-upload-btn" data-field="upload" data-index="${i}">Custom sound</span>
        </div>
      </div>
      <button class="editor-remove-btn" data-action="remove" data-index="${i}">&times;</button>
    </div>
  `).join('');

  // Input listeners
  editorSessions.querySelectorAll('input, .sound-upload-btn').forEach(el => {
    const session = el.closest('.editor-session');
    if (!session) return;
    const idx = parseInt(session.dataset.index);

    if (el.dataset.field === 'title') {
      el.addEventListener('input', () => { editorData[idx].title = el.value; });
    } else if (el.dataset.field === 'min') {
      el.addEventListener('input', () => { editorData[idx].durationMinutes = parseInt(el.value) || 0; });
    } else if (el.dataset.field === 'sec') {
      el.addEventListener('input', () => { editorData[idx].durationSeconds = Math.min(59, Math.max(0, parseInt(el.value) || 0)); });
    } else if (el.dataset.field === 'sound') {
      el.addEventListener('change', () => { editorData[idx].soundEnabled = el.checked; });
    } else if (el.dataset.field === 'auto') {
      el.addEventListener('change', () => { editorData[idx].autoAdvance = el.checked; });
    } else if (el.dataset.field === 'upload') {
      el.addEventListener('click', () => {
        currentEditSoundIndex = parseInt(el.dataset.index);
        soundFileInput.click();
      });
    }
  });

  // Remove buttons
  editorSessions.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      editorData.splice(idx, 1);
      renderEditorSessions();
    });
  });

  // Drag and drop reordering
  setupDragReorder();
}

function setupDragReorder() {
  let dragSrcIdx = null;
  editorSessions.querySelectorAll('.editor-session').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragSrcIdx = parseInt(el.dataset.index);
      el.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      el.style.opacity = '';
      editorSessions.querySelectorAll('.editor-session').forEach(x => x.style.borderTop = '');
    });
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
        const [moved] = editorData.splice(dragSrcIdx, 1);
        editorData.splice(dropIdx, 0, moved);
        renderEditorSessions();
      }
    });
  });
}
