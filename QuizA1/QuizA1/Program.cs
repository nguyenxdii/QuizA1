using Microsoft.EntityFrameworkCore;
using QuizA1.Data;
using QuizA1.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddDbContext<QuizA1DbContext>(options =>
    options.UseSqlServer("Server=DIINGUYEN\\\\SQLEXPRESS;Database=QuizA1DB;Trusted_Connection=True;TrustServerCertificate=True;"));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseCors();
app.UseStaticFiles();

// API Endpoints

// GET /api/exams - Lấy danh sách 10 đề thi
app.MapGet("/api/exams", async (QuizA1DbContext db) =>
{
    var exams = await db.Exams
        .Where(e => e.IsActive)
        .OrderBy(e => e.ExamID)
        .Take(10)
        .Select(e => new
        {
            examId = e.ExamID,
            examName = e.ExamName,
            description = e.Description
        })
        .ToListAsync();

    return Results.Ok(exams);
});

// GET /api/exams/{examId} - Lấy toàn bộ câu hỏi của đề
app.MapGet("/api/exams/{examId}", async (int examId, QuizA1DbContext db) =>
{
    var exam = await db.Exams
        .Where(e => e.ExamID == examId)
        .Select(e => new
        {
            examId = e.ExamID,
            examName = e.ExamName,
            questions = e.ExamQuestions
                .OrderBy(eq => eq.DisplayOrder)
                .Select(eq => new
                {
                    questionId = eq.Question.QuestionID,
                    questionText = eq.Question.QuestionText,
                    hasImage = eq.Question.ImageData != null,
                    explanation = eq.Question.Explanation,
                    answers = eq.Question.Answers.Select(a => new
                    {
                        answerId = a.AnswerID,
                        answerText = a.AnswerText,
                        isCorrect = a.IsCorrect
                    }).ToList()
                }).ToList()
        })
        .FirstOrDefaultAsync();

    if (exam == null)
        return Results.NotFound(new { message = "Không tìm thấy đề thi" });

    return Results.Ok(exam);
});

// GET /api/questions/{questionId}/image - Lấy ảnh câu hỏi
app.MapGet("/api/questions/{questionId}/image", async (int questionId, QuizA1DbContext db) =>
{
    var question = await db.Questions
        .Where(q => q.QuestionID == questionId)
        .Select(q => new
        {
            q.ImageData,
            q.ImageMimeType
        })
        .FirstOrDefaultAsync();

    if (question?.ImageData == null)
        return Results.NotFound();

    return Results.File(question.ImageData, question.ImageMimeType ?? "image/jpeg");
});

// POST /api/questions - Thêm câu hỏi mới
app.MapPost("/api/questions", async (HttpRequest request, QuizA1DbContext db) =>
{
    try
    {
        var form = await request.ReadFormAsync();

        // Đọc dữ liệu từ form
        var questionText = form["QuestionText"].ToString();
        var explanation = form["Explanation"].ToString();
        var examId = int.Parse(form["ExamID"].ToString());
        var answer1 = form["Answer1"].ToString();
        var answer2 = form["Answer2"].ToString();
        var answer3 = form["Answer3"].ToString();
        var answer4 = form["Answer4"].ToString();
        var correctAnswerIndex = int.Parse(form["CorrectAnswerIndex"].ToString());

        // Validate
        if (string.IsNullOrWhiteSpace(questionText))
            return Results.BadRequest(new { success = false, message = "Câu hỏi không được để trống" });

        // Tạo question mới
        var question = new Question
        {
            QuestionText = questionText,
            Explanation = explanation,
            IsActive = true,
            CreatedAt = DateTime.Now
        };

        // Xử lý ảnh nếu có
        var imageFile = form.Files.GetFile("Image");
        if (imageFile != null && imageFile.Length > 0)
        {
            using var memoryStream = new MemoryStream();
            await imageFile.CopyToAsync(memoryStream);
            question.ImageData = memoryStream.ToArray();
            question.ImageFileName = imageFile.FileName;
            question.ImageMimeType = imageFile.ContentType;
        }

        // Thêm question vào database
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        // Thêm answers
        var answers = new List<Answer>();
        if (!string.IsNullOrWhiteSpace(answer1))
            answers.Add(new Answer { QuestionID = question.QuestionID, AnswerText = answer1, IsCorrect = correctAnswerIndex == 1 });
        if (!string.IsNullOrWhiteSpace(answer2))
            answers.Add(new Answer { QuestionID = question.QuestionID, AnswerText = answer2, IsCorrect = correctAnswerIndex == 2 });
        if (!string.IsNullOrWhiteSpace(answer3))
            answers.Add(new Answer { QuestionID = question.QuestionID, AnswerText = answer3, IsCorrect = correctAnswerIndex == 3 });
        if (!string.IsNullOrWhiteSpace(answer4))
            answers.Add(new Answer { QuestionID = question.QuestionID, AnswerText = answer4, IsCorrect = correctAnswerIndex == 4 });

        db.Answers.AddRange(answers);
        await db.SaveChangesAsync();

        // Gán câu hỏi vào đề thi
        var maxDisplayOrder = await db.ExamQuestions
            .Where(eq => eq.ExamID == examId)
            .Select(eq => (int?)eq.DisplayOrder)
            .MaxAsync() ?? 0;

        var examQuestion = new ExamQuestion
        {
            ExamID = examId,
            QuestionID = question.QuestionID,
            DisplayOrder = maxDisplayOrder + 1
        };

        db.ExamQuestions.Add(examQuestion);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            success = true,
            questionId = question.QuestionID,
            message = "Thêm câu hỏi thành công"
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new
        {
            success = false,
            message = $"Lỗi: {ex.Message}"
        });
    }
});

app.MapFallbackToFile("/index.html");

app.Run();
