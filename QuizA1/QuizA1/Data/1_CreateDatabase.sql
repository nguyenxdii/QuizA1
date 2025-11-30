-- =============================================
-- BƯỚC 1: TẠO DATABASE VÀ CÁC BẢNG
-- =============================================
-- Chạy script này TRƯỚC khi chạy ứng dụng

USE master;
GO

-- Tạo database nếu chưa có
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'QuizA1DB')
BEGIN
    CREATE DATABASE QuizA1DB;
    PRINT 'Database QuizA1DB đã được tạo';
END
ELSE
BEGIN
    PRINT 'Database QuizA1DB đã tồn tại';
END
GO

USE QuizA1DB;
GO

-- Tạo bảng Exams
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Exams')
BEGIN
    CREATE TABLE Exams (
        ExamID INT PRIMARY KEY IDENTITY(1,1),
        ExamName NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500),
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Đã tạo bảng Exams';
END

-- Tạo bảng Questions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Questions')
BEGIN
    CREATE TABLE Questions (
        QuestionID INT PRIMARY KEY IDENTITY(1,1),
        QuestionText NVARCHAR(MAX) NOT NULL,
        ImageData VARBINARY(MAX),
        ImageFileName NVARCHAR(255),
        ImageMimeType NVARCHAR(100),
        Explanation NVARCHAR(MAX),
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Đã tạo bảng Questions';
END

-- Tạo bảng Answers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Answers')
BEGIN
    CREATE TABLE Answers (
        AnswerID INT PRIMARY KEY IDENTITY(1,1),
        QuestionID INT FOREIGN KEY REFERENCES Questions(QuestionID),
        AnswerText NVARCHAR(500) NOT NULL,
        IsCorrect BIT DEFAULT 0
    );
    PRINT 'Đã tạo bảng Answers';
END

-- Tạo bảng ExamQuestions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExamQuestions')
BEGIN
    CREATE TABLE ExamQuestions (
        ExamID INT FOREIGN KEY REFERENCES Exams(ExamID),
        QuestionID INT FOREIGN KEY REFERENCES Questions(QuestionID),
        DisplayOrder INT,
        PRIMARY KEY (ExamID, QuestionID)
    );
    PRINT 'Đã tạo bảng ExamQuestions';
END

PRINT 'Hoàn thành tạo database và bảng!';
GO
