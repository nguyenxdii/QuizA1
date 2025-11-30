// State management
let currentExam = null;
let currentQuestions = [];
let userAnswers = {};
let randomizeEnabled = false;
let answerVisibility = {};

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

// Confirm randomization before loading exam
function confirmAndLoadExam(examId, examName) {
    const shouldRandomize = confirm('Bạn có muốn random câu hỏi và câu trả lời không?');
    randomizeEnabled = shouldRandomize;
    loadExam(examId, examName);
}

// Load exam details
async function loadExam(examId, examName) {
    try {
        const response = await fetch(`${API_BASE}/exams/${examId}`);
        const exam = await response.json();
        
        currentExam = exam;
        currentQuestions = exam.questions;
        userAnswers = {};
        answerVisibility = {};
        
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
    
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    currentQuestions.forEach((question, index) => {
        const questionCard = createQuestionCard(question, index);
        container.appendChild(questionCard);
    });
    
    updateQuestionCounter();
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
        html += `
            <li class="answer-item" data-answer-id="${answer.answerId}" data-is-correct="${answer.isCorrect}" onclick="handleAnswerClick(${question.questionId}, ${answer.answerId}, ${answer.isCorrect})">
                <input type="radio"
                       name="question-${question.questionId}"
                       value="${answer.answerId}"
                       id="answer-${answer.answerId}"
                       onchange="selectAnswer(${question.questionId}, ${answer.answerId}, ${answer.isCorrect})">
                <label for="answer-${answer.answerId}">${answer.answerText}</label>
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
    return card;
}

// Select answer
function selectAnswer(questionId, answerId, isCorrect) {
    userAnswers[questionId] = { answerId, isCorrect };

    // Highlight selected answer
    const questionCard = document.getElementById(`question-${questionId}`);
    questionCard.querySelectorAll('.answer-item').forEach(item => {
        item.classList.remove('selected');
    });
    questionCard.querySelector(`[data-answer-id="${answerId}"]`).classList.add('selected');

    updateAnswerStatus(questionId);
}

// Click handler for entire answer item
function handleAnswerClick(questionId, answerId, isCorrect) {
    const radio = document.getElementById(`answer-${answerId}`);
    radio.checked = true;
    selectAnswer(questionId, answerId, isCorrect);
}

// Toggle answer visibility per question
function toggleAnswer(questionId) {
    answerVisibility[questionId] = !answerVisibility[questionId];
    updateAnswerStatus(questionId, true);

    const btn = document.getElementById(`toggle-${questionId}`);
    btn.textContent = answerVisibility[questionId] ? '🙈 Ẩn đáp án' : '👁️ Hiện đáp án';
}

// Update answer status for a question
function updateAnswerStatus(questionId, forceShow = false) {
    const statusDiv = document.getElementById(`status-${questionId}`);
    const userAnswer = userAnswers[questionId];
    const questionCard = document.getElementById(`question-${questionId}`);

    const shouldShow = answerVisibility[questionId] || forceShow;
    if (!shouldShow) {
        statusDiv.style.display = 'none';
        statusDiv.className = 'answer-status';
        questionCard.querySelectorAll('.answer-item').forEach(item => {
            item.classList.remove('correct');
            item.classList.remove('incorrect');
            item.classList.remove('not-selected');
        });
        return;
    }

    statusDiv.style.display = 'block';

    // Find correct answer
    const question = currentQuestions.find(q => q.questionId === questionId);
    const correctAnswer = question.answers.find(a => a.isCorrect);
    
    questionCard.querySelectorAll('.answer-item').forEach(item => {
        item.classList.remove('correct', 'incorrect', 'not-selected');
    });

    if (!userAnswer) {
        statusDiv.className = 'answer-status not-selected show';
        statusDiv.innerHTML = `<strong>⚠️ Chưa chọn đáp án</strong><br>Đáp án đúng: ${correctAnswer.answerText}`;
        questionCard.classList.add('unanswered');
    } else if (userAnswer.isCorrect) {
        statusDiv.className = 'answer-status correct show';
        statusDiv.innerHTML = '<strong>✅ Đúng rồi!</strong>';
        questionCard.querySelector(`[data-answer-id="${userAnswer.answerId}"]`).classList.add('correct');
        questionCard.classList.remove('unanswered');
    } else {
        statusDiv.className = 'answer-status incorrect show';
        statusDiv.innerHTML = `<strong>❌ Sai rồi!</strong><br>Đáp án đúng: ${correctAnswer.answerText}`;
        questionCard.querySelector(`[data-answer-id="${userAnswer.answerId}"]`).classList.add('incorrect');
        questionCard.classList.remove('unanswered');

        // Highlight correct answer for reference
        const correctItem = questionCard.querySelector(`[data-answer-id="${correctAnswer.answerId}"]`);
        if (correctItem) {
            correctItem.classList.add('correct');
        }
    }
}

// Submit exam
function submitExam() {
    if (Object.keys(userAnswers).length === 0) {
        alert('Bạn chưa chọn câu trả lời nào!');
        return;
    }

    if (!confirm(`Bạn đã chọn ${Object.keys(userAnswers).length}/${currentQuestions.length} câu. Bạn có chắc muốn nộp bài?`)) {
        return;
    }

    // Calculate score
    let correctCount = 0;
    let wrongAnswers = [];

    currentQuestions.forEach((question, index) => {
        answerVisibility[question.questionId] = true;
        const userAnswer = userAnswers[question.questionId];

        if (userAnswer && userAnswer.isCorrect) {
            correctCount++;
        } else {
            const correctAnswer = question.answers.find(a => a.isCorrect);
            const userAnswerText = userAnswer
                ? question.answers.find(a => a.answerId === userAnswer.answerId)?.answerText
                : 'Không chọn';

            wrongAnswers.push({
                number: index + 1,
                question: question.questionText,
                userAnswer: userAnswerText,
                correctAnswer: correctAnswer.answerText,
                explanation: question.explanation
            });
        }

        updateAnswerStatus(question.questionId, true);
        const toggleBtn = document.getElementById(`toggle-${question.questionId}`);
        if (toggleBtn) {
            toggleBtn.textContent = answerVisibility[question.questionId] ? '🙈 Ẩn đáp án' : '👁️ Hiện đáp án';
        }
    });

    displayResult(correctCount, wrongAnswers);
}

// Display result
function displayResult(correctCount, wrongAnswers) {
    document.getElementById('resultContainer').style.display = 'block';

    const total = currentQuestions.length;
    const percentage = ((correctCount / total) * 100).toFixed(1);

    let resultHTML = `
        <div class="score-display">
            ${correctCount}/${total} câu đúng (${percentage}%)
        </div>
    `;

    if (wrongAnswers.length > 0) {
        resultHTML += '<div class="wrong-answers">';
        resultHTML += '<h3>📋 Các câu trả lời sai:</h3>';

        wrongAnswers.forEach(item => {
            resultHTML += `
                <div class="wrong-question">
                    <strong>Câu ${item.number}:</strong> ${item.question}<br>
                    <span style="color: #dc3545;">❌ Bạn chọn: ${item.userAnswer}</span><br>
                    <span style="color: #28a745;">✅ Đáp án đúng: ${item.correctAnswer}</span>
                    ${item.explanation ? `
                        <div class="explanation">
                            <strong>💡 Giải thích:</strong> ${item.explanation}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        resultHTML += '</div>';
    } else {
        resultHTML += '<p style="text-align: center; font-size: 1.5em; color: #28a745;">🎉 Chúc mừng! Bạn đã trả lời đúng tất cả!</p>';
    }

    document.getElementById('resultContent').innerHTML = resultHTML;
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
    });
    document.getElementById('submitBtn').addEventListener('click', submitExam);
    
    document.getElementById('retryBtn').addEventListener('click', () => {
        document.getElementById('resultContainer').style.display = 'none';
        document.getElementById('examList').style.display = 'grid';
        loadExams();
    });
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
