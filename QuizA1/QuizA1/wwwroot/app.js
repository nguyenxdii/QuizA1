// State management
let currentExam = null;
let currentQuestions = [];
let userAnswers = {};
let randomizeEnabled = false;
let answerVisibility = {};

// Single Mode State
let isSingleMode = false;
let currentQuestionIndex = 0;
let autoAdvanceEnabled = false;

// API base URL
const API_BASE = '/api';

// Load exams when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadExams();
    setupEventListeners();
});

// Load danh sách đề thi
async function loadExams() {
    try {
        const response = await fetch(`${API_BASE}/exams`);
        const exams = await response.json();
        
        const examList = document.getElementById('examList');
        examList.innerHTML = '';
        
        exams.forEach(exam => {
            const btn = document.createElement('button');
            btn.className = 'exam-btn';
            btn.textContent = exam.examName;
            btn.onclick = () => confirmAndLoadExam(exam.examId, exam.examName);
            examList.appendChild(btn);
        });
    } catch (error) {
        console.error('Lỗi khi tải danh sách đề:', error);
        alert('Không thể tải danh sách đề thi. Vui lòng thử lại!');
    }
}

// Custom Modal Logic
function showConfirm(title, message, onYes, onNo) {
    const modal = document.getElementById('customModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    
    const yesBtn = document.getElementById('modalYesBtn');
    const noBtn = document.getElementById('modalNoBtn');
    
    // Clear previous listeners
    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);
    
    newYes.onclick = () => {
        modal.style.display = 'none';
        if (onYes) onYes();
    };
    
    newNo.onclick = () => {
        modal.style.display = 'none';
        if (onNo) onNo();
    };
    
    modal.style.display = 'flex';
}

// Confirm randomization and mode before loading exam
function confirmAndLoadExam(examId, examName) {
    showConfirm('Trộn câu hỏi', 'Bạn có muốn trộn câu hỏi và câu trả lời không?', 
        () => { // Yes Random
            randomizeEnabled = true;
            askMode(examId, examName);
        },
        () => { // No Random
            randomizeEnabled = false;
            askMode(examId, examName);
        }
    );
}

function askMode(examId, examName) {
    showConfirm('Chế độ làm bài', 'Bạn có muốn bật chế độ tự động chuyển câu hỏi không?',
        () => { // Yes Auto/Single Mode
            isSingleMode = true;
            loadExam(examId, examName);
        },
        () => { // No List Mode
            isSingleMode = false;
            loadExam(examId, examName);
        }
    );
}

// Load exam details
async function loadExam(examId, examName) {
    try {
        const response = await fetch(`${API_BASE}/exams/${examId}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        const exam = await response.json();
        
        currentExam = exam;
        currentQuestions = exam.questions;
        userAnswers = {};
        answerVisibility = {};
        currentQuestionIndex = 0;
        
        // Random câu hỏi nếu được bật
        if (randomizeEnabled) {
            currentQuestions = shuffleArray([...currentQuestions]);
        }
        
        displayExam(examName);
    } catch (error) {
        console.error('Lỗi khi tải đề thi:', error);
        alert('Không thể tải đề thi. Vui lòng thử lại!');
    }
}

// Display exam
function displayExam(examName) {
    document.getElementById('examList').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('examTitle').textContent = examName;
    document.getElementById('submitBtn').style.display = 'block';
    document.getElementById('resultContainer').style.display = 'none';
    
    const container = document.getElementById('questionsContainer');
    const singleControls = document.getElementById('singleModeControls');
    
    container.innerHTML = '';
    
    if (isSingleMode) {
        singleControls.style.display = 'block';
        renderSingleQuestion(currentQuestionIndex);
        updatePaginationGrid();
    } else {
        singleControls.style.display = 'none';
        currentQuestions.forEach((question, index) => {
            const questionCard = createQuestionCard(question, index);
            container.appendChild(questionCard);
        });
    }
    
    updateQuestionCounter();
}

// Render Single Question
function renderSingleQuestion(index) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = ''; // Clear previous
    
    const question = currentQuestions[index];
    const card = createQuestionCard(question, index);
    container.appendChild(card);
    
    // Update pagination active state
    updatePaginationGrid();
}

// Update Pagination Grid
function updatePaginationGrid() {
    const grid = document.getElementById('paginationGrid');
    grid.innerHTML = '';
    
    currentQuestions.forEach((q, idx) => {
        const dot = document.createElement('div');
        dot.className = 'page-dot';
        dot.textContent = idx + 1;
        
        if (idx === currentQuestionIndex) dot.classList.add('active');
        if (userAnswers[q.questionId]) dot.classList.add('answered');
        
        // If submitted, show correct/incorrect
        if (document.getElementById('resultContainer').style.display === 'block') {
            const userAnswer = userAnswers[q.questionId];
            if (userAnswer && userAnswer.isCorrect) {
                dot.classList.add('correct');
            } else {
                dot.classList.add('incorrect');
            }
        }
        
        dot.onclick = () => {
            currentQuestionIndex = idx;
            renderSingleQuestion(currentQuestionIndex);
        };
        
        grid.appendChild(dot);
    });
}

// Next Question Logic
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderSingleQuestion(currentQuestionIndex);
    }
}

// Create question card
function createQuestionCard(question, index) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = `question-${question.questionId}`;
    
    let html = `
        <div class="question-header">
            <div class="question-number">Câu ${index + 1}:</div>
            <div class="question-text">${question.questionText}</div>
        </div>
    `;
    
    // Add image if exists
    if (question.hasImage) {
        html += `<img src="${API_BASE}/questions/${question.questionId}/image" class="question-image" alt="Hình minh họa">`;
    }
    
    // Answers
    let answers = [...question.answers];
    if (randomizeEnabled) {
        answers = shuffleArray(answers);
    }
    
    html += '<ul class="answers-list">';
    answers.forEach((answer, idx) => {
        const isSelected = userAnswers[question.questionId]?.answerId === answer.answerId;
        const selectedClass = isSelected ? 'selected' : '';
        
        html += `
            <li class="answer-item ${selectedClass}" data-answer-id="${answer.answerId}" onclick="handleAnswerClick(${question.questionId}, ${answer.answerId})">
                <label>${answer.answerText}</label>
            </li>
        `;
    });
    html += '</ul>';

    html += `
        <div class="question-actions">
            <button class="toggle-answer-btn" id="toggle-${question.questionId}" onclick="toggleAnswer(${question.questionId})">👁️ Hiện đáp án</button>
            <div class="answer-status" id="status-${question.questionId}"></div>
        </div>
    `;
    
    card.innerHTML = html;
    
    // If already answered/submitted, restore state
    if (userAnswers[question.questionId]) {
        // Restore selection
        const ansId = userAnswers[question.questionId].answerId;
        setTimeout(() => {
             const item = card.querySelector(`[data-answer-id="${ansId}"]`);
             if(item) item.classList.add('selected');
             updateAnswerStatus(question.questionId); // Show status if visible
        }, 0);
    }
    
    return card;
}

// Select answer
function selectAnswer(questionId, answerId, isCorrect) {
    userAnswers[questionId] = { answerId, isCorrect };

    // Highlight selected answer
    const questionCard = document.getElementById(`question-${questionId}`);
    if (questionCard) {
        questionCard.querySelectorAll('.answer-item').forEach(item => {
            item.classList.remove('selected');
        });
        const selectedItem = questionCard.querySelector(`[data-answer-id="${answerId}"]`);
        if (selectedItem) selectedItem.classList.add('selected');
    }

    updateAnswerStatus(questionId);
    if (isSingleMode) updatePaginationGrid();
}

// Handle answer click
function handleAnswerClick(questionId, answerId) {
    // Prevent changing answer if already submitted
    if (document.getElementById('resultContainer').style.display === 'block') return;

    // Find isCorrect from currentQuestions
    const question = currentQuestions.find(q => q.questionId === questionId);
    const answer = question.answers.find(a => a.answerId === answerId);
    
    selectAnswer(questionId, answerId, answer.isCorrect);
    
    // Auto advance if enabled
    const autoAdvance = document.getElementById('autoAdvanceCheckbox')?.checked;
    if (isSingleMode && autoAdvance) {
        setTimeout(() => {
            nextQuestion();
        }, 500); // 500ms delay
    }
}

// Toggle answer visibility
function toggleAnswer(questionId) {
    const btn = document.getElementById(`toggle-${questionId}`);
    const statusDiv = document.getElementById(`status-${questionId}`);
    
    // Toggle state
    answerVisibility[questionId] = !answerVisibility[questionId];
    
    if (answerVisibility[questionId]) {
        btn.textContent = '🙈 Ẩn đáp án';
        updateAnswerStatus(questionId, true);
    } else {
        btn.textContent = '👁️ Hiện đáp án';
        statusDiv.style.display = 'none';
        
        // Remove highlights if we just want to hide the result
        const questionCard = document.getElementById(`question-${questionId}`);
        if (questionCard) {
            questionCard.querySelectorAll('.answer-item').forEach(item => {
                item.classList.remove('correct', 'incorrect');
            });
        }
    }
}

// Update answer status for a question
function updateAnswerStatus(questionId, forceShow = false) {
    const statusDiv = document.getElementById(`status-${questionId}`);
    const userAnswer = userAnswers[questionId];
    const questionCard = document.getElementById(`question-${questionId}`);
    
    if (!statusDiv || !questionCard) return;

    const shouldShow = answerVisibility[questionId] || forceShow;
    
    if (!shouldShow) {
        statusDiv.style.display = 'none';
        return;
    }

    statusDiv.style.display = 'block';

    // Find correct answer
    const question = currentQuestions.find(q => q.questionId === questionId);
    const correctAnswer = question.answers.find(a => a.isCorrect);
    
    // Reset classes
    questionCard.querySelectorAll('.answer-item').forEach(item => {
        item.classList.remove('correct', 'incorrect');
    });

    if (!userAnswer) {
        statusDiv.className = 'answer-status not-selected show';
        statusDiv.innerHTML = `<strong>⚠️ Chưa chọn đáp án</strong><br>Đáp án đúng: ${correctAnswer.answerText}`;
    } else if (userAnswer.isCorrect) {
        statusDiv.className = 'answer-status correct show';
        statusDiv.innerHTML = '<strong>✅ Đúng rồi!</strong>';
        questionCard.querySelector(`[data-answer-id="${userAnswer.answerId}"]`)?.classList.add('correct');
    } else {
        statusDiv.className = 'answer-status incorrect show';
        statusDiv.innerHTML = `<strong>❌ Sai rồi!</strong><br>Đáp án đúng: ${correctAnswer.answerText}`;
        questionCard.querySelector(`[data-answer-id="${userAnswer.answerId}"]`)?.classList.add('incorrect');
        
        // Highlight correct answer
        questionCard.querySelector(`[data-answer-id="${correctAnswer.answerId}"]`)?.classList.add('correct');
    }
}

// Submit exam
function submitExam() {
    if (Object.keys(userAnswers).length === 0) {
        showConfirm('Thông báo', 'Bạn chưa chọn câu trả lời nào!', null, null);
        return;
    }

    showConfirm('Nộp bài', `Bạn đã chọn ${Object.keys(userAnswers).length}/${currentQuestions.length} câu. Bạn có chắc muốn nộp bài?`, () => {
        processSubmission();
    });
}

function processSubmission() {
    let correctCount = 0;
    
    // Process results
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[question.questionId];
        
        // If in list mode, update UI directly. In single mode, UI updates when rendered.
        // We update answerVisibility to true for all
        answerVisibility[question.questionId] = true;

        if (userAnswer && userAnswer.isCorrect) {
            correctCount++;
        }
        
        // If list mode, update card immediately
        if (!isSingleMode) {
            const questionCard = document.getElementById(`question-${question.questionId}`);
            if (questionCard) {
                updateAnswerStatus(question.questionId, true);
                
                // Disable interaction
                questionCard.querySelectorAll('.answer-item').forEach(item => {
                    item.onclick = null;
                    item.style.cursor = 'default';
                });
                
                // Show explanation
                if (question.explanation && !questionCard.querySelector('.explanation-box')) {
                    let expBox = document.createElement('div');
                    expBox.className = 'explanation-box show';
                    expBox.innerHTML = `<strong>💡 Giải thích:</strong> ${question.explanation}`;
                    questionCard.appendChild(expBox);
                }
            }
        }
    });

    // Show result summary at top
    const total = currentQuestions.length;
    const percentage = ((correctCount / total) * 100).toFixed(1);
    
    document.getElementById('resultContainer').style.display = 'block';
    document.getElementById('resultContent').innerHTML = `
        <div class="score-display ${percentage >= 80 ? 'pass' : 'fail'}">
            ${correctCount}/${total} câu đúng (${percentage}%)
            <div style="font-size: 0.5em; margin-top: 10px;">
                ${percentage >= 80 ? '🎉 ĐẠT' : '⚠️ KHÔNG ĐẠT'}
            </div>
        </div>
    `;

    // Update buttons
    document.getElementById('submitBtn').style.display = 'none';
    
    // If single mode, refresh current card to show result state
    if (isSingleMode) {
        renderSingleQuestion(currentQuestionIndex);
        updatePaginationGrid();
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('examList').style.display = 'grid';
        document.getElementById('resultContainer').style.display = 'none';
        currentExam = null;
        currentQuestions = [];
        userAnswers = {};
        answerVisibility = {};
        loadExams(); // Refresh list
    });
    document.getElementById('submitBtn').addEventListener('click', submitExam);
    
    document.getElementById('retryBtn').addEventListener('click', () => {
        document.getElementById('resultContainer').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('examList').style.display = 'grid';
        document.getElementById('submitBtn').style.display = 'block'; // Reset submit button
        loadExams();
    });
    
    document.getElementById('nextQuestionBtn').addEventListener('click', nextQuestion);
}

// Utility: Shuffle array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function updateQuestionCounter() {
    const count = currentQuestions.length;
    const counterElement = document.getElementById('questionCounter');
    if (counterElement) {
        counterElement.textContent = `Câu hỏi: ${count}`;
    }
}