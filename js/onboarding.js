/* ═══════════════════════════════════════════════════
   ONBOARDING & CONTEXTUAL HINTS
   ═══════════════════════════════════════════════════ */
const ONBOARDING_KEY = 'joypro_onboarded';
const HINTS_KEY = 'joypro_hints';
const TOTAL_SLIDES = 4;

let currentSlide = 0;
let shownHints = {};

/* ─── First-time welcome overlay ─── */
function checkOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) return;
  showOnboarding();
}

function showOnboarding() {
  const modal = document.getElementById('onboardingModal');
  const dotsEl = document.getElementById('onboardingDots');
  const nextBtn = document.getElementById('onboardingNext');
  const skipBtn = document.getElementById('onboardingSkip');

  currentSlide = 0;

  // Build dot indicators
  dotsEl.innerHTML = '';
  for (let i = 0; i < TOTAL_SLIDES; i++) {
    const dot = document.createElement('span');
    dot.className = 'onboarding-dot' + (i === 0 ? ' active' : '');
    dot.dataset.slide = i;
    dotsEl.appendChild(dot);
  }

  updateOnboardingSlide(modal);
  modal.classList.add('open');

  nextBtn.onclick = () => {
    currentSlide++;
    if (currentSlide >= TOTAL_SLIDES) {
      closeOnboarding();
      return;
    }
    updateOnboardingSlide(modal);
  };

  skipBtn.onclick = () => closeOnboarding();

  // Close on backdrop click
  modal.addEventListener('click', e => {
    if (e.target === modal) closeOnboarding();
  });
}

function updateOnboardingSlide(modal) {
  const slides = modal.querySelectorAll('.onboarding-slide');
  const dots = modal.querySelectorAll('.onboarding-dot');
  const nextBtn = document.getElementById('onboardingNext');

  slides.forEach((s, i) => {
    s.style.display = i === currentSlide ? '' : 'none';
  });
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === currentSlide);
  });

  nextBtn.textContent = currentSlide === TOTAL_SLIDES - 1 ? 'Get Started' : 'Next';
}

function closeOnboarding() {
  const modal = document.getElementById('onboardingModal');
  modal.classList.remove('open');
  localStorage.setItem(ONBOARDING_KEY, '1');
}

/* ─── Help modal ─── */
function openHelpModal() {
  document.getElementById('helpModal').classList.add('open');
}

function closeHelpModal() {
  document.getElementById('helpModal').classList.remove('open');
}

/* ─── Contextual first-use hints ─── */
function loadHints() {
  try {
    const raw = localStorage.getItem(HINTS_KEY);
    if (raw) shownHints = JSON.parse(raw);
  } catch(e) {}
}

function saveHintShown(hintId) {
  shownHints[hintId] = true;
  try { localStorage.setItem(HINTS_KEY, JSON.stringify(shownHints)); } catch(e) {}
}

function showHintOnce(hintId, message) {
  if (shownHints[hintId]) return;
  saveHintShown(hintId);
  showToast(message, 'tip');
}

function setupContextualHints() {
  loadHints();

  // Hint: double-click to edit time (on first hover while paused)
  const timerDigits = document.getElementById('timerDigits');
  if (timerDigits) {
    timerDigits.addEventListener('mouseenter', function onFirstTimerHover() {
      if (!running) {
        showHintOnce('timer_edit', 'Tip: Double-click the time to edit it');
      }
      // Only fire once per session — remove after first trigger
      timerDigits.removeEventListener('mouseenter', onFirstTimerHover);
    });
  }

  // Hint: segment interactions (on first panel expand)
  const expandBtn = document.getElementById('sessionExpandBtn');
  if (expandBtn) {
    expandBtn.addEventListener('click', function onFirstExpand() {
      showHintOnce('segment_interact', 'Tip: Click a segment to jump to it, drag to reorder');
      expandBtn.removeEventListener('click', onFirstExpand);
    });
  }
}
