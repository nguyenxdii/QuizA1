// Admin page JavaScript
const API_BASE = '/api';
let currentExamId = null;
let editingQuestionId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadExams();
    setupFormHandlers();
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
            btn.onclick = () => loadQuestions(exam.examId, exam.examName);
            examList.appendChild(btn);
        });
    } catch (error) {
        console.error('Lỗi khi tải danh sách đề:', error);
        alert('Không thể tải danh sách đề thi!');
    }
}

// Load danh sách câu hỏi của đề
async function loadQuestions(examId, examName) {
    try {
        const response = await fetch(`${API_BASE}/exams/${examId}/questions`);
        const questions = await response.json();
        
        currentExamId = examId;
        
        document.getElementById('examList').style.display = 'none';
        document.getElementById('adminContainer').style.display = 'block';
        document.getElementById('examTitle').textContent = examName;
        
        displayQuestions(questions);
    } catch (error) {
        console.error('Lỗi khi tải câu hỏi:', error);
        alert('Không thể tải danh sách câu hỏi!');
    }
}

// Display questions list
function displayQuestions(questions) {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';
    
    if (questions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Chưa có câu hỏi nào. Hãy thêm câu hỏi mới!</p>';
        return;
    }
    
    questions.forEach((question, index) => {
        const item = document.createElement('div');
        item.className = 'question-item';
        
        const correctAnswer = question.answers.find(a => a.isCorrect);
        
        item.innerHTML = `
            <div class="question-content">
                <h4>Câu ${index + 1}</h4>
                <p>${question.questionText}</p>
                ${question.explanation ? `<p style="font-style: italic; color: #666;">Giải thích: ${question.explanation}</p>` : ''}
                <div class="question-meta">
                    <span>📄 ${question.answerCount} đáp án</span>
                    ${question.hasImage ? '<span>🖼️ Có ảnh</span>' : ''}
                    <span>✅ Đáp án đúng: ${correctAnswer ? correctAnswer.answerText : 'N/A'}</span>
                </div>
            </div>
            <div class="question-actions">
                <button class="btn-edit" onclick="editQuestion(${question.questionId})">✏️ Sửa</button>
                <button class="btn-delete" onclick="deleteQuestion(${question.questionId})">🗑️ Xóa</button>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Setup form handlers
function setupFormHandlers() {
    const form = document.getElementById('questionForm');
    const imageUpload = document.getElementById('imageUpload');
    
    // Image preview
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (editingQuestionId) {
            await updateQuestion();
        } else {
            await createQuestion();
        }
    });
    
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        document.getElementById('adminContainer').style.display = 'none';
        document.getElementById('examList').style.display = 'grid';
        currentExamId = null;
    });
    
    // Add button
    document.getElementById('addBtn').addEventListener('click', () => {
        openModalForAdd();
    });
}

// Open modal for adding new question
function openModalForAdd() {
    editingQuestionId = null;
    document.getElementById('formTitle').textContent = 'Thêm câu hỏi mới';
    document.getElementById('questionForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('questionId').value = '';
    document.getElementById('examId').value = currentExamId;
    document.getElementById('questionModal').classList.add('show');
}

// Edit question
async function editQuestion(questionId) {
    try {
        const response = await fetch(`${API_BASE}/questions/${questionId}`);
        const question = await response.json();
        
        editingQuestionId = questionId;
        document.getElementById('formTitle').textContent = 'Sửa câu hỏi';
        
        // Fill form
        document.getElementById('questionId').value = questionId;
        document.getElementById('questionText').value = question.questionText;
        document.getElementById('explanation').value = question.explanation || '';
        
        // Fill answers
        question.answers.forEach((answer, index) => {
            const answerInput = document.getElementById(`answer${index + 1}`);
            if (answerInput) {
                answerInput.value = answer.answerText;
            }
            
            if (answer.isCorrect) {
                document.getElementById(`correct${index + 1}`).checked = true;
            }
        });
        
        // Show image if exists
        if (question.hasImage) {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${API_BASE}/questions/${questionId}/image" alt="Current image">`;
        }
        
        document.getElementById('questionModal').classList.add('show');
    } catch (error) {
        console.error('Lỗi khi tải câu hỏi:', error);
        alert('Không thể tải thông tin câu hỏi!');
    }
}

// Create new question
async function createQuestion() {
    try {
        const formData = new FormData();
        
        formData.append('ExamID', currentExamId);
        formData.append('QuestionText', document.getElementById('questionText').value);
        formData.append('Explanation', document.getElementById('explanation').value);
        formData.append('Answer1', document.getElementById('answer1').value);
        formData.append('Answer2', document.getElementById('answer2').value);
        formData.append('Answer3', document.getElementById('answer3').value || '');
        formData.append('Answer4', document.getElementById('answer4').value || '');
        
        const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');
        if (!correctAnswer) {
            showNotification('Vui lòng chọn đáp án đúng!', 'error');
            return;
        }
        formData.append('CorrectAnswerIndex', correctAnswer.value);
        
        const imageFile = document.getElementById('imageUpload').files[0];
        if (imageFile) {
            formData.append('Image', imageFile);
        }
        
        const response = await fetch(`${API_BASE}/questions`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Thêm câu hỏi thành công!', 'success');
            setTimeout(() => {
                closeModal();
                loadQuestions(currentExamId, document.getElementById('examTitle').textContent);
            }, 1500);
        } else {
            showNotification(`❌ ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Có lỗi xảy ra!', 'error');
    }
}

// Update existing question
async function updateQuestion() {
    try {
        const formData = new FormData();
        
        formData.append('QuestionText', document.getElementById('questionText').value);
        formData.append('Explanation', document.getElementById('explanation').value);
        formData.append('Answer1', document.getElementById('answer1').value);
        formData.append('Answer2', document.getElementById('answer2').value);
        formData.append('Answer3', document.getElementById('answer3').value || '');
        formData.append('Answer4', document.getElementById('answer4').value || '');
        
        const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');
        if (!correctAnswer) {
            showNotification('Vui lòng chọn đáp án đúng!', 'error');
            return;
        }
        formData.append('CorrectAnswerIndex', correctAnswer.value);
        
        const imageFile = document.getElementById('imageUpload').files[0];
        if (imageFile) {
            formData.append('Image', imageFile);
        }
        
        const response = await fetch(`${API_BASE}/questions/${editingQuestionId}`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Cập nhật câu hỏi thành công!', 'success');
            setTimeout(() => {
                closeModal();
                loadQuestions(currentExamId, document.getElementById('examTitle').textContent);
            }, 1500);
        } else {
            showNotification(`❌ ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Có lỗi xảy ra!', 'error');
    }
}

// Delete question
async function deleteQuestion(questionId) {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này không?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/questions/${questionId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Xóa câu hỏi thành công!');
            loadQuestions(currentExamId, document.getElementById('examTitle').textContent);
        } else {
            alert(`❌ ${result.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Có lỗi xảy ra khi xóa câu hỏi!');
    }
}

// Close modal
function closeModal() {
    document.getElementById('questionModal').classList.remove('show');
    document.getElementById('questionForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('notification').style.display = 'none';
    editingQuestionId = null;
}

// Show notification
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
}
