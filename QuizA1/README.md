# Quiz A1 - Ứng Dụng Thi Trắc Nghiệm Giấy Phép Lái Xe A1

## 🚀 Quick Start

### Chạy ứng dụng:
```bash
cd d:\VSCode\tracNghiem\thi_lai_xe\QuizA1\QuizA1
dotnet restore
dotnet run
```

### Truy cập:
- **Trang thi**: http://localhost:5000/index.html
- **Admin**: http://localhost:5000/admin.html

## 📦 Tech Stack
- **Backend**: ASP.NET Core 8 Minimal API
- **Frontend**: HTML + CSS + JavaScript (Vanilla)
- **Database**: SQL Server (DIINGUYEN\SQLEXPRESS)

## ✨ Tính Năng
### Trang Thi (index.html)
- ✅ Chọn đề từ 10 đề có sẵn
- ✅ Tùy chọn random câu hỏi & đáp án
- ✅ Hiển thị ảnh minh họa
- ✅ Nút "Hiện đáp án" để xem đáp án + trạng thái
- ✅ Chấm điểm tự động
- ✅ Hiển thị kết quả + giải thích

### Trang Admin (admin.html)
- ✅ Form thêm câu hỏi
- ✅ Upload ảnh với preview
- ✅ Chọn đáp án đúng
- ✅ Tự động gán vào đề

## 📚 Chi Tiết

Xem file [HUONG_DAN_SU_DUNG.md](C:\Users\DANG DUY\.gemini\antigravity\brain\4ba03471-ffde-4551-b35d-49908f107203\HUONG_DAN_SU_DUNG.md) để biết thêm chi tiết về:
- Cấu hình database
- API endpoints
- Xử lý lỗi
- Troubleshooting

## ⚙️ Connection String
```
Server=DIINGUYEN\\SQLEXPRESS;Database=QuizA1DB;Trusted_Connection=True;TrustServerCertificate=True;
```

## 📁 Cấu Trúc
```
QuizA1/QuizA1/
├── Models/           # Entity models
├── Data/             # DbContext
├── wwwroot/          # Frontend files
│   ├── index.html
│   ├── admin.html
│   ├── app.js
│   ├── admin.js
│   └── styles.css
└── Program.cs        # API endpoints
```
