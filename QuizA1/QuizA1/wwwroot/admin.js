// Admin page JavaScript
const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    setupFormHandlers();
});

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
        await submitQuestion();
    });
    
    // Form reset
    form.addEventListener('reset', () => {
        document.getElementById('imagePreview').innerHTML = '';
        hideNotification();
    });
}

// Submit question
async function submitQuestion() {
    try {
        const form = document.getElementById('questionForm');
        const formData = new FormData();
        
        // Get form values
        const examId = document.getElementById('examSelect').value;
        const questionText = document.getElementById('questionText').value;
        const explanation = document.getElementById('explanation').value;
        const answer1 = document.getElementById('answer1').value;
        const answer2 = document.getElementById('answer2').value;
        const answer3 = document.getElementById('answer3').value;
        const answer4 = document.getElementById('answer4').value;
        
        // Get correct answer
        const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');
        if (!correctAnswer) {
            showNotification('Vui lòng chọn đáp án đúng!', 'error');
            return;
        }
        
        // Validate
        if (!examId || !questionText.trim()) {
            showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }
        
        if (!answer1.trim() || !answer2.trim()) {
            showNotification('Cần có ít nhất 2 đáp án!', 'error');
            return;
        }
        
        // Build FormData
        formData.append('ExamID', examId);
        formData.append('QuestionText', questionText);
        formData.append('Explanation', explanation);
        formData.append('Answer1', answer1);
        formData.append('Answer2', answer2);
        formData.append('Answer3', answer3 || '');
        formData.append('Answer4', answer4 || '');
        formData.append('CorrectAnswerIndex', correctAnswer.value);
        
        // Add image if exists
        const imageFile = document.getElementById('imageUpload').files[0];
        if (imageFile) {
            formData.append('Image', imageFile);
        }
        
        // Submit to API
        const response = await fetch(`${API_BASE}/questions`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Thêm câu hỏi thành công!', 'success');
            form.reset();
            document.getElementById('imagePreview').innerHTML = '';
        } else {
            showNotification(`❌ Lỗi: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Có lỗi xảy ra khi thêm câu hỏi!', 'error');
    }
}

// Show notification
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

// Hide notification
function hideNotification() {
    const notification = document.getElementById('notification');
    notification.style.display = 'none';
}
