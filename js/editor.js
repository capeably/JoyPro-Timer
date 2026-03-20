/* ═══════════════════════════════════════════════════
   SESSION EDITOR
   ═══════════════════════════════════════════════════ */
let editorData = [];

function openEditor() {
  isNewSessionMode = false;
  editorModalTitle.textContent = 'Edit Session';
  const sess = getCurrentSession();
  editorSessionName.value = sess.name;
  editorData = sess.segments.map(s => ({ ...s }));
  renderEditorSegments();
  editorModal.classList.add('open');
}

function openEditorNew() {
  isNewSessionMode = true;
  editorModalTitle.textContent = 'New Session';
  editorSessionName.value = 'New Session';
  editorData = [];
  renderEditorSegments();
  editorModal.classList.add('open');
}

function closeEditor() {
  editorModal.classList.remove('open');
  isNewSessionMode = false;
}

function renderEditorSegments() {
  editorSegments.innerHTML = editorData.map((s, i) => `
    <div class="editor-segment" data-index="${i}">
      <span class="drag-handle" draggable="true">&#9776;</span>
      <div class="editor-segment-fields">
        <div class="editor-row">
          <input type="text" value="${escHtml(s.title)}" data-field="title" placeholder="Segment name">
          <input type="number" value="${s.durationMinutes || 0}" data-field="min" min="0" max="999" title="Minutes">
          <span class="editor-time-sep">:</span>
          <input type="number" value="${String(s.durationSeconds || 0).padStart(2,'0')}" data-field="sec" min="0" max="59" title="Seconds">
        </div>
        <div class="editor-segment-options">
          <label><input type="checkbox" data-field="sound" ${s.soundEnabled ? 'checked' : ''}> Sound</label>
          <label><input type="checkbox" data-field="auto" ${s.autoAdvance ? 'checked' : ''}> Auto-advance</label>
          <span class="sound-upload-btn" data-field="upload" data-index="${i}">Custom sound</span>
        </div>
      </div>
      <button class="editor-remove-btn" data-action="remove" data-index="${i}">&times;</button>
    </div>
  `).join('');

  // Input listeners
  editorSegments.querySelectorAll('input, .sound-upload-btn').forEach(el => {
    const segment = el.closest('.editor-segment');
    if (!segment) return;
    const idx = parseInt(segment.dataset.index);

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
  editorSegments.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      editorData.splice(idx, 1);
      renderEditorSegments();
    });
  });

  // Drag and drop reordering
  setupDragReorder();
}

function setupDragReorder() {
  let dragSrcIdx = null;

  // Only the drag handle initiates the drag
  editorSegments.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('dragstart', e => {
      const row = handle.closest('.editor-segment');
      dragSrcIdx = parseInt(row.dataset.index);
      row.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    handle.addEventListener('dragend', () => {
      const row = handle.closest('.editor-segment');
      row.style.opacity = '';
      editorSegments.querySelectorAll('.editor-segment').forEach(x => x.style.borderTop = '');
    });
  });

  // Drop targets are the segment rows
  editorSegments.querySelectorAll('.editor-segment').forEach(el => {
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
        renderEditorSegments();
      }
    });
  });
}
