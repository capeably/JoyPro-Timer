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
  editorData = [{
    title: "25-Minute Segment",
    durationMinutes: 25,
    durationSeconds: 0,
    soundEnabled: true,
    soundKey: "default",
    autoAdvance: true,
    theme: "default"
  }];
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
      <span class="drag-handle" draggable="true" aria-hidden="true">&#9776;</span>
      <div class="move-btns">
        <button class="move-btn" data-action="move-up" data-index="${i}" aria-label="Move segment ${i + 1} up" ${i === 0 ? 'disabled' : ''}>&#9650;</button>
        <button class="move-btn" data-action="move-down" data-index="${i}" aria-label="Move segment ${i + 1} down" ${i === editorData.length - 1 ? 'disabled' : ''}>&#9660;</button>
      </div>
      <div class="editor-segment-fields">
        <div class="editor-row">
          <input type="text" value="${escHtml(s.title)}" data-field="title" placeholder="Segment name" aria-label="Segment name">
          <input type="number" value="${s.durationMinutes || 0}" data-field="min" min="0" max="999" title="Minutes" aria-label="Minutes">
          <span class="editor-time-sep">:</span>
          <input type="number" value="${String(s.durationSeconds || 0).padStart(2,'0')}" data-field="sec" min="0" max="59" title="Seconds" aria-label="Seconds">
        </div>
        <div class="editor-segment-options">
          <label><input type="checkbox" data-field="sound" ${s.soundEnabled ? 'checked' : ''}> Sound</label>
          <label><input type="checkbox" data-field="auto" ${s.autoAdvance ? 'checked' : ''}> Auto-advance</label>
          <div class="editor-sound-picker" data-index="${i}" style="${s.soundEnabled ? '' : 'display:none'}">
            <select data-field="soundKey" aria-label="Completion sound">${buildSoundOptionsHTML(s.soundKey || 'default')}</select>
            <button class="editor-sound-preview" data-field="preview" title="Preview" aria-label="Preview sound">&#9654;</button>
            <button class="sound-upload-btn" data-field="manage" title="Manage Sounds" aria-label="Manage sounds">&#9835;</button>
          </div>
          <label class="theme-select-label">Theme:
            <select data-field="theme">
              <option value="default" ${(!s.theme || s.theme === 'default') ? 'selected' : ''}>Default</option>
              ${Object.entries(THEMES).map(([key, t]) =>
                `<option value="${key}" ${s.theme === key ? 'selected' : ''}>${t.label}</option>`
              ).join('')}
            </select>
          </label>
        </div>
      </div>
      <button class="editor-remove-btn" data-action="remove" data-index="${i}" aria-label="Remove segment ${i + 1}">&times;</button>
    </div>
  `).join('');

  // Input listeners
  editorSegments.querySelectorAll('input, select, .sound-upload-btn, [data-field="manage"]').forEach(el => {
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
      el.addEventListener('change', () => {
        editorData[idx].soundEnabled = el.checked;
        const picker = segment.querySelector('.editor-sound-picker');
        if (picker) picker.style.display = el.checked ? '' : 'none';
      });
    } else if (el.dataset.field === 'soundKey') {
      el.addEventListener('change', () => {
        if (el.value === '__manage__') {
          el.value = editorData[idx].soundKey || 'default';
          openSoundLibrary();
          return;
        }
        editorData[idx].soundKey = el.value;
      });
    } else if (el.dataset.field === 'preview') {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const sel = segment.querySelector('[data-field="soundKey"]');
        if (sel) previewSound(sel.value);
      });
    } else if (el.dataset.field === 'auto') {
      el.addEventListener('change', () => { editorData[idx].autoAdvance = el.checked; });
    } else if (el.dataset.field === 'theme') {
      el.addEventListener('change', () => { editorData[idx].theme = el.value; });
    } else if (el.dataset.field === 'manage') {
      el.addEventListener('click', () => { openSoundLibrary(); });
    }
  });

  // Remove buttons
  editorSegments.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (editorData.length <= 1) {
        showToast('Session must have at least one segment');
        return;
      }
      const idx = parseInt(btn.dataset.index);
      editorData.splice(idx, 1);
      renderEditorSegments();
    });
  });

  // Move up/down buttons (touch devices)
  editorSegments.querySelectorAll('[data-action="move-up"], [data-action="move-down"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const dir = btn.dataset.action === 'move-up' ? -1 : 1;
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= editorData.length) return;
      const [moved] = editorData.splice(idx, 1);
      editorData.splice(targetIdx, 0, moved);
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
