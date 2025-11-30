const API_BASE = '/api';
let selectedExamId = null;
let selectedExamName = '';
let editingQuestionId = null;

// DOM Elements
const examGrid = document.getElementById('examGrid');
const questionList = document.getElementById('questionList');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const deleteExamBtn = document.getElementById('deleteExamBtn');
const refreshExamsBtn = document.getElementById('refreshExams');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const questionForm = document.getElementById('questionForm');
const notification = document.getElementById('notification');

// Form Fields
const fields = {
    questionText: document.getElementById('questionText'),
    explanation: document.getElementById('explanation'),
    answers: [
        document.getElementById('answer1'),
        document.getElementById('answer2'),
        document.getElementById('answer3'),
        document.getElementById('answer4')
    ],
    correctRadios: [
        document.getElementById('correct1'),
        document.getElementById('correct2'),
        document.getElementById('correct3'),
        document.getElementById('correct4')
    ],
    image: document.getElementById('imageUpload'),
    preview: document.getElementById('imagePreview'),
    editingId: document.getElementById('editingQuestionId')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadExams();
});

// Event Binding
function bindEvents() {
    addQuestionBtn.addEventListener('click', () => openModal());
    deleteExamBtn.addEventListener('click', () => deleteSelectedExam());
    refreshExamsBtn.addEventListener('click', loadExams);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('resetForm').addEventListener('click', resetForm);

    fields.image.addEventListener('change', handleImagePreview);

    // Correct answer button handlers
    document.querySelectorAll('.correct-answer-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.correct-answer-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Update hidden input
            document.getElementById('correctAnswerInput').value = this.getAttribute('data-answer-index');
        });
    });

    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedExamId) {
            showNotification('Vui lòng chọn đề thi trước khi thêm/sửa câu hỏi.', 'error');
            return;
        }
        await saveQuestion();
    });
}

// Load Exam List
async function loadExams() {
    examGrid.innerHTML = '<p class="muted" style="padding: 10px;">Đang tải...</p>';
    try {
        const res = await fetch(`${API_BASE}/exams`);
        if (!res.ok) throw new Error('Không thể tải danh sách đề thi');
        const exams = await res.json();

        if (!Array.isArray(exams) || exams.length === 0) {
            examGrid.innerHTML = '<p class="muted" style="padding: 10px;">Chưa có đề thi nào.</p>';
            return;
        }

        examGrid.innerHTML = '';
        exams.forEach(exam => {
            const div = document.createElement('div');
            div.className = `exam-item-sidebar ${selectedExamId === exam.examId ? 'active' : ''}`;
            div.textContent = exam.examName;
            div.onclick = () => loadExamQuestions(exam.examId, exam.examName);
            examGrid.appendChild(div);
        });
    } catch (error) {
        console.error(error);
        examGrid.innerHTML = '<p class="error-text" style="padding: 10px;">Lỗi tải danh sách!</p>';
    }
}

// Load Questions for Selected Exam
async function loadExamQuestions(examId, examName) {
    selectedExamId = examId;
    selectedExamName = examName;
    addQuestionBtn.disabled = false;
    deleteExamBtn.disabled = false;
    
    document.getElementById('selectedExamTitle').textContent = examName;
    
    // Update active state in sidebar
    const items = document.querySelectorAll('.exam-item-sidebar');
    items.forEach(item => {
        if (item.textContent === examName) item.classList.add('active');
        else item.classList.remove('active');
    });

    questionList.innerHTML = '<div class="empty-message"><p>Đang tải câu hỏi...</p></div>';
    questionList.classList.remove('empty-state'); // Temporarily remove to show loading

    try {
        const res = await fetch(`${API_BASE}/exams/${examId}`);
        if (!res.ok) throw new Error('Không thể tải danh sách câu hỏi');
        const exam = await res.json();

        renderQuestionList(exam.questions || []);
        document.getElementById('questionCount').textContent = `${exam.questions.length} câu hỏi`;
    } catch (error) {
        console.error(error);
        questionList.innerHTML = '<div class="empty-message"><p class="error-text">Không thể tải danh sách câu hỏi!</p></div>';
        document.getElementById('questionCount').textContent = 'Có lỗi khi tải câu hỏi';
    }
}

// Render Question List
function renderQuestionList(questions) {
    questionList.innerHTML = '';
    
    if (!questions.length) {
        questionList.className = 'question-grid empty-state';
        questionList.innerHTML = `
            <div class="empty-message">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" style="width: 64px; opacity: 0.5; margin-bottom: 10px;">
                <p>Đề thi này chưa có câu hỏi nào.</p>
                <button onclick="openModal()" class="primary-btn" style="margin-top: 10px;">➕ Thêm câu hỏi đầu tiên</button>
            </div>
        `;
        return;
    }

    questionList.className = 'question-grid';

    questions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'question-card-admin';

        const answersHtml = q.answers.map(a => 
            `<li class="q-answer-item ${a.isCorrect ? 'correct' : ''}">${a.answerText}</li>`
        ).join('');

        div.innerHTML = `
            <div class="q-card-header">
                <span class="q-number">Câu ${index + 1}</span>
                <div class="q-actions">
                    <button class="icon-btn edit" onclick="editQuestion(${q.questionId})" title="Sửa">✏️</button>
                    <button class="icon-btn delete" onclick="deleteQuestion(${q.questionId})" title="Xóa">🗑️</button>
                </div>
            </div>
            <div class="q-card-body">
                ${q.hasImage ? `<img src="${API_BASE}/questions/${q.questionId}/image?t=${new Date().getTime()}" class="q-image-preview" alt="Hình minh họa">` : ''}
                <div class="q-text">${q.questionText}</div>
                <ul class="q-answers">${answersHtml}</ul>
            </div>
        `;
        questionList.appendChild(div);
    });
}

// Modal Functions
function openModal(questionId = null) {
    modalOverlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    editingQuestionId = questionId;
    fields.editingId.value = questionId || '';

    if (questionId) {
        modalTitle.textContent = 'Chỉnh sửa câu hỏi';
        // We need to fetch details to populate form, but for now let's assume we call populateForm
        // Since we can't pass the object directly easily in onclick string, we fetch by ID
        populateForm(questionId);
    } else {
        modalTitle.textContent = 'Thêm câu hỏi mới';
        resetForm();
    }
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function resetForm() {
    questionForm.reset();
    fields.preview.innerHTML = '';
    editingQuestionId = null;
    fields.editingId.value = '';
    // Remove active state from all correct answer buttons
    document.querySelectorAll('.correct-answer-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('correctAnswerInput').value = '';
}

// Image Preview
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (!file) {
        fields.preview.innerHTML = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        fields.preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-height: 150px; border-radius: 6px;">`;
    };
    reader.readAsDataURL(file);
}

// Populate Form for Editing
async function populateForm(questionId) {
    try {
        const res = await fetch(`${API_BASE}/questions/${questionId}`);
        if (!res.ok) throw new Error('Không tìm thấy câu hỏi');
        const data = await res.json();

        fields.questionText.value = data.questionText || '';
        fields.explanation.value = data.explanation || '';
        fields.preview.innerHTML = data.hasImage ? `<img src="${API_BASE}/questions/${questionId}/image?t=${new Date().getTime()}" alt="Hình minh họa" style="max-height: 150px; border-radius: 6px;">` : '';

        // Remove active from all buttons first
        document.querySelectorAll('.correct-answer-btn').forEach(btn => btn.classList.remove('active'));
        
        data.answers.forEach((ans, idx) => {
            if (fields.answers[idx]) {
                fields.answers[idx].value = ans.answerText || '';
                // Set active button for correct answer
                if (ans.isCorrect) {
                    const btn = document.querySelector(`.correct-answer-btn[data-answer-index="${idx + 1}"]`);
                    if (btn) btn.classList.add('active');
                    document.getElementById('correctAnswerInput').value = (idx + 1).toString();
                }
            }
        });
    } catch (error) {
        console.error(error);
        showNotification('Không thể tải dữ liệu câu hỏi.', 'error');
    }
}

// Save Question (Create/Update)
async function saveQuestion() {
    const correctAnswerInput = document.getElementById('correctAnswerInput');
    if (!correctAnswerInput.value) {
        showNotification('Vui lòng chọn đáp án đúng.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('QuestionText', fields.questionText.value.trim());
    formData.append('Explanation', fields.explanation.value.trim());
    formData.append('ExamID', selectedExamId);
    formData.append('Answer1', fields.answers[0].value.trim());
    formData.append('Answer2', fields.answers[1].value.trim());
    formData.append('Answer3', fields.answers[2].value.trim());
    formData.append('Answer4', fields.answers[3].value.trim());
    formData.append('CorrectAnswerIndex', correctAnswerInput.value);

    const imageFile = fields.image.files[0];
    if (imageFile) {
        formData.append('Image', imageFile);
    }

    const isEdit = !!editingQuestionId;
    const url = isEdit ? `${API_BASE}/questions/${editingQuestionId}` : `${API_BASE}/questions`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method, body: formData });
        const result = await res.json();
        if (!res.ok || !result.success) {
            throw new Error(result.message || 'Có lỗi xảy ra');
        }

        showNotification(isEdit ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi mới.', 'success');
        closeModal();
        resetForm();
        loadExamQuestions(selectedExamId, selectedExamName);
    } catch (error) {
        console.error(error);
        showNotification(error.message || 'Không thể lưu câu hỏi.', 'error');
    }
}

// Delete Question
async function deleteQuestion(questionId) {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
    try {
        const res = await fetch(`${API_BASE}/questions/${questionId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không thể xóa câu hỏi');
        showNotification('Đã xóa câu hỏi.', 'success');
        loadExamQuestions(selectedExamId, selectedExamName);
    } catch (error) {
        console.error(error);
        showNotification(error.message, 'error');
    }
}

// Delete Exam (Placeholder)
async function deleteSelectedExam() {
    alert('Tính năng xóa đề hiện chưa hỗ trợ. Vui lòng quản lý đề ở cơ sở dữ liệu.');
}

// Expose functions to global scope for onclick handlers
window.editQuestion = (id) => openModal(id);
window.deleteQuestion = (id) => deleteQuestion(id);

// Notification Helper
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 4000);
}
