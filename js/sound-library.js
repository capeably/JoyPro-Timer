/* ═══════════════════════════════════════════════════
   SOUND LIBRARY — Global sound management + migration
   Manages metadata (soundLibrary[]) and delegates
   binary storage to SoundStore.
   ═══════════════════════════════════════════════════ */

function generateSoundId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return 'snd_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getTotalSoundBytes() {
  return soundLibrary.reduce((sum, s) => sum + (s.size || 0), 0);
}

/* ─── Open / Close ─── */
function openSoundLibrary() {
  renderSoundLibrary();
  document.getElementById('soundLibraryOverlay').classList.add('open');
}

function closeSoundLibrary() {
  document.getElementById('soundLibraryOverlay').classList.remove('open');
}

/* ─── Render ─── */
function renderSoundLibrary() {
  const list = document.getElementById('soundLibList');
  const footer = document.getElementById('soundLibFooter');
  const budget = SoundStore.getBudgetInfo();

  if (soundLibrary.length === 0) {
    list.innerHTML =
      '<div class="sound-lib-empty">' +
        '<div class="sound-lib-empty-icon">&#9835;</div>' +
        '<p>No custom sounds yet</p>' +
        '<button class="modal-btn primary" onclick="document.getElementById(\'soundLibraryFileInput\').click()">Upload your first sound</button>' +
      '</div>';
  } else {
    let html = '';
    for (const snd of soundLibrary) {
      html +=
        '<div class="sound-lib-item" data-id="' + snd.id + '">' +
          '<button class="sound-lib-preview-btn" title="Preview" aria-label="Preview &quot;' + escHtml(snd.name) + '&quot;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>' +
          '</button>' +
          '<div class="sound-lib-info">' +
            '<span class="sound-lib-name" title="Click to rename">' + escHtml(snd.name) + '</span>' +
            '<span class="sound-lib-meta">' + (snd.format || '').toUpperCase() + ' &middot; ' + formatFileSize(snd.size || 0) + '</span>' +
          '</div>' +
          '<button class="sound-lib-delete-btn" title="Delete" aria-label="Delete &quot;' + escHtml(snd.name) + '&quot;">&times;</button>' +
        '</div>';
    }
    list.innerHTML = html;
  }

  // Budget footer
  const used = getTotalSoundBytes();
  const countText = soundLibrary.length + ' of ' + budget.maxSounds + ' sounds';
  const sizeText = formatFileSize(used) + ' of ' + formatFileSize(budget.limit) + ' used';
  footer.querySelector('.sound-lib-budget').textContent = countText + '  \u00b7  ' + sizeText;
}

/* ─── Upload flow ─── */
function handleSoundLibraryUpload(files) {
  if (!files || files.length === 0) return;

  const budget = SoundStore.getBudgetInfo();
  const remaining = budget.maxSounds - soundLibrary.length;
  const toProcess = Array.from(files).slice(0, remaining);

  if (files.length > remaining) {
    showToast('Library full \u2014 only ' + remaining + ' slot(s) available', 'warning');
    if (remaining === 0) return;
  }

  // Process files sequentially via recursive chain
  processNextUpload(toProcess, 0);
}

function processNextUpload(files, idx) {
  if (idx >= files.length) {
    renderSoundLibrary();
    // Refresh any open sound dropdowns
    if (typeof refreshSoundDropdowns === 'function') refreshSoundDropdowns();
    return;
  }

  const file = files[idx];
  const budget = SoundStore.getBudgetInfo();

  // Validate type
  if (!file.type.match(/^audio\/(mpeg|wav|x-wav|mp3)$/)) {
    showToast(file.name + ': unsupported format (use MP3 or WAV)');
    processNextUpload(files, idx + 1);
    return;
  }

  // Validate size
  if (file.size > budget.perFileLimit) {
    showToast(file.name + ': too large (max ' + formatFileSize(budget.perFileLimit) + ')');
    processNextUpload(files, idx + 1);
    return;
  }

  // Validate total budget
  if (getTotalSoundBytes() + file.size > budget.limit) {
    showToast('Storage budget exceeded');
    return; // stop processing further files
  }

  // Read file, then prompt for name
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const defaultName = file.name.replace(/\.(mp3|wav)$/i, '');
    const format = file.name.match(/\.wav$/i) ? 'wav' : 'mp3';

    showNamePrompt(defaultName, name => {
      if (!name || !name.trim()) {
        processNextUpload(files, idx + 1);
        return;
      }

      const id = generateSoundId();
      const entry = {
        id,
        name: name.trim(),
        type: 'audio',
        format,
        size: file.size,
        dateAdded: Date.now()
      };

      SoundStore.save(id, dataUrl).then(() => {
        soundLibrary.push(entry);
        saveSoundLibrary();
        showToast('Added "' + entry.name + '"', 'success');
        processNextUpload(files, idx + 1);
      }).catch(() => {
        showToast('Failed to save ' + file.name);
        processNextUpload(files, idx + 1);
      });
    });
  };
  reader.onerror = () => {
    showToast('Failed to read ' + file.name);
    processNextUpload(files, idx + 1);
  };
  reader.readAsDataURL(file);
}

/* ─── Rename ─── */
function renameSoundInLibrary(id, newName) {
  const entry = soundLibrary.find(s => s.id === id);
  if (!entry || !newName || !newName.trim()) return;
  entry.name = newName.trim();
  saveSoundLibrary();
  renderSoundLibrary();
}

/* ─── Delete ─── */
function deleteSoundFromLibrary(id) {
  const idx = soundLibrary.findIndex(s => s.id === id);
  if (idx < 0) return;

  soundLibrary.splice(idx, 1);
  saveSoundLibrary();

  SoundStore.remove(id).catch(() => {});

  // Reset any segments referencing this sound
  const soundKey = 'custom:' + id;
  for (const sess of sessions) {
    for (const seg of sess.segments) {
      if (seg.soundKey === soundKey) {
        seg.soundKey = 'default';
      }
    }
  }
  saveSessions();

  renderSoundLibrary();
  if (typeof refreshSoundDropdowns === 'function') refreshSoundDropdowns();
  showToast('Sound deleted');
}

/* ─── Inline rename handler (delegated from list) ─── */
function startSoundRename(nameEl) {
  const item = nameEl.closest('.sound-lib-item');
  if (!item) return;
  const id = item.dataset.id;
  const entry = soundLibrary.find(s => s.id === id);
  if (!entry) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sound-lib-name-input';
  input.value = entry.name;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = () => {
    const val = input.value.trim() || entry.name;
    renameSoundInLibrary(id, val);
  };
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = entry.name; input.blur(); }
  });
}

/* ─── Migration from legacy customSounds ─── */
async function migrateLegacySounds() {
  // Already migrated if sound library key exists
  if (localStorage.getItem(STORAGE_SOUND_LIBRARY)) return;

  const oldKeys = Object.keys(customSounds);
  if (oldKeys.length === 0) {
    soundLibrary = [];
    saveSoundLibrary();
    return;
  }

  const keyMap = {}; // "custom:oldKey" → "custom:newId"
  let migrated = 0;

  for (const oldKey of oldKeys) {
    const oldVal = customSounds[oldKey];
    const dataUrl = typeof oldVal === 'string' ? oldVal : (oldVal && oldVal.data);
    const name = (typeof oldVal === 'object' && oldVal && oldVal.name) ? oldVal.name : 'Custom Sound';

    if (!dataUrl) continue;

    const id = generateSoundId();
    const format = dataUrl.startsWith('data:audio/wav') ? 'wav' : 'mp3';
    // Estimate size from base64 (rough: base64 length * 3/4)
    const sizeEstimate = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

    try {
      await SoundStore.save(id, dataUrl);
      soundLibrary.push({
        id,
        name,
        type: 'audio',
        format,
        size: sizeEstimate,
        dateAdded: Date.now()
      });
      keyMap['custom:' + oldKey] = 'custom:' + id;
      migrated++;
    } catch {
      // Skip this sound on error
    }
  }

  // Update segment references
  for (const sess of sessions) {
    for (const seg of sess.segments) {
      if (seg.soundKey && keyMap[seg.soundKey]) {
        seg.soundKey = keyMap[seg.soundKey];
      } else if (seg.soundKey && seg.soundKey.startsWith('custom:') && !keyMap[seg.soundKey]) {
        // Orphaned reference — reset to default
        seg.soundKey = 'default';
      }
    }
  }

  saveSoundLibrary();
  saveSessions();

  // Clean up legacy key
  try { localStorage.removeItem(STORAGE_SOUNDS); } catch {}
  customSounds = {};

  if (migrated > 0) {
    showToast('Migrated ' + migrated + ' custom sound' + (migrated !== 1 ? 's' : '') + ' to Sound Library');
  }
}
