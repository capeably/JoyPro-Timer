/* ═══════════════════════════════════════════════════
   POPOUT WINDOW
   ═══════════════════════════════════════════════════ */
let popoutWindow = null;

function getPopoutHTML(theme) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<title>JoyPro Timer</title>
<link rel="icon" type="image/png" href="joypro-logo-dark.png">
<link href="https://fonts.googleapis.com/css2?family=Abhaya+Libre:wght@600&family=DM+Mono:wght@400;500&family=Rethink+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --coral: #f19766; --teal: #2a7c73; --navy: #07273F;
  --charcoal: #3d474d; --cream: #f6f3ee;
  --bg: var(--cream); --text: var(--charcoal);
  --text-muted: #8a9099; --accent: var(--coral); --border: #ddd6cc;
}
[data-theme="dark"] {
  --bg: var(--navy); --text: var(--cream);
  --text-muted: #8a9aaa; --accent: var(--coral); --border: #1e3a52;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: 'Rethink Sans', sans-serif;
  background: var(--bg); color: var(--text);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 8px 16px; user-select: none;
  transition: background 0.3s, color 0.3s;
}
.popout-segment {
  font-family: 'Abhaya Libre', serif; font-weight: 600;
  font-size: clamp(14px, min(7vw, 14vh), 80px);
  text-align: center; margin-bottom: 0.5vh;
  display: flex; align-items: center; justify-content: center;
  gap: clamp(4px, 1.5vw, 16px);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.popout-status {
  width: clamp(6px, 1.8vw, 16px); height: clamp(6px, 1.8vw, 16px);
  border-radius: 50%;
  background: var(--text-muted); flex-shrink: 0; opacity: 0.5;
}
.popout-status.playing {
  background: var(--accent); opacity: 1;
  animation: pulse 1.5s ease-in-out infinite;
}
.popout-status.paused {
  background: var(--accent); opacity: 0.6;
}
@keyframes pulse {
  0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
}
.popout-time {
  font-family: 'DM Mono', monospace;
  font-size: clamp(18px, min(9vw, 18vh), 100px);
  font-weight: 500; letter-spacing: 0.05em; text-align: center;
}
</style>
</head>
<body>
<div class="popout-segment">
  <span class="popout-status" id="popoutStatus"></span>
  <span id="popoutSegment">Loading...</span>
</div>
<div class="popout-time" id="popoutTime">--:--</div>
</body>
</html>`;
}

function openPopout() {
  if (popoutWindow && !popoutWindow.closed) {
    popoutWindow.focus();
    return;
  }

  const w = 380, h = 130;
  const left = (window.screenX || window.screenLeft) + window.outerWidth - w - 30;
  const top = (window.screenY || window.screenTop) + 30;

  popoutWindow = window.open('', 'joypro_popout',
    'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top +
    ',toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=no');

  if (!popoutWindow) {
    showToast('Popout blocked — please allow popups for this site');
    return;
  }

  const doc = popoutWindow.document;
  doc.open();
  doc.write(getPopoutHTML(state.theme));
  doc.close();

  popoutWindow.addEventListener('load', () => syncPopout());
  syncPopout();

  popoutWindow.addEventListener('beforeunload', () => { popoutWindow = null; });
  showToast('Popout window opened');
}

function syncPopout() {
  if (!popoutWindow || popoutWindow.closed) { popoutWindow = null; return; }
  try {
    const doc = popoutWindow.document;
    const segmentEl = doc.getElementById('popoutSegment');
    const timeEl = doc.getElementById('popoutTime');
    const statusEl = doc.getElementById('popoutStatus');
    if (segmentEl) segmentEl.textContent = currentTitle.textContent;
    if (timeEl) timeEl.textContent = formatTime(state.timerSeconds);
    if (statusEl) {
      statusEl.className = 'popout-status' + (running ? ' playing' : (state.timerSeconds < state.timerTotal ? ' paused' : ''));
    }
    doc.documentElement.setAttribute('data-theme', state.theme);
    if (running) {
      popoutWindow.document.title = formatTime(state.timerSeconds) + ' — ' + currentTitle.textContent;
    } else {
      popoutWindow.document.title = 'JoyPro Timer';
    }
  } catch(e) {}
}
