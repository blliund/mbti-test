import { questions, mbtiResults } from './data.js';

// Application State
const state = {
  currentIndex: 0,
  answers: new Array(questions.length).fill(null),
  isTransitioning: false,
  theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
};

// DOM Elements
const views = {
  intro: document.getElementById('view-intro'),
  test: document.getElementById('view-test'),
  result: document.getElementById('view-result')
};

const progressWrapper = document.getElementById('progress-wrapper');
const progressBarFill = document.getElementById('progress-bar-fill');
const overlay = document.getElementById('calculating-overlay');
const toastEl = document.getElementById('toast');
const themeToggleBtn = document.getElementById('theme-toggle');
const navHomeBtn = document.getElementById('nav-home-btn');

// Test UI Elements
const questionStep = document.getElementById('question-step');
const questionCategory = document.getElementById('question-category');
const questionTitle = document.getElementById('question-title');
const questionDesc = document.getElementById('question-desc');
const optionA = document.getElementById('option-a');
const optionB = document.getElementById('option-b');
const optionAText = document.getElementById('option-a-text');
const optionASub = document.getElementById('option-a-sub');
const optionBText = document.getElementById('option-b-text');
const optionBSub = document.getElementById('option-b-sub');
const prevBtn = document.getElementById('prev-btn');

// Result UI Elements
const resultTypeCode = document.getElementById('result-type-code');
const resultTagline = document.getElementById('result-tagline');
const resultQuote = document.getElementById('result-quote');
const resultSummary = document.getElementById('result-summary');
const resultDetailsText = document.getElementById('result-details-text');
const resultBestMatch = document.getElementById('result-best-match');

const metricLabels = [
  document.getElementById('metric-label-0'),
  document.getElementById('metric-label-1'),
  document.getElementById('metric-label-2')
];
const metricVals = [
  document.getElementById('metric-val-0'),
  document.getElementById('metric-val-1'),
  document.getElementById('metric-val-2')
];

// Balance Bars
const barEI = document.getElementById('bar-EI');
const barSN = document.getElementById('bar-SN');
const barTF = document.getElementById('bar-TF');
const barJP = document.getElementById('bar-JP');
const scoreLabelE = document.getElementById('score-label-E');
const scoreLabelI = document.getElementById('score-label-I');
const scoreLabelS = document.getElementById('score-label-S');
const scoreLabelN = document.getElementById('score-label-N');
const scoreLabelT = document.getElementById('score-label-T');
const scoreLabelF = document.getElementById('score-label-F');
const scoreLabelJ = document.getElementById('score-label-J');
const scoreLabelP = document.getElementById('score-label-P');

// Buttons
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const shareBtn = document.getElementById('share-btn');

// ==========================================
// Theme Initialization
// ==========================================
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

applyTheme(state.theme);

themeToggleBtn.addEventListener('click', () => {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
});

// ==========================================
// Navigation & View Switching
// ==========================================
function switchView(targetViewKey) {
  Object.keys(views).forEach(key => {
    views[key].classList.remove('active');
    views[key].classList.add('hidden');
  });

  const activeView = views[targetViewKey];
  activeView.classList.remove('hidden');
  // force reflow for smooth transition
  void activeView.offsetWidth;
  activeView.classList.add('active');

  // Progress Bar Visibility
  if (targetViewKey === 'test') {
    progressWrapper.classList.remove('hidden');
  } else {
    progressWrapper.classList.add('hidden');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// Progress Calculation
// ==========================================
function updateProgress() {
  const percent = ((state.currentIndex) / questions.length) * 100;
  progressBarFill.style.width = `${percent}%`;
}

// ==========================================
// Question Rendering
// ==========================================
function renderQuestion(index) {
  const q = questions[index];
  if (!q) return;

  questionStep.textContent = `Question ${String(index + 1).padStart(2, '0')} of ${questions.length}`;
  questionCategory.textContent = q.category;
  questionTitle.textContent = q.title;
  questionDesc.textContent = q.desc;

  optionAText.textContent = q.options[0].text;
  optionASub.textContent = q.options[0].subtext;
  optionBText.textContent = q.options[1].text;
  optionBSub.textContent = q.options[1].subtext;

  // Selected state highlight if already answered
  optionA.classList.remove('selected');
  optionB.classList.remove('selected');

  if (state.answers[index] !== null) {
    const selectedType = state.answers[index];
    if (q.options[0].type === selectedType) {
      optionA.classList.add('selected');
    } else if (q.options[1].type === selectedType) {
      optionB.classList.add('selected');
    }
  }

  // Previous button status
  prevBtn.disabled = index === 0;

  updateProgress();
}

// ==========================================
// Option Selection Flow
// ==========================================
function handleSelectOption(optionIndex) {
  if (state.isTransitioning) return;
  state.isTransitioning = true;

  const currentQ = questions[state.currentIndex];
  const selectedType = currentQ.options[optionIndex].type;
  state.answers[state.currentIndex] = selectedType;

  // Visual selection feedback
  if (optionIndex === 0) {
    optionA.classList.add('selected');
    optionB.classList.remove('selected');
  } else {
    optionB.classList.add('selected');
    optionA.classList.remove('selected');
  }

  // Short delay for Apple-like smooth responsiveness
  setTimeout(() => {
    if (state.currentIndex < questions.length - 1) {
      state.currentIndex++;
      renderQuestion(state.currentIndex);
      state.isTransitioning = false;
    } else {
      // Completed all 12 questions
      updateProgress();
      progressBarFill.style.width = '100%';
      showCalculatingScreen();
    }
  }, 260);
}

// Go to previous question
function handlePrev() {
  if (state.currentIndex > 0 && !state.isTransitioning) {
    state.currentIndex--;
    renderQuestion(state.currentIndex);
  }
}

// ==========================================
// Calculation & Result Processing
// ==========================================
function calculateResult() {
  const counts = {
    E: 0, I: 0,
    S: 0, N: 0,
    T: 0, F: 0,
    J: 0, P: 0
  };

  state.answers.forEach(ans => {
    if (ans && counts[ans] !== undefined) {
      counts[ans]++;
    }
  });

  const type = [
    counts.E >= counts.I ? 'E' : 'I',
    counts.S >= counts.N ? 'S' : 'N',
    counts.T >= counts.F ? 'T' : 'F',
    counts.J >= counts.P ? 'J' : 'P'
  ].join('');

  return { type, counts };
}

function showCalculatingScreen() {
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  // Apple presentation pause (700ms)
  setTimeout(() => {
    const { type, counts } = calculateResult();
    renderResult(type, counts);

    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    switchView('result');
    state.isTransitioning = false;
  }, 750);
}

function renderResult(type, counts) {
  const data = mbtiResults[type] || mbtiResults.INTJ;

  resultTypeCode.textContent = type;
  resultTagline.textContent = data.tagline;
  resultQuote.textContent = `"${data.quote}"`;
  resultSummary.textContent = data.summary;
  resultDetailsText.textContent = data.details;
  resultBestMatch.textContent = data.bestMatch;

  // Highlights
  data.highlights.forEach((item, idx) => {
    if (metricLabels[idx] && metricVals[idx]) {
      metricLabels[idx].textContent = item.label;
      metricVals[idx].textContent = item.value;
    }
  });

  // Calculate percentages (각 차원당 총 3문항)
  // E vs I (3문항)
  const ePercent = Math.round((counts.E / 3) * 100);
  const iPercent = 100 - ePercent;
  scoreLabelE.textContent = `외향 (E) ${ePercent}%`;
  scoreLabelI.textContent = `내향 (I) ${iPercent}%`;
  barEI.style.width = `${ePercent}%`;

  // S vs N
  const sPercent = Math.round((counts.S / 3) * 100);
  const nPercent = 100 - sPercent;
  scoreLabelS.textContent = `감각 (S) ${sPercent}%`;
  scoreLabelN.textContent = `직관 (N) ${nPercent}%`;
  barSN.style.width = `${sPercent}%`;

  // T vs F
  const tPercent = Math.round((counts.T / 3) * 100);
  const fPercent = 100 - tPercent;
  scoreLabelT.textContent = `사고 (T) ${tPercent}%`;
  scoreLabelF.textContent = `감정 (F) ${fPercent}%`;
  barTF.style.width = `${tPercent}%`;

  // J vs P
  const jPercent = Math.round((counts.J / 3) * 100);
  const pPercent = 100 - jPercent;
  scoreLabelJ.textContent = `판단 (J) ${jPercent}%`;
  scoreLabelP.textContent = `인식 (P) ${pPercent}%`;
  barJP.style.width = `${jPercent}%`;

  // Render 3 Celebrities
  const celebsGrid = document.getElementById('celebs-grid');
  if (celebsGrid && Array.isArray(data.celebrities)) {
    celebsGrid.innerHTML = data.celebrities.map(celeb => `
      <div class="celeb-item">
        <div class="celeb-top">
          <div class="celeb-avatar-wrap">
            <div class="celeb-avatar">${celeb.name.trim().charAt(0)}</div>
            <div class="celeb-info">
              <span class="celeb-name">${celeb.name}</span>
              <span class="celeb-role">${celeb.role}</span>
            </div>
          </div>
        </div>
        <div class="celeb-badge">${celeb.badge}</div>
      </div>
    `).join('');
  }
}

// ==========================================
// Toast Notification
// ==========================================
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  toastEl.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.classList.add('hidden'), 300);
  }, 2200);
}

// ==========================================
// Event Listeners
// ==========================================
// Start test
startBtn.addEventListener('click', () => {
  state.currentIndex = 0;
  state.answers.fill(null);
  renderQuestion(0);
  switchView('test');
});

// Restart test
restartBtn.addEventListener('click', () => {
  state.currentIndex = 0;
  state.answers.fill(null);
  switchView('intro');
});

// Home logo button
navHomeBtn.addEventListener('click', () => {
  if (views.test.classList.contains('active')) {
    if (confirm('테스트를 중단하고 처음 화면으로 돌아가시겠습니까?')) {
      switchView('intro');
    }
  } else {
    switchView('intro');
  }
});

navHomeBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    navHomeBtn.click();
  }
});

// Options click
optionA.addEventListener('click', () => handleSelectOption(0));
optionB.addEventListener('click', () => handleSelectOption(1));

// Prev button
prevBtn.addEventListener('click', handlePrev);

// Share Result
shareBtn.addEventListener('click', async () => {
  const currentResultType = resultTypeCode.textContent;
  const shareTitle = `내 MBTI 결과는 [${currentResultType}] - ${resultTagline.textContent}`;
  const shareUrl = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: `${shareTitle}\n당신의 고유한 성향을 마주해보세요.`,
        url: shareUrl
      });
      return;
    } catch {
      // Fallback to clipboard
    }
  }

  // Fallback to clipboard copy
  navigator.clipboard.writeText(`${shareTitle}\n${shareUrl}`).then(() => {
    showToast('결과 내용과 링크가 클립보드에 복사되었습니다.');
  }).catch(() => {
    showToast('클립보드 복사에 실패했습니다.');
  });
});

// Keyboard shortcuts (1, 2 for options, Left Arrow for prev)
window.addEventListener('keydown', (e) => {
  if (!views.test.classList.contains('active')) return;

  if (e.key === '1') {
    handleSelectOption(0);
  } else if (e.key === '2') {
    handleSelectOption(1);
  } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
    if (state.currentIndex > 0) {
      handlePrev();
    }
  }
});
