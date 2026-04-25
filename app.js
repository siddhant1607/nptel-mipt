/* ============================================
   MIPT Quiz App - JavaScript
   ============================================ */

let DATA = null;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Week topic summaries for the cards
const WEEK_TOPICS = {
    1: 'Raja Ram Mohan Roy & Introduction',
    2: 'Rabindranath Tagore',
    3: 'Sri Aurobindo',
    4: 'Swami Vivekananda',
    5: 'Mahatma Gandhi',
    6: 'Muhammad Iqbal',
    7: 'V.D. Savarkar',
    8: 'Jawaharlal Nehru',
    9: 'B.R. Ambedkar',
    10: 'Ambedkar & Pandita Ramabai',
    11: 'Ramabai & Ram Manohar Lohia',
    12: 'Lohia & Revision'
};

// --- Data Loading ---
async function loadData() {
    try {
        const resp = await fetch('questions_data.json');
        DATA = await resp.json();
        init();
    } catch (e) {
        console.error('Failed to load questions:', e);
        document.getElementById('main-content').innerHTML = `
            <div style="text-align:center;padding:80px 20px;">
                <h2>Failed to load questions</h2>
                <p style="color:var(--text-secondary);margin-top:8px;">Make sure questions_data.json is in the same directory.</p>
            </div>`;
    }
}

// --- Router ---
function init() {
    window.addEventListener('hashchange', route);
    route();
}

function route() {
    const hash = location.hash || '#/';
    const main = document.getElementById('main-content');
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash) {
            link.classList.add('active');
        }
    });

    if (hash === '#/' || hash === '') {
        document.querySelector('[data-nav="home"]').classList.add('active');
        renderHome(main);
    } else if (hash === '#/study') {
        renderStudy(main, null);
    } else if (hash.startsWith('#/study/')) {
        const week = parseInt(hash.split('/')[2]);
        renderStudy(main, week);
    } else if (hash === '#/practice-all') {
        renderQuiz(main, 'all');
    } else if (hash.startsWith('#/quiz/')) {
        const week = parseInt(hash.split('/')[2]);
        renderQuiz(main, week);
    } else {
        renderHome(main);
    }
}

// --- Home Page ---
function renderHome(container) {
    const totalQ = Object.values(DATA).reduce((sum, w) => sum + w.questions.length, 0);
    const weeks = Object.keys(DATA).length;
    
    let cardsHTML = '';
    const sortedKeys = Object.keys(DATA).sort((a, b) => DATA[a].weekNum - DATA[b].weekNum);
    
    for (const key of sortedKeys) {
        const week = DATA[key];
        const topic = WEEK_TOPICS[week.weekNum] || '';
        cardsHTML += `
        <div class="assignment-card" id="card-week-${week.weekNum}">
            <span class="card-week">Week ${week.weekNum}</span>
            <div class="card-title">${topic}</div>
            <div class="card-meta">${week.questions.length} questions</div>
            <div class="card-actions">
                <a href="#/quiz/${week.weekNum}" class="card-btn" onclick="event.stopPropagation()">🎯 Quiz</a>
                <a href="#/study/${week.weekNum}" class="card-btn study-btn" onclick="event.stopPropagation()">📖 Study</a>
            </div>
        </div>`;
    }

    container.innerHTML = `
        <div class="home-hero">
            <h1>Modern Indian Political Thought</h1>
            <p>NPTEL Course Quiz Practice — Test your knowledge across all 12 weeks of the course</p>
            <div class="home-stats">
                <div class="stat-badge">
                    <span class="stat-num">${totalQ}</span> Questions
                </div>
                <div class="stat-badge">
                    <span class="stat-num">${weeks}</span> Assignments
                </div>
                <div class="stat-badge">
                    <span class="stat-num">3</span> Modes
                </div>
            </div>
        </div>
        <div class="assignments-grid">${cardsHTML}</div>
        <div style="text-align:center;margin-top:32px;">
            <a href="#/practice-all" class="quiz-btn primary" style="text-decoration:none;">
                🚀 Practice All ${totalQ} Questions
            </a>
        </div>
    `;
}

// --- Quiz Mode ---
let quizState = {};

function renderQuiz(container, weekOrAll) {
    let questions = [];
    let title = '';
    
    if (weekOrAll === 'all') {
        title = 'Practice All Questions';
        const sortedKeys = Object.keys(DATA).sort((a, b) => DATA[a].weekNum - DATA[b].weekNum);
        for (const key of sortedKeys) {
            questions = questions.concat(DATA[key].questions.map((q, i) => ({
                ...q,
                weekNum: DATA[key].weekNum,
                qIndex: i
            })));
        }
        // Shuffle
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
    } else {
        const key = `week${weekOrAll}`;
        if (!DATA[key]) {
            container.innerHTML = '<p>Assignment not found.</p>';
            return;
        }
        title = `Assignment ${weekOrAll} — ${WEEK_TOPICS[weekOrAll] || ''}`;
        questions = DATA[key].questions.map((q, i) => ({ ...q, weekNum: weekOrAll, qIndex: i }));
    }

    quizState = {
        questions,
        current: 0,
        answers: new Array(questions.length).fill(null),
        answered: new Array(questions.length).fill(false),
        score: 0,
        finished: false
    };

    renderQuizUI(container, title, weekOrAll);
}

function renderQuizUI(container, title, weekOrAll) {
    const s = quizState;
    const q = s.questions[s.current];
    const total = s.questions.length;
    const progress = ((s.answers.filter(a => a !== null).length) / total * 100).toFixed(0);
    
    if (s.finished) {
        renderScore(container, title, weekOrAll);
        return;
    }

    // Question dots
    let dotsHTML = '';
    for (let i = 0; i < total; i++) {
        let cls = 'q-dot';
        if (i === s.current) cls += ' current';
        else if (s.answers[i] !== null) {
            cls += s.answers[i] === s.questions[i].correct ? ' answered-correct' : ' answered-wrong';
        }
        dotsHTML += `<button class="${cls}" onclick="jumpToQuestion(${i})">${i + 1}</button>`;
    }

    // Options
    let optionsHTML = '';
    for (let i = 0; i < q.options.length; i++) {
        let cls = 'option-btn';
        if (s.answered[s.current]) {
            cls += ' disabled';
            if (i === q.correct) cls += ' correct';
            if (s.answers[s.current] === i && i !== q.correct) cls += ' wrong';
        }
        optionsHTML += `
        <button class="${cls}" onclick="selectAnswer(${i})" ${s.answered[s.current] ? 'disabled' : ''}>
            <span class="option-letter">${LETTERS[i]}</span>
            <span>${q.options[i]}</span>
        </button>`;
    }

    const backHref = weekOrAll === 'all' ? '#/' : '#/';

    container.innerHTML = `
        <div class="quiz-header">
            <div class="quiz-title-section">
                <a href="${backHref}" class="back-btn">←</a>
                <h2>${title}</h2>
            </div>
            <div class="quiz-progress">
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width:${progress}%"></div>
                </div>
                <span class="progress-text">${s.answers.filter(a => a !== null).length} / ${total}</span>
            </div>
        </div>
        <div class="question-dots">${dotsHTML}</div>
        <div class="question-card">
            <div class="question-number">Question ${s.current + 1} of ${total}${q.weekNum ? ` · Week ${q.weekNum}` : ''}</div>
            <div class="question-text">${q.question}</div>
            <div class="options-list">${optionsHTML}</div>
            ${s.answered[s.current] && q.reference ? `<div class="question-reference">📎 ${q.reference}</div>` : ''}
        </div>
        <div class="quiz-nav">
            <button class="quiz-btn secondary" onclick="prevQuestion()" ${s.current === 0 ? 'disabled' : ''}>
                ← Previous
            </button>
            <div>
                ${s.current === total - 1 && s.answers.filter(a => a !== null).length === total ? 
                    `<button class="quiz-btn primary" onclick="finishQuiz()">📊 See Results</button>` :
                    `<button class="quiz-btn primary" onclick="nextQuestion()" ${s.current === total - 1 ? 'disabled' : ''}>
                        Next →
                    </button>`
                }
            </div>
        </div>
    `;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectAnswer(idx) {
    if (quizState.answered[quizState.current]) return;
    
    quizState.answers[quizState.current] = idx;
    quizState.answered[quizState.current] = true;
    
    if (idx === quizState.questions[quizState.current].correct) {
        quizState.score++;
    }

    // Re-render current view
    const hash = location.hash;
    const weekOrAll = hash === '#/practice-all' ? 'all' : parseInt(hash.split('/')[2]);
    const title = weekOrAll === 'all' ? 'Practice All Questions' :
        `Assignment ${weekOrAll} — ${WEEK_TOPICS[weekOrAll] || ''}`;
    renderQuizUI(document.getElementById('main-content'), title, weekOrAll);
}

function nextQuestion() {
    if (quizState.current < quizState.questions.length - 1) {
        quizState.current++;
        const hash = location.hash;
        const weekOrAll = hash === '#/practice-all' ? 'all' : parseInt(hash.split('/')[2]);
        const title = weekOrAll === 'all' ? 'Practice All Questions' :
            `Assignment ${weekOrAll} — ${WEEK_TOPICS[weekOrAll] || ''}`;
        renderQuizUI(document.getElementById('main-content'), title, weekOrAll);
    }
}

function prevQuestion() {
    if (quizState.current > 0) {
        quizState.current--;
        const hash = location.hash;
        const weekOrAll = hash === '#/practice-all' ? 'all' : parseInt(hash.split('/')[2]);
        const title = weekOrAll === 'all' ? 'Practice All Questions' :
            `Assignment ${weekOrAll} — ${WEEK_TOPICS[weekOrAll] || ''}`;
        renderQuizUI(document.getElementById('main-content'), title, weekOrAll);
    }
}

function jumpToQuestion(idx) {
    quizState.current = idx;
    const hash = location.hash;
    const weekOrAll = hash === '#/practice-all' ? 'all' : parseInt(hash.split('/')[2]);
    const title = weekOrAll === 'all' ? 'Practice All Questions' :
        `Assignment ${weekOrAll} — ${WEEK_TOPICS[weekOrAll] || ''}`;
    renderQuizUI(document.getElementById('main-content'), title, weekOrAll);
}

function finishQuiz() {
    quizState.finished = true;
    const hash = location.hash;
    const weekOrAll = hash === '#/practice-all' ? 'all' : parseInt(hash.split('/')[2]);
    const title = weekOrAll === 'all' ? 'Practice All Questions' :
        `Assignment ${weekOrAll} — ${WEEK_TOPICS[weekOrAll] || ''}`;
    renderQuizUI(document.getElementById('main-content'), title, weekOrAll);
}

function renderScore(container, title, weekOrAll) {
    const s = quizState;
    const total = s.questions.length;
    const pct = ((s.score / total) * 100).toFixed(0);
    
    let emoji = '🎉';
    let msg = 'Excellent!';
    if (pct < 50) { emoji = '📚'; msg = 'Keep studying!'; }
    else if (pct < 70) { emoji = '💪'; msg = 'Good effort!'; }
    else if (pct < 90) { emoji = '🌟'; msg = 'Great job!'; }

    const retryHref = weekOrAll === 'all' ? '#/practice-all' : `#/quiz/${weekOrAll}`;

    container.innerHTML = `
        <div class="quiz-header">
            <div class="quiz-title-section">
                <a href="#/" class="back-btn">←</a>
                <h2>${title}</h2>
            </div>
        </div>
        <div class="score-card">
            <div class="score-icon">${emoji}</div>
            <h2>${msg}</h2>
            <div class="score-value">${s.score} / ${total}</div>
            <p class="score-subtitle">You scored ${pct}% on this quiz</p>
            <div class="score-actions">
                <a href="${retryHref}" class="quiz-btn primary" style="text-decoration:none;" onclick="setTimeout(()=>route(),0)">🔄 Retry</a>
                <a href="#/" class="quiz-btn secondary" style="text-decoration:none;">🏠 Home</a>
                ${weekOrAll !== 'all' ? `<a href="#/study/${weekOrAll}" class="quiz-btn secondary" style="text-decoration:none;">📖 Study</a>` : ''}
            </div>
        </div>
    `;
}

// --- Study Mode ---
function renderStudy(container, selectedWeek) {
    document.querySelector('[data-nav="study"]').classList.add('active');
    
    const sortedKeys = Object.keys(DATA).sort((a, b) => DATA[a].weekNum - DATA[b].weekNum);
    const activeWeek = selectedWeek || DATA[sortedKeys[0]].weekNum;
    
    // Tabs
    let tabsHTML = '';
    tabsHTML += `<button class="study-tab ${!selectedWeek ? 'active' : ''}" onclick="location.hash='#/study'">All</button>`;
    for (const key of sortedKeys) {
        const w = DATA[key];
        const isActive = w.weekNum === activeWeek && selectedWeek;
        tabsHTML += `<button class="study-tab ${isActive ? 'active' : ''}" onclick="location.hash='#/study/${w.weekNum}'">Week ${w.weekNum}</button>`;
    }

    // Questions
    let questionsHTML = '';
    let globalIdx = 0;
    
    const weeksToShow = selectedWeek ? [`week${selectedWeek}`] : sortedKeys;
    
    for (const key of weeksToShow) {
        const w = DATA[key];
        if (!w) continue;
        
        for (let i = 0; i < w.questions.length; i++) {
            const q = w.questions[i];
            globalIdx++;
            
            let optsHTML = '';
            for (let j = 0; j < q.options.length; j++) {
                const isCorrect = j === q.correct;
                optsHTML += `
                <div class="study-option ${isCorrect ? 'is-correct' : ''}">
                    <span class="so-letter">${LETTERS[j]}</span>
                    <span>${q.options[j]}</span>
                </div>`;
            }

            questionsHTML += `
            <div class="study-question">
                <div class="sq-header">
                    <span class="sq-number">Q${globalIdx} · Week ${w.weekNum}</span>
                </div>
                <div class="sq-text">${q.question}</div>
                <div class="study-options">${optsHTML}</div>
                ${q.reference ? `<div class="sq-ref">📎 ${q.reference}</div>` : ''}
            </div>`;
        }
    }

    const subtitle = selectedWeek ? 
        `${WEEK_TOPICS[selectedWeek] || 'Assignment ' + selectedWeek} — ${DATA['week' + selectedWeek]?.questions.length || 0} questions` :
        `All 120 questions with correct answers highlighted`;

    container.innerHTML = `
        <div class="study-header">
            <h2>📖 Study Mode</h2>
            <p>${subtitle}</p>
        </div>
        <div class="study-tabs">${tabsHTML}</div>
        <div class="study-questions">${questionsHTML}</div>
    `;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', loadData);
