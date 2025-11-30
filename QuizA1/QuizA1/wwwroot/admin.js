const API_BASE = '/api';
let selectedExamId = null;
let selectedExamName = '';
let editingQuestionId = null;

const examGrid = document.getElementById('examGrid');
const questionList = document.getElementById('questionList');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const deleteExamBtn = document.getElementById('deleteExamBtn');
const refreshExamsBtn = document.getElementById('refreshExams');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const questionForm = document.getElementById('questionForm');
const notification = document.getElementById('notification');

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

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadExams();
});

function bindEvents() {
    addQuestionBtn.addEventListener('click', () => openModal());
    deleteExamBtn.addEventListener('click', () => deleteSelectedExam());
    refreshExamsBtn.addEventListener('click', loadExams);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('resetForm').addEventListener('click', resetForm);

    fields.image.addEventListener('change', handleImagePreview);

    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedExamId) {
            showNotification('Vui lòng chọn đề thi trước khi thêm/sửa câu hỏi.', 'error');
            return;
        }
        await saveQuestion();
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

async function loadExams() {
    setExamGridState('loading');
    try {
        const res = await fetch(`${API_BASE}/exams`);
        if (!res.ok) throw new Error('Không thể tải danh sách đề thi');
        const exams = await res.json();

        if (!Array.isArray(exams) || exams.length === 0) {
            examGrid.innerHTML = '<p class="muted">Chưa có đề thi nào.</p>';
            return;
        }

        examGrid.innerHTML = '';
        exams.forEach(exam => {
            const btn = document.createElement('button');
            btn.className = `exam-card ${selectedExamId === exam.examId ? 'active' : ''}`;
            btn.textContent = exam.examName;
            btn.onclick = () => loadExamQuestions(exam.examId, exam.examName);
            examGrid.appendChild(btn);
        });
    } catch (error) {
        console.error(error);
        examGrid.innerHTML = '<p class="error-text">Không thể tải danh sách đề thi!</p>';
    }
}

function setExamGridState(state) {
    if (state === 'loading') {
        examGrid.innerHTML = '<p class="muted">Đang tải danh sách đề...</p>';
    }
}

async function loadExamQuestions(examId, examName) {
    selectedExamId = examId;
    selectedExamName = examName;
    addQuestionBtn.disabled = false;
    deleteExamBtn.disabled = false;
    document.getElementById('selectedExamTitle').textContent = `Đề thi: ${examName}`;
    questionList.classList.remove('empty-state');
    questionList.innerHTML = '<p class="muted">Đang tải câu hỏi...</p>';

    try {
        const res = await fetch(`${API_BASE}/exams/${examId}`);
        if (!res.ok) throw new Error('Không thể tải danh sách câu hỏi');
        const exam = await res.json();

        renderQuestionList(exam.questions || []);
        document.getElementById('questionCount').textContent = `${exam.questions.length} câu hỏi`;
    } catch (error) {
        console.error(error);
        questionList.innerHTML = '<p class="error-text">Không thể tải danh sách câu hỏi!</p>';
        document.getElementById('questionCount').textContent = 'Có lỗi khi tải câu hỏi';
    }

    loadExams(); // refresh highlight state
}

function renderQuestionList(questions) {
    if (!questions.length) {
        questionList.innerHTML = '<p class="muted">Đề này chưa có câu hỏi.</p>';
        return;
    }

    questionList.innerHTML = '';

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'admin-question-card';

        const answersHtml = q.answers.map(a => `
            <li class="admin-answer ${a.isCorrect ? 'correct' : ''}">
                ${a.answerText} ${a.isCorrect ? '<span class="badge">Đúng</span>' : ''}
            </li>`).join('');

        card.innerHTML = `
            <div class="question-head">
                <div>
                    <div class="question-number">Câu ${index + 1}</div>
                    <p class="question-text">${q.questionText}</p>
                </div>
                <div class="question-actions">
                    <button class="icon-btn" onclick="openModal(${q.questionId})">✏️ Sửa</button>
                    <button class="icon-btn danger" onclick="deleteQuestion(${q.questionId})">🗑️ Xóa</button>
                </div>
            </div>
            ${q.hasImage ? `<img src="${API_BASE}/questions/${q.questionId}/image" class="question-image" alt="Hình minh họa">` : ''}
            <ul class="admin-answer-list">${answersHtml}</ul>
            ${q.explanation ? `<div class="explanation"><strong>Giải thích:</strong> ${q.explanation}</div>` : ''}
        `;

        questionList.appendChild(card);
    });
}

function openModal(questionId = null) {
    modalOverlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    editingQuestionId = questionId;
    fields.editingId.value = questionId || '';

    if (questionId) {
        modalTitle.textContent = 'Chỉnh sửa câu hỏi';
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
}

function handleImagePreview(event) {
    const file = event.target.files[0];
    if (!file) {
        fields.preview.innerHTML = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        fields.preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

async function populateForm(questionId) {
    try {
        const res = await fetch(`${API_BASE}/questions/${questionId}`);
        if (!res.ok) throw new Error('Không tìm thấy câu hỏi');
        const data = await res.json();

        fields.questionText.value = data.questionText || '';
        fields.explanation.value = data.explanation || '';
        fields.preview.innerHTML = data.hasImage ? `<img src="${API_BASE}/questions/${questionId}/image" alt="Hình minh họa">` : '';

        data.answers.forEach((ans, idx) => {
            if (fields.answers[idx]) {
                fields.answers[idx].value = ans.answerText || '';
                fields.correctRadios[idx].checked = !!ans.isCorrect;
            }
        });
    } catch (error) {
        console.error(error);
        showNotification('Không thể tải dữ liệu câu hỏi.', 'error');
    }
}

async function saveQuestion() {
    const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');
    if (!correctAnswer) {
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
    formData.append('CorrectAnswerIndex', correctAnswer.value);

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

async function deleteQuestion(questionId) {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
    try {
        const res = await fetch(`${API_BASE}/exams/${selectedExamId}/questions/${questionId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không thể xóa câu hỏi');
        showNotification('Đã xóa câu hỏi.', 'success');
        loadExamQuestions(selectedExamId, selectedExamName);
    } catch (error) {
        console.error(error);
        showNotification(error.message, 'error');
    }
}

async function deleteSelectedExam() {
    alert('Tính năng xóa đề hiện chưa hỗ trợ. Vui lòng quản lý đề ở cơ sở dữ liệu.');
}

function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 4000);
}
