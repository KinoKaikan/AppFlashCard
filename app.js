/**
 * QuizMaster - Quizlet-Style Offline Flashcard & Quiz Web App
 * 
 * Features:
 * - DOCX parsing via Mammoth.js
 * - Automatic Bold formatting detection for correct answers
 * - Uniform typography rendering (strips bold when displaying options)
 * - Progressive Elimination / Mastery Tracking (localStorage persistence)
 * - Practice All Questions (480 Questions) Mode & 20 Unlearned Questions Mode
 * - View All Questions & Answers Detail Screen with Search & Filter
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    QUESTION_BANK: 'qm_question_bank',
    BANK_FILENAME: 'qm_bank_filename',
    WRONG_QUESTIONS: 'qm_wrong_questions',
    MASTERED_QUESTIONS: 'qm_mastered_questions',
    FLASHCARD_INDEX: 'qm_flashcard_index',
    THEME: 'qm_theme'
  };

  const APP_STATE = {
    questionBank: [],        // Full loaded array of parsed questions
    bankFilename: '',
    wrongQuestions: [],      // Array of questions in "Cần học lại"
    masteredQuestionIds: [], // Array of question IDs successfully remembered ("Đã thuộc")
    flashcardIndex: 0,       // Current card index in 3D Flashcard mode (independent progress)
    
    // Active session state
    currentSession: {
      mode: 'UNLEARNED_ONLY',
      questions: [],
      currentIndex: 0,
      userAnswers: [],
      score: 0
    }
  };

  // DOM element references (populated in initDOMElements)
  let DOM = {};

  function initDOMElements() {
    DOM = {
      // Views
      viewUpload: document.getElementById('view-upload'),
      viewQuiz: document.getElementById('view-quiz'),
      viewSummary: document.getElementById('view-summary'),
      viewWrong: document.getElementById('view-wrong'),
      viewDetail: document.getElementById('view-detail'),
      viewFlashcard: document.getElementById('view-flashcard'),

      // Theme Toggle
      themeToggleBtn: document.getElementById('theme-toggle-btn'),
      themeIcon: document.getElementById('theme-icon'),

      // Nav & Badges
      navLogoBtn: document.getElementById('nav-logo-btn'),
      btnNavWrong: document.getElementById('btn-nav-wrong'),
      navWrongCount: document.getElementById('nav-wrong-count'),

      // Upload View
      dropZone: document.getElementById('drop-zone'),
      fileInput: document.getElementById('file-input'),
      btnLoadSample: document.getElementById('btn-load-sample'),
      bankInfoCard: document.getElementById('bank-info-card'),
      bankFilename: document.getElementById('bank-filename'),
      bankCountBadge: document.getElementById('bank-count-badge'),
      totalBankBtnCount: document.getElementById('total-bank-btn-count'),
      
      // Mastery Progress DOM
      masteredCountText: document.getElementById('mastered-count-text'),
      totalBankText: document.getElementById('total-bank-text'),
      masteredPercentText: document.getElementById('mastered-percent-text'),
      masteryProgressFill: document.getElementById('mastery-progress-fill'),

      btnStartFlashcard: document.getElementById('btn-start-flashcard'),
      btnStartUnlearned: document.getElementById('btn-start-unlearned'),
      unlearnedCountBtn: document.getElementById('unlearned-count-btn'),
      btnStartQuiz: document.getElementById('btn-start-quiz'),
      btnViewAllQ: document.getElementById('btn-view-all-q'),
      btnStartWrong: document.getElementById('btn-start-wrong'),
      wrongCountBtn: document.getElementById('wrong-count-btn'),
      btnResetMastery: document.getElementById('btn-reset-mastery'),
      btnClearBank: document.getElementById('btn-clear-bank'),

      // Flashcard View DOM
      btnFcQuit: document.getElementById('btn-fc-quit'),
      fcProgressFill: document.getElementById('fc-progress-fill'),
      fcProgressText: document.getElementById('fc-progress-text'),
      flashcardCard: document.getElementById('flashcard-card'),
      fcFrontText: document.getElementById('fc-front-text'),
      fcBackText: document.getElementById('fc-back-text'),
      btnFcPrev: document.getElementById('btn-fc-prev'),
      btnFcFlip: document.getElementById('btn-fc-flip'),
      btnFcNext: document.getElementById('btn-fc-next'),
      btnFcReset: document.getElementById('btn-fc-reset'),

      // Detail View DOM
      btnDetailBack: document.getElementById('btn-detail-back'),
      detailSearchInput: document.getElementById('detail-search-input'),
      filterCountAll: document.getElementById('filter-count-all'),
      filterCountUnlearned: document.getElementById('filter-count-unlearned'),
      filterCountMastered: document.getElementById('filter-count-mastered'),
      detailQuestionsContainer: document.getElementById('detail-questions-container'),

      // Quiz View
      btnQuizQuit: document.getElementById('btn-quiz-quit'),
      quizModeLabel: document.getElementById('quiz-mode-label'),
      quizProgressFill: document.getElementById('quiz-progress-fill'),
      quizProgressText: document.getElementById('quiz-progress-text'),
      currentQIndex: document.getElementById('current-q-index'),
      qTextContent: document.getElementById('q-text-content'),
      optionsContainer: document.getElementById('options-container'),
      feedbackMsg: document.getElementById('feedback-msg'),
      btnNextQ: document.getElementById('btn-next-q'),
      btnFlagQ: document.getElementById('btn-flag-q'),
      flagIcon: document.getElementById('flag-icon'),

      // Summary View
      summaryDial: document.getElementById('summary-dial'),
      summaryPercent: document.getElementById('summary-percent'),
      statTotal: document.getElementById('stat-total'),
      statCorrect: document.getElementById('stat-correct'),
      statWrong: document.getElementById('stat-wrong'),
      btnSummaryRestart: document.getElementById('btn-summary-restart'),
      btnSummaryWrong: document.getElementById('btn-summary-wrong'),
      summaryWrongCount: document.getElementById('summary-wrong-count'),
      btnSummaryHome: document.getElementById('btn-summary-home'),

      // Wrong Answers View
      btnWrongPracticeNow: document.getElementById('btn-wrong-practice-now'),
      btnClearAllWrong: document.getElementById('btn-clear-all-wrong'),
      wrongListContainer: document.getElementById('wrong-list-container'),

      // Toast Container
      toastContainer: document.getElementById('toast-container')
    };
  }

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  function showToast(message, icon = 'info') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function shuffleArray(array) {
    const clone = [...array];
    for (let i = clone.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
  }

  function showView(viewElement) {
    const allViews = [
      document.getElementById('view-upload'),
      document.getElementById('view-quiz'),
      document.getElementById('view-summary'),
      document.getElementById('view-wrong'),
      document.getElementById('view-detail'),
      document.getElementById('view-flashcard')
    ];

    allViews.forEach(v => {
      if (v) v.classList.remove('active');
    });

    if (viewElement) {
      viewElement.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();
    }
  }

  // =========================================================================
  // LOCAL STORAGE & STATE PERSISTENCE
  // =========================================================================
  function loadStoredData() {
    try {
      const savedBank = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      const savedFilename = localStorage.getItem(STORAGE_KEYS.BANK_FILENAME);
      const savedWrong = localStorage.getItem(STORAGE_KEYS.WRONG_QUESTIONS);
      const savedMastered = localStorage.getItem(STORAGE_KEYS.MASTERED_QUESTIONS);

      if (savedBank) {
        APP_STATE.questionBank = JSON.parse(savedBank);
        APP_STATE.bankFilename = savedFilename || 'Bộ đề cương đã nạp';
      } else if (window.SAMPLE_QUESTIONS && window.SAMPLE_QUESTIONS.length > 0) {
        // Auto-load built-in sample if available
        APP_STATE.questionBank = window.SAMPLE_QUESTIONS;
        APP_STATE.bankFilename = '[VNR202] ĐỀ CƯƠNG THẦY NHỰTVH.docx';
        localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(window.SAMPLE_QUESTIONS));
        localStorage.setItem(STORAGE_KEYS.BANK_FILENAME, APP_STATE.bankFilename);
      }

      if (savedWrong) {
        APP_STATE.wrongQuestions = JSON.parse(savedWrong);
      }

      if (savedMastered) {
        APP_STATE.masteredQuestionIds = JSON.parse(savedMastered);
      }

      updateUIState();
    } catch (err) {
      console.error('Error loading stored data:', err);
    }
  }

  function saveQuestionBank(bank, filename) {
    APP_STATE.questionBank = bank;
    APP_STATE.bankFilename = filename;
    APP_STATE.masteredQuestionIds = []; // reset mastered on new upload
    localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(bank));
    localStorage.setItem(STORAGE_KEYS.BANK_FILENAME, filename);
    localStorage.setItem(STORAGE_KEYS.MASTERED_QUESTIONS, JSON.stringify([]));
    updateUIState();
  }

  function saveWrongQuestions() {
    localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(APP_STATE.wrongQuestions));
    updateUIState();
  }

  function saveMasteredQuestions() {
    localStorage.setItem(STORAGE_KEYS.MASTERED_QUESTIONS, JSON.stringify(APP_STATE.masteredQuestionIds));
    updateUIState();
  }

  function resetMasteryProgress() {
    APP_STATE.masteredQuestionIds = [];
    saveMasteredQuestions();
    showToast('Đã đặt lại tiến độ! Tất cả câu hỏi được đưa về trạng thái "Chưa thuộc".', 'rotate-ccw');
  }

  function clearQuestionBank() {
    APP_STATE.questionBank = [];
    APP_STATE.bankFilename = '';
    APP_STATE.masteredQuestionIds = [];
    APP_STATE.wrongQuestions = [];
    localStorage.removeItem(STORAGE_KEYS.QUESTION_BANK);
    localStorage.removeItem(STORAGE_KEYS.BANK_FILENAME);
    localStorage.removeItem(STORAGE_KEYS.WRONG_QUESTIONS);
    localStorage.removeItem(STORAGE_KEYS.MASTERED_QUESTIONS);
    updateUIState();
    showToast('Đã xóa bộ câu hỏi khỏi bộ nhớ local.', 'trash-2');
  }

  function updateUIState() {
    const bankSize = APP_STATE.questionBank.length;
    const wrongSize = APP_STATE.wrongQuestions.length;
    const masteredSize = APP_STATE.masteredQuestionIds.length;
    const unlearnedSize = Math.max(0, bankSize - masteredSize);

    // Nav Wrong button
    if (DOM.btnNavWrong) {
      if (wrongSize > 0) {
        DOM.btnNavWrong.style.display = 'inline-flex';
        if (DOM.navWrongCount) DOM.navWrongCount.textContent = wrongSize;
      } else {
        DOM.btnNavWrong.style.display = 'none';
      }
    }

    // Upload View Card & Mastery Bar
    if (DOM.bankInfoCard) {
      if (bankSize > 0) {
        DOM.bankInfoCard.style.display = 'block';
        if (DOM.bankFilename) DOM.bankFilename.textContent = APP_STATE.bankFilename;
        if (DOM.bankCountBadge) DOM.bankCountBadge.textContent = `${bankSize} câu`;
        if (DOM.totalBankBtnCount) DOM.totalBankBtnCount.textContent = bankSize;
        
        if (DOM.masteredCountText) DOM.masteredCountText.textContent = masteredSize;
        if (DOM.totalBankText) DOM.totalBankText.textContent = bankSize;
        const percent = Math.round((masteredSize / bankSize) * 100);
        if (DOM.masteredPercentText) DOM.masteredPercentText.textContent = `${percent}%`;
        if (DOM.masteryProgressFill) DOM.masteryProgressFill.style.width = `${percent}%`;

        if (DOM.unlearnedCountBtn) DOM.unlearnedCountBtn.textContent = unlearnedSize;

        if (DOM.filterCountAll) DOM.filterCountAll.textContent = bankSize;
        if (DOM.filterCountUnlearned) DOM.filterCountUnlearned.textContent = unlearnedSize;
        if (DOM.filterCountMastered) DOM.filterCountMastered.textContent = masteredSize;

        if (DOM.btnStartWrong) {
          if (wrongSize > 0) {
            DOM.btnStartWrong.style.display = 'inline-flex';
            if (DOM.wrongCountBtn) DOM.wrongCountBtn.textContent = wrongSize;
          } else {
            DOM.btnStartWrong.style.display = 'none';
          }
        }
      } else {
        DOM.bankInfoCard.style.display = 'none';
      }
    }
  }

  // =========================================================================
  // DETAIL QUESTIONS & ANSWERS VIEW ENGINE
  // =========================================================================
  function renderDetailQuestions(searchText = '', filterStatus = 'all') {
    const container = document.getElementById('detail-questions-container');
    if (!container) return;

    container.innerHTML = '';

    const query = searchText.toLowerCase().trim();

    let filtered = APP_STATE.questionBank.filter(q => {
      const isMastered = APP_STATE.masteredQuestionIds.includes(q.id);
      
      if (filterStatus === 'unlearned' && isMastered) return false;
      if (filterStatus === 'mastered' && !isMastered) return false;

      if (!query) return true;

      const qMatches = q.questionText.toLowerCase().includes(query);
      const optMatches = q.options.some(o => o.text.toLowerCase().includes(query));
      return qMatches || optMatches;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="search-x"></i></div>
          <h3>Không tìm thấy câu hỏi phù hợp!</h3>
          <p style="color: var(--text-muted); margin-top: 8px;">Thử nhập từ khóa khác hoặc chuyển bộ lọc.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    filtered.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'wrong-item-card';

      const isMastered = APP_STATE.masteredQuestionIds.includes(q.id);
      const badgeStyle = isMastered 
        ? 'background: var(--success-bg); color: var(--success);'
        : 'background: var(--primary-light); color: var(--primary);';
      const badgeText = isMastered ? '✓ Đã thuộc' : 'Chưa thuộc';

      let optionsHTML = '';
      q.options.forEach((opt, oIdx) => {
        const letter = labels[oIdx] || (oIdx + 1);
        const isCorrect = opt.isCorrect;
        
        optionsHTML += `
          <div class="detail-option-row ${isCorrect ? 'is-correct' : ''}">
            <div class="detail-option-badge">${letter}</div>
            <div style="flex: 1;">${escapeHTML(opt.text)} ${isCorrect ? '<strong style="color: var(--success); margin-left: 8px;">[ĐÁP ÁN ĐÚNG]</strong>' : ''}</div>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="wrong-item-header">
          <span>Câu ${q.originalNum || idx + 1}</span>
          <span class="badge" style="${badgeStyle}">${badgeText}</span>
        </div>
        <div class="wrong-item-q">${escapeHTML(q.questionText)}</div>
        <div style="margin-top: 12px;">
          ${optionsHTML}
        </div>
      `;

      container.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  function addMasteredQuestion(qId) {
    if (!APP_STATE.masteredQuestionIds.includes(qId)) {
      APP_STATE.masteredQuestionIds.push(qId);
      saveMasteredQuestions();
    }
  }

  function removeMasteredQuestion(qId) {
    APP_STATE.masteredQuestionIds = APP_STATE.masteredQuestionIds.filter(id => id !== qId);
    saveMasteredQuestions();
  }

  function addWrongQuestion(qObj) {
    const exists = APP_STATE.wrongQuestions.some(w => w.id === qObj.id);
    if (!exists) {
      APP_STATE.wrongQuestions.push(qObj);
      saveWrongQuestions();
    }
  }

  function removeWrongQuestion(qId) {
    APP_STATE.wrongQuestions = APP_STATE.wrongQuestions.filter(w => w.id !== qId);
    saveWrongQuestions();
    renderWrongList();
  }

  // =========================================================================
  // DOCX PARSER ENGINE
  // =========================================================================
  async function parseDocxFile(arrayBuffer, filename) {
    try {
      showToast('Đang phân tích file .docx...', 'loader');
      
      if (!window.mammoth) {
        throw new Error('Thư viện Mammoth.js chưa được tải!');
      }

      const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      const htmlText = result.value;

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      const questions = [];
      let currentQ = null;

      const qPattern = /^(Câu\s*\d+[:\.]?|\d+[:\.\)])\s*/i;
      const optPattern = /^([A-D])[\.\/\)]\s*/i;

      const elements = doc.querySelectorAll('p, h1, h2, h3, h4, div, li');

      elements.forEach((el) => {
        const fullText = el.textContent ? el.textContent.trim() : '';
        if (!fullText) return;

        const hasBoldTag = Boolean(el.querySelector('strong, b'));

        const matchQ = qPattern.test(fullText);
        const matchOpt = optPattern.exec(fullText);

        if (matchQ) {
          if (currentQ && currentQ.options.length > 0) {
            questions.push(currentQ);
          }

          currentQ = {
            id: 'q_' + (questions.length + 1) + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            originalNum: questions.length + 1,
            questionText: fullText,
            options: [],
            correctIndex: -1
          };
        } else if (matchOpt && currentQ) {
          const optionLabel = matchOpt[1].toUpperCase();
          const cleanOptionText = fullText.replace(/^([A-D])[\.\/\)]\s*/i, '').trim();

          const isCorrect = hasBoldTag;

          const optObj = {
            label: optionLabel,
            text: cleanOptionText,
            isCorrect: isCorrect
          };

          currentQ.options.push(optObj);

          if (isCorrect) {
            currentQ.correctIndex = currentQ.options.length - 1;
          }
        }
      });

      if (currentQ && currentQ.options.length > 0) {
        questions.push(currentQ);
      }

      if (questions.length === 0) {
        throw new Error('Không tìm thấy định dạng câu hỏi hợp lệ trong file!');
      }

      const validCount = questions.filter(q => q.correctIndex !== -1).length;
      
      saveQuestionBank(questions, filename);
      showToast(`Đã nạp thành công ${questions.length} câu hỏi! (${validCount} câu nhận diện đáp án bold)`, 'check-circle-2');
      showView(DOM.viewUpload);

    } catch (err) {
      console.error('Parsing error:', err);
      alert('Lỗi khi bóc tách file Word: ' + err.message);
    }
  }

  async function loadSampleFile() {
    try {
      if (window.SAMPLE_QUESTIONS && window.SAMPLE_QUESTIONS.length > 0) {
        saveQuestionBank(window.SAMPLE_QUESTIONS, '[VNR202] ĐỀ CƯƠNG THẦY NHỰTVH.docx');
        const validCount = window.SAMPLE_QUESTIONS.filter(q => q.correctIndex !== -1).length;
        showToast(`Đã nạp thành công ${window.SAMPLE_QUESTIONS.length} câu hỏi mẫu! (${validCount} câu nhận diện đáp án bold)`, 'check-circle-2');
        showView(DOM.viewUpload);
        return;
      }

      const response = await fetch('./[VNR202] ĐỀ CƯƠNG THẦY NHỰTVH.docx');
      if (!response.ok) {
        throw new Error('Không thể tải file mẫu qua fetch.');
      }
      const buffer = await response.arrayBuffer();
      await parseDocxFile(buffer, '[VNR202] ĐỀ CƯƠNG THẦY NHỰTVH.docx');
    } catch (err) {
      console.warn('Fetch sample failed, requesting file selection:', err);
      if (DOM.fileInput) DOM.fileInput.click();
    }
  }

  // =========================================================================
  // QUIZ ENGINE
  // =========================================================================

  function startQuizSession(mode = 'UNLEARNED_ONLY') {
    let sourcePool = [];
    let sessionQuestions = [];

    if (mode === 'WRONG_ONLY') {
      if (APP_STATE.wrongQuestions.length === 0) {
        showToast('Danh sách "Cần học lại" đang trống!', 'alert-circle');
        return;
      }
      sourcePool = [...APP_STATE.wrongQuestions];
      sessionQuestions = shuffleArray(sourcePool).slice(0, Math.min(20, sourcePool.length));
    } else if (mode === 'UNLEARNED_ONLY') {
      if (APP_STATE.questionBank.length === 0) {
        showToast('Vui lòng nạp file câu hỏi trước!', 'alert-circle');
        return;
      }
      sourcePool = APP_STATE.questionBank.filter(q => !APP_STATE.masteredQuestionIds.includes(q.id));

      if (sourcePool.length === 0) {
        showToast('Chúc mừng! Bạn đã thuộc 100% tất cả các câu hỏi trong bộ đề! 🎉', 'award');
        alert('🎉 CHÚC MỪNG BẠN!\n\nBạn đã hoàn thành dứt điểm 100% tất cả các câu hỏi trong bộ đề này.\n\nNếu muốn học lại từ đầu, hãy bấm nút "Reset Tiến Độ".');
        return;
      }
      sessionQuestions = shuffleArray(sourcePool).slice(0, Math.min(20, sourcePool.length));
    } else {
      // NORMAL / ALL - Practice ALL questions in dataset (e.g. 480 questions)
      if (APP_STATE.questionBank.length === 0) {
        showToast('Vui lòng nạp file câu hỏi trước!', 'alert-circle');
        return;
      }
      sourcePool = [...APP_STATE.questionBank];
      sessionQuestions = shuffleArray(sourcePool);
    }

    const processedQuestions = sessionQuestions.map(q => {
      const shuffledOpts = shuffleArray(q.options);
      const newCorrectIndex = shuffledOpts.findIndex(o => o.isCorrect);
      
      return {
        ...q,
        options: shuffledOpts,
        correctIndex: newCorrectIndex
      };
    });

    APP_STATE.currentSession = {
      mode: mode,
      questions: processedQuestions,
      currentIndex: 0,
      userAnswers: [],
      score: 0
    };

    if (mode === 'WRONG_ONLY') {
      if (DOM.quizModeLabel) DOM.quizModeLabel.textContent = 'Luyện Tập Câu Sai';
    } else if (mode === 'UNLEARNED_ONLY') {
      if (DOM.quizModeLabel) DOM.quizModeLabel.textContent = `Học Câu Chưa Thuộc (Còn ${sourcePool.length} câu)`;
    } else {
      if (DOM.quizModeLabel) DOM.quizModeLabel.textContent = `Luyện Tập Tất Cả (${sessionQuestions.length} Câu)`;
    }
    
    showView(DOM.viewQuiz);
    renderCurrentQuestion();
  }

  function renderCurrentQuestion() {
    const session = APP_STATE.currentSession;
    session.isAnswered = false; // reset answer lock for new question
    const currentQ = session.questions[session.currentIndex];
    const totalQ = session.questions.length;

    const percent = Math.round(((session.currentIndex + 1) / totalQ) * 100);
    if (DOM.quizProgressFill) DOM.quizProgressFill.style.width = `${percent}%`;
    if (DOM.quizProgressText) DOM.quizProgressText.textContent = `${session.currentIndex + 1} / ${totalQ}`;
    if (DOM.currentQIndex) DOM.currentQIndex.textContent = `${session.currentIndex + 1}`;

    const isWrongSaved = APP_STATE.wrongQuestions.some(w => w.id === currentQ.id);
    if (DOM.flagIcon) DOM.flagIcon.style.color = isWrongSaved ? 'var(--warning)' : 'inherit';

    if (DOM.qTextContent) DOM.qTextContent.textContent = currentQ.questionText;

    if (DOM.optionsContainer) {
      DOM.optionsContainer.innerHTML = '';
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

      currentQ.options.forEach((opt, idx) => {
        const optEl = document.createElement('div');
        optEl.className = 'option-item';
        optEl.setAttribute('data-index', idx);

        const labelLetter = labels[idx] || (idx + 1);

        optEl.innerHTML = `
          <div class="option-label">${labelLetter}</div>
          <div class="option-content">${escapeHTML(opt.text)}</div>
        `;

        optEl.addEventListener('click', () => handleOptionSelect(idx));
        DOM.optionsContainer.appendChild(optEl);
      });
    }

    if (DOM.feedbackMsg) {
      DOM.feedbackMsg.className = 'feedback-msg';
      DOM.feedbackMsg.innerHTML = '';
    }

    if (DOM.btnNextQ) DOM.btnNextQ.disabled = true;
  }

  function handleOptionSelect(selectedIndex) {
    const session = APP_STATE.currentSession;
    if (session.isAnswered) return; // Prevent selecting multiple times!
    session.isAnswered = true;

    const currentQ = session.questions[session.currentIndex];

    const optionEls = DOM.optionsContainer ? DOM.optionsContainer.querySelectorAll('.option-item') : [];
    optionEls.forEach(el => {
      el.classList.add('disabled');
      el.style.pointerEvents = 'none'; // Hard lock pointer clicks
    });

    const isCorrect = selectedIndex === currentQ.correctIndex;

    if (isCorrect) {
      session.score++;
      if (optionEls[selectedIndex]) optionEls[selectedIndex].classList.add('correct');
      if (DOM.feedbackMsg) {
        DOM.feedbackMsg.className = 'feedback-msg show correct-msg';
        DOM.feedbackMsg.innerHTML = `<i data-lucide="check-circle"></i> <span>Chính xác! 🎉 (Đã thuộc câu này)</span>`;
      }

      addMasteredQuestion(currentQ.id);

      if (session.mode === 'WRONG_ONLY') {
        removeWrongQuestion(currentQ.id);
      }
    } else {
      if (optionEls[selectedIndex]) optionEls[selectedIndex].classList.add('incorrect');
      if (currentQ.correctIndex !== -1 && optionEls[currentQ.correctIndex]) {
        optionEls[currentQ.correctIndex].classList.add('correct');
      }

      if (DOM.feedbackMsg) {
        DOM.feedbackMsg.className = 'feedback-msg show incorrect-msg';
        DOM.feedbackMsg.innerHTML = `<i data-lucide="x-circle"></i> <span>Chưa đúng! Đáp án đúng đã được hiển thị.</span>`;
      }

      removeMasteredQuestion(currentQ.id);
      addWrongQuestion(currentQ);
    }

    if (window.lucide) lucide.createIcons();

    session.userAnswers.push({
      questionId: currentQ.id,
      selectedIndex,
      isCorrect,
      correctIndex: currentQ.correctIndex
    });

    if (DOM.btnNextQ) DOM.btnNextQ.disabled = false;
  }

  function nextQuestion() {
    const session = APP_STATE.currentSession;
    if (session.currentIndex < session.questions.length - 1) {
      session.currentIndex++;
      renderCurrentQuestion();
    } else {
      showSummaryScreen();
    }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // =========================================================================
  // SUMMARY SCREEN
  // =========================================================================

  function showSummaryScreen() {
    const session = APP_STATE.currentSession;
    const total = session.questions.length;
    const correct = session.score;
    const wrong = total - correct;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    if (DOM.summaryPercent) DOM.summaryPercent.textContent = `${percentage}%`;
    if (DOM.summaryDial) DOM.summaryDial.style.setProperty('--percentage', percentage);

    if (DOM.statTotal) DOM.statTotal.textContent = total;
    if (DOM.statCorrect) DOM.statCorrect.textContent = correct;
    if (DOM.statWrong) DOM.statWrong.textContent = wrong;

    const wrongCount = APP_STATE.wrongQuestions.length;
    if (DOM.btnSummaryWrong) {
      if (wrongCount > 0) {
        DOM.btnSummaryWrong.style.display = 'inline-flex';
        if (DOM.summaryWrongCount) DOM.summaryWrongCount.textContent = wrongCount;
      } else {
        DOM.btnSummaryWrong.style.display = 'none';
      }
    }

    showView(DOM.viewSummary);

    if (percentage >= 80 && window.confetti) {
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  // =========================================================================
  // WRONG ANSWERS VIEW
  // =========================================================================

  function renderWrongList() {
    const wrongList = APP_STATE.wrongQuestions;
    if (!DOM.wrongListContainer) return;

    DOM.wrongListContainer.innerHTML = '';

    if (wrongList.length === 0) {
      DOM.wrongListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="sparkles"></i></div>
          <h3>Danh sách "Cần học lại" đang trống!</h3>
          <p style="color: var(--text-muted); margin-top: 8px;">Tuyệt vời! Bạn không có câu hỏi nào bị trả lời sai gần đây.</p>
        </div>
      `;
      if (DOM.btnWrongPracticeNow) DOM.btnWrongPracticeNow.disabled = true;
      if (window.lucide) lucide.createIcons();
      return;
    }

    if (DOM.btnWrongPracticeNow) DOM.btnWrongPracticeNow.disabled = false;

    wrongList.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'wrong-item-card';

      const correctOpt = q.options.find(o => o.isCorrect) || q.options[0];

      card.innerHTML = `
        <div class="wrong-item-header">
          <span>Câu ${idx + 1}</span>
          <button class="btn-quit" style="color: var(--danger);" onclick="QuizApp.removeWrong('${q.id}')">
            <i data-lucide="trash-2"></i> Xóa khỏi danh sách
          </button>
        </div>
        <div class="wrong-item-q">${escapeHTML(q.questionText)}</div>
        <div class="wrong-ans-box">
          <i data-lucide="check-circle-2"></i>
          <span>Đáp án đúng: <strong>${escapeHTML(correctOpt ? correctOpt.text : 'N/A')}</strong></span>
        </div>
      `;

      DOM.wrongListContainer.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  function openWrongAnswersView() {
    renderWrongList();
    showView(DOM.viewWrong);
  }

  function openDetailAnswersView() {
    renderDetailQuestions('', 'all');
    showView(document.getElementById('view-detail'));
  }

  // =========================================================================
  // 3D FLASHCARD ENGINE (Card Flip & Independent Progress)
  // =========================================================================

  function startFlashcardSession() {
    if (APP_STATE.questionBank.length === 0) {
      showToast('Vui lòng nạp file câu hỏi trước!', 'alert-circle');
      return;
    }

    const savedIndex = localStorage.getItem(STORAGE_KEYS.FLASHCARD_INDEX);
    if (savedIndex !== null) {
      APP_STATE.flashcardIndex = parseInt(savedIndex, 10) || 0;
      if (APP_STATE.flashcardIndex >= APP_STATE.questionBank.length) {
        APP_STATE.flashcardIndex = 0;
      }
    } else {
      APP_STATE.flashcardIndex = 0;
    }

    showView(document.getElementById('view-flashcard'));
    renderFlashcard();
  }

  function renderFlashcard() {
    const bank = APP_STATE.questionBank;
    const total = bank.length;
    if (total === 0) return;

    if (APP_STATE.flashcardIndex < 0) APP_STATE.flashcardIndex = 0;
    if (APP_STATE.flashcardIndex >= total) APP_STATE.flashcardIndex = total - 1;

    const idx = APP_STATE.flashcardIndex;
    const currentQ = bank[idx];

    const cardEl = document.getElementById('flashcard-card');
    if (cardEl) {
      cardEl.classList.remove('flipped');
    }

    const frontTextEl = document.getElementById('fc-front-text');
    if (frontTextEl) {
      frontTextEl.textContent = currentQ.questionText;
    }

    const backTextEl = document.getElementById('fc-back-text');
    if (backTextEl) {
      const correctOpt = currentQ.options.find(o => o.isCorrect) || currentQ.options[0];
      const correctText = correctOpt ? correctOpt.text : 'N/A';

      // Check if correct answer is "All above are correct" pattern
      const allAbovePattern = /(ba nhận định|cả 3|tất cả|cả ba|ba phương án|cả 3 nhận định|tất cả các)/i;
      const isAllAbove = allAbovePattern.test(correctText);

      if (isAllAbove && currentQ.options.length > 1) {
        // Build list of all preceding choices so learner can read all true statements
        let choicesListHTML = '';
        currentQ.options.forEach((opt, oIdx) => {
          if (opt !== correctOpt) {
            const letter = ['A', 'B', 'C', 'D', 'E', 'F'][oIdx] || (oIdx + 1);
            choicesListHTML += `<li class="fc-all-above-item"><strong>• ${letter}.</strong> ${escapeHTML(opt.text)}</li>`;
          }
        });

        backTextEl.innerHTML = `
          <div style="font-size: 1.05rem; font-weight: 700; color: #065f46; margin-bottom: 6px;">
            ✓ Cả 3 nhận định dưới đây đều ĐÚNG:
          </div>
          <ul class="fc-all-above-list">
            ${choicesListHTML}
          </ul>
          <div style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted); font-weight: 700; border-top: 1px dashed var(--success-border); padding-top: 6px;">
            ➜ ${escapeHTML(correctOpt.label ? correctOpt.label + '. ' : '')}${escapeHTML(correctText)}
          </div>
        `;
      } else {
        // Standard question: show ONLY the correct answer
        backTextEl.textContent = correctText;
      }
    }

    const progressFill = document.getElementById('fc-progress-fill');
    const progressText = document.getElementById('fc-progress-text');
    const percent = Math.round(((idx + 1) / total) * 100);

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${idx + 1} / ${total}`;

    const prevBtn = document.getElementById('btn-fc-prev');
    const nextBtn = document.getElementById('btn-fc-next');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === total - 1;
  }

  function flipFlashcard() {
    const cardEl = document.getElementById('flashcard-card');
    if (cardEl) {
      cardEl.classList.toggle('flipped');
    }
  }

  function nextFlashcard() {
    const total = APP_STATE.questionBank.length;
    if (APP_STATE.flashcardIndex < total - 1) {
      APP_STATE.flashcardIndex++;
      localStorage.setItem(STORAGE_KEYS.FLASHCARD_INDEX, APP_STATE.flashcardIndex);
      renderFlashcard();
    }
  }

  function prevFlashcard() {
    if (APP_STATE.flashcardIndex > 0) {
      APP_STATE.flashcardIndex--;
      localStorage.setItem(STORAGE_KEYS.FLASHCARD_INDEX, APP_STATE.flashcardIndex);
      renderFlashcard();
    }
  }

  function resetFlashcardProgress() {
    APP_STATE.flashcardIndex = 0;
    localStorage.setItem(STORAGE_KEYS.FLASHCARD_INDEX, 0);
    renderFlashcard();
    showToast('Đã quay về Thẻ số 1!', 'rotate-ccw');
  }

  // =========================================================================
  // EVENT LISTENERS & INITIALIZATION
  // =========================================================================

  function setupEventListeners() {
    if (DOM.themeToggleBtn) DOM.themeToggleBtn.addEventListener('click', toggleTheme);

    if (DOM.navLogoBtn) {
      DOM.navLogoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView(DOM.viewUpload);
      });
    }
    if (DOM.btnSummaryHome) DOM.btnSummaryHome.addEventListener('click', () => showView(DOM.viewUpload));
    if (DOM.btnQuizQuit) {
      DOM.btnQuizQuit.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn thoát phiên học hiện tại?')) {
          showView(DOM.viewUpload);
        }
      });
    }

    if (DOM.btnNavWrong) DOM.btnNavWrong.addEventListener('click', openWrongAnswersView);

    const dropZone = DOM.dropZone;
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.classList.remove('dragover');
        }, false);
      });

      dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
          handleFileSelect(files[0]);
        }
      });
    }

    if (DOM.fileInput) {
      DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFileSelect(e.target.files[0]);
        }
      });
    }

    if (DOM.btnLoadSample) DOM.btnLoadSample.addEventListener('click', loadSampleFile);

    // Bank Action Buttons
    if (DOM.btnStartFlashcard) DOM.btnStartFlashcard.addEventListener('click', startFlashcardSession);
    if (DOM.btnStartUnlearned) DOM.btnStartUnlearned.addEventListener('click', () => startQuizSession('UNLEARNED_ONLY'));
    if (DOM.btnStartQuiz) DOM.btnStartQuiz.addEventListener('click', () => startQuizSession('NORMAL'));
    if (DOM.btnViewAllQ) DOM.btnViewAllQ.addEventListener('click', openDetailAnswersView);
    if (DOM.btnStartWrong) DOM.btnStartWrong.addEventListener('click', () => startQuizSession('WRONG_ONLY'));
    if (DOM.btnResetMastery) {
      DOM.btnResetMastery.addEventListener('click', () => {
        if (confirm('Bạn có muốn đặt lại tiến độ? Tất cả câu hỏi sẽ được đưa về trạng thái "Chưa thuộc".')) {
          resetMasteryProgress();
        }
      });
    }
    if (DOM.btnClearBank) {
      DOM.btnClearBank.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa bộ câu hỏi hiện tại?')) {
          clearQuestionBank();
        }
      });
    }

    // Flashcard View Controls
    if (DOM.btnFcQuit) DOM.btnFcQuit.addEventListener('click', () => showView(DOM.viewUpload));
    if (DOM.flashcardCard) DOM.flashcardCard.addEventListener('click', flipFlashcard);
    if (DOM.btnFcPrev) DOM.btnFcPrev.addEventListener('click', prevFlashcard);
    if (DOM.btnFcNext) DOM.btnFcNext.addEventListener('click', nextFlashcard);
    if (DOM.btnFcFlip) DOM.btnFcFlip.addEventListener('click', flipFlashcard);
    if (DOM.btnFcReset) DOM.btnFcReset.addEventListener('click', resetFlashcardProgress);

    // Keyboard Navigation Support for Flashcard mode
    document.addEventListener('keydown', (e) => {
      const flashcardView = document.getElementById('view-flashcard');
      if (flashcardView && flashcardView.classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
          prevFlashcard();
        } else if (e.key === 'ArrowRight') {
          nextFlashcard();
        } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          flipFlashcard();
        }
      }
    });

    // Detail View Event Listeners
    if (DOM.btnDetailBack) {
      DOM.btnDetailBack.addEventListener('click', () => showView(DOM.viewUpload));
    }
    if (DOM.detailSearchInput) {
      DOM.detailSearchInput.addEventListener('input', (e) => {
        const activePill = document.querySelector('.filter-pill.active');
        const filterStatus = activePill ? activePill.getAttribute('data-filter') : 'all';
        renderDetailQuestions(e.target.value, filterStatus);
      });
    }

    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filterStatus = pill.getAttribute('data-filter');
        const query = DOM.detailSearchInput ? DOM.detailSearchInput.value : '';
        renderDetailQuestions(query, filterStatus);
      });
    });

    // Quiz Controls
    if (DOM.btnNextQ) DOM.btnNextQ.addEventListener('click', nextQuestion);
    if (DOM.btnFlagQ) {
      DOM.btnFlagQ.addEventListener('click', () => {
        const currentQ = APP_STATE.currentSession.questions[APP_STATE.currentSession.currentIndex];
        const isWrongSaved = APP_STATE.wrongQuestions.some(w => w.id === currentQ.id);
        if (isWrongSaved) {
          removeWrongQuestion(currentQ.id);
          if (DOM.flagIcon) DOM.flagIcon.style.color = 'inherit';
          showToast('Đã bỏ đánh dấu câu hỏi này.', 'bookmark');
        } else {
          addWrongQuestion(currentQ);
          if (DOM.flagIcon) DOM.flagIcon.style.color = 'var(--warning)';
          showToast('Đã đánh dấu câu hỏi vào "Cần học lại".', 'bookmark-check');
        }
      });
    }

    if (DOM.btnSummaryRestart) DOM.btnSummaryRestart.addEventListener('click', () => startQuizSession('UNLEARNED_ONLY'));
    if (DOM.btnSummaryWrong) DOM.btnSummaryWrong.addEventListener('click', () => startQuizSession('WRONG_ONLY'));

    if (DOM.btnWrongPracticeNow) DOM.btnWrongPracticeNow.addEventListener('click', () => startQuizSession('WRONG_ONLY'));
    if (DOM.btnClearAllWrong) {
      DOM.btnClearAllWrong.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa toàn bộ danh sách Cần học lại?')) {
          APP_STATE.wrongQuestions = [];
          saveWrongQuestions();
          renderWrongList();
          showToast('Đã xóa tất cả câu hỏi sai.', 'trash-2');
        }
      });
    }
  }

  function handleFileSelect(file) {
    if (!file.name.endsWith('.docx')) {
      alert('Vui lòng chọn file định dạng .docx của Microsoft Word!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      parseDocxFile(buffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  // Silent background visitor ping (non-blocking)
  function pingVisitorCount() {
    try {
      fetch('https://api.counterapi.dev/v1/kinokaikan-flashcard/visits/up')
        .catch(err => {});
    } catch(e) {}
  }

  // App Initialization
  function init() {
    initTheme();
    initDOMElements();
    loadStoredData();
    setupEventListeners();
    pingVisitorCount();
    
    // Global exposure for inline onclick fallback & debug
    window.QuizApp = {
      removeWrong: removeWrongQuestion,
      openDetail: openDetailAnswersView,
      startAll: () => startQuizSession('NORMAL'),
      startUnlearned: () => startQuizSession('UNLEARNED_ONLY'),
      startFlashcard: startFlashcardSession,
      flipFlashcard: flipFlashcard,
      nextFlashcard: nextFlashcard,
      prevFlashcard: prevFlashcard,
      resetFlashcardProgress: resetFlashcardProgress
    };

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();
