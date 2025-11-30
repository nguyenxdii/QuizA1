// State management
let currentExam = null;
let currentQuestions = [];
let userAnswers = {};
let randomizeEnabled = false;
let isSubmitted = false;

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
        isSubmitted = false;
        
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
            <li class="answer-item" data-answer-id="${answer.answerId}" data-is-correct="${answer.isCorrect}" 
                onclick="selectAnswer(${question.questionId}, ${answer.answerId}, ${answer.isCorrect})">
                <input type="radio" 
                       name="question-${question.questionId}" 
                       value="${answer.answerId}" 
                       id="answer-${answer.answerId}">
                <label for="answer-${answer.answerId}">${idx + 1}. ${answer.answerText}</label>
            </li>
        `;
    });
    html += '</ul>';
    
    // Show answer button for each question
    html += `
        <button class="show-answer-btn" onclick="toggleShowAnswer(${question.questionId})">
            👁️ Hiện đáp án
        </button>
        <div class="answer-status" id="status-${question.questionId}"></div>
    `;
    
    card.innerHTML = html;
    return card;
}

// Select answer
function selectAnswer(questionId, answerId, isCorrect) {
    if (isSubmitted) return; // Không cho chọn sau khi nộp bài
    
    userAnswers[questionId] = { answerId, isCorrect };
    
    // Highlight selected answer
    const questionCard = document.getElementById(`question-${questionId}`);
    questionCard.querySelectorAll('.answer-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = questionCard.querySelector(`[data-answer-id="${answerId}"]`);
    selectedItem.classList.add('selected');
    
    // Check radio button
    document.getElementById(`answer-${answerId}`).checked = true;
    
    // Update progress
    updateProgress();
    updateQuestionCounter();
}

// Toggle show answer for individual question
function toggleShowAnswer(questionId) {
    const statusDiv = document.getElementById(`status-${questionId}`);
    const questionCard = document.getElementById(`question-${questionId}`);
    
    if (statusDiv.classList.contains('show')) {
        // Hide answer
        statusDiv.classList.remove('show');
        statusDiv.style.display = 'none';
    } else {
        // Show answer
        updateAnswerStatus(questionId);
    }
}

// Update answer status for a question
function updateAnswerStatus(questionId) {
    const statusDiv = document.getElementById(`status-${questionId}`);
    const userAnswer = userAnswers[questionId];
    
    statusDiv.style.display = 'block';
    statusDiv.classList.add('show');
    
    // Find correct answer
    const question = currentQuestions.find(q => q.questionId === questionId);
    const correctAnswer = question.answers.find(a => a.isCorrect);
    
    if (!userAnswer) {
        statusDiv.className = 'answer-status not-selected show';
        statusDiv.innerHTML = `<strong>⚠️ Chưa chọn đáp án</strong><br>Đáp án đúng: ${correctAnswer.answerText}`;
    } else if (userAnswer.isCorrect) {
        statusDiv.className = 'answer-status correct show';
        statusDiv.innerHTML = '<strong>✅ Đúng rồi!</strong>';
    } else {
        statusDiv.className = 'answer-status incorrect show';
        statusDiv.innerHTML = `<strong>❌ Sai rồi!</strong><br>Đáp án đúng: ${correctAnswer.answerText}`;
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
    
    isSubmitted = true;
    
    // Calculate score
    let correctCount = 0;
    
    currentQuestions.forEach((question) => {
        const questionCard = document.getElementById(`question-${question.questionId}`);
        const userAnswer = userAnswers[question.questionId];
        const correctAnswer = question.answers.find(a => a.isCorrect);
        
        // Clear all previous styling
        questionCard.querySelectorAll('.answer-item').forEach(item => {
            item.classList.remove('correct', 'incorrect', 'unanswered');
        });
        
        if (userAnswer) {
            if (userAnswer.isCorrect) {
                // Correct answer - keep selected
                correctCount++;
                const selectedItem = questionCard.querySelector(`[data-answer-id="${userAnswer.answerId}"]`);
                selectedItem.classList.add('correct');
            } else {
                // Wrong answer - mark red, and highlight correct in green
                const selectedItem = questionCard.querySelector(`[data-answer-id="${userAnswer.answerId}"]`);
                selectedItem.classList.add('incorrect');
                
                const correctItem = questionCard.querySelector(`[data-is-correct="true"]`);
                correctItem.classList.add('correct');
            }
        } else {
            // Unanswered - highlight correct answer in green with warning
            const correctItem = questionCard.querySelector(`[data-is-correct="true"]`);
            correctItem.classList.add('unanswered');
        }
    });
    
    // Show result summary
    displayResultSummary(correctCount);
}

// Display result summary
function displayResultSummary(correctCount) {
    const total = currentQuestions.length;
    const percentage = ((correctCount / total) * 100).toFixed(1);
    const passed = correctCount >= 21; // 21/25 to pass
    
    alert(`
🎯 KẾT QUẢ THI

✅ Số câu đúng: ${correctCount}/${total}
📊 Tỷ lệ: ${percentage}%
${passed ? '🎉 ĐẠT' : '❌ CHƯA ĐẠT'}

${passed ? 'Chúc mừng bạn!' : 'Hãy ôn tập thêm và thử lại!'}
    `);
    
    // Scroll to top to see all answers
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update progress bar
function updateProgress() {
    const answered = Object.keys(userAnswers).length;
    const total = currentQuestions.length;
    const percentage = (answered / total) * 100;
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

// Update question counter
function updateQuestionCounter() {
    const answered = Object.keys(userAnswers).length;
    const total = currentQuestions.length;
    const counter = document.getElementById('questionCounter');
    if (counter) {
        counter.textContent = `Đã làm: ${answered} / ${total} câu`;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        if (isSubmitted || confirm('Bạn có chắc muốn thoát? Dữ liệu sẽ bị mất.')) {
            document.getElementById('quizContainer').style.display = 'none';
            document.getElementById('examList').style.display = 'grid';
            currentExam = null;
            currentQuestions = [];
            userAnswers = {};
            isSubmitted = false;
        }
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
