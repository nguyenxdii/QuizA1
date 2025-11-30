-- =============================================
-- BƯỚC 2: INSERT DỮ LIỆU 10 ĐỀ THI
-- =============================================
-- Chạy script này SAU khi đã tạo database và bảng

USE QuizA1DB;
GO

-- Kiểm tra xem đã có đề thi chưa
IF NOT EXISTS (SELECT * FROM Exams)
BEGIN
    -- Tạo 10 đề thi
    INSERT INTO Exams (ExamName, Description, IsActive) VALUES
    (N'Đề thi số 1', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 2', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 3', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 4', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 5', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 6', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 7', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 8', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 9', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1),
    (N'Đề thi số 10', N'Đề thi thử A1 - Bộ đề chuẩn 2024', 1);

    PRINT N'Đã thêm 10 đề thi thành công!';
END
ELSE
BEGIN
    PRINT N'Đã có đề thi trong database!';
END
GO
