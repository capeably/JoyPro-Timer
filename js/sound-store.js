/* ═══════════════════════════════════════════════════
   SOUND STORE — IndexedDB wrapper with localStorage fallback
   Pure data layer for audio binary storage.
   Any component can use this without knowing about sessions.
   ═══════════════════════════════════════════════════ */
const SoundStore = (() => {
  const DB_NAME = 'joypro_sounds';
  const DB_VERSION = 1;
  const STORE_NAME = 'audio';
  const LS_FALLBACK_KEY = 'joypro_sound_data';

  // Budget constants — IDB vs fallback
  const IDB_BUDGET   = 20 * 1024 * 1024;  // 20 MB
  const IDB_PER_FILE = 2 * 1024 * 1024;   // 2 MB
  const IDB_MAX      = 30;

  const LS_BUDGET    = 3 * 1024 * 1024;   // 3 MB
  const LS_PER_FILE  = 500 * 1024;        // 500 KB
  const LS_MAX       = 6;

  let db = null;
  let useIDB = false;

  function init() {
    return new Promise(resolve => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_NAME)) {
            d.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = e => {
          db = e.target.result;
          useIDB = true;
          resolve();
        };
        req.onerror = () => {
          useIDB = false;
          resolve();
        };
      } catch {
        useIDB = false;
        resolve();
      }
    });
  }

  function save(id, dataUrl) {
    if (useIDB) return idbPut(id, dataUrl);
    return lsPut(id, dataUrl);
  }

  function load(id) {
    if (useIDB) return idbGet(id);
    return lsGet(id);
  }

  function remove(id) {
    if (useIDB) return idbDel(id);
    return lsDel(id);
  }

  function getBudgetInfo() {
    return {
      limit:        useIDB ? IDB_BUDGET   : LS_BUDGET,
      perFileLimit: useIDB ? IDB_PER_FILE : LS_PER_FILE,
      maxSounds:    useIDB ? IDB_MAX      : LS_MAX,
      useIDB
    };
  }

  // ─── IndexedDB operations ───
  function idbPut(id, dataUrl) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id, data: dataUrl });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function idbGet(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  }

  function idbDel(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ─── localStorage fallback ───
  function lsReadAll() {
    try {
      return JSON.parse(localStorage.getItem(LS_FALLBACK_KEY) || '{}');
    } catch { return {}; }
  }

  function lsWriteAll(obj) {
    try { localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(obj)); }
    catch { /* quota exceeded — caller should check budget first */ }
  }

  function lsPut(id, dataUrl) {
    return new Promise(resolve => {
      const all = lsReadAll();
      all[id] = dataUrl;
      lsWriteAll(all);
      resolve();
    });
  }

  function lsGet(id) {
    return new Promise(resolve => {
      const all = lsReadAll();
      resolve(all[id] || null);
    });
  }

  function lsDel(id) {
    return new Promise(resolve => {
      const all = lsReadAll();
      delete all[id];
      lsWriteAll(all);
      resolve();
    });
  }

  return { init, save, load, remove, getBudgetInfo };
})();
