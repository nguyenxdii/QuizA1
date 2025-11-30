using Microsoft.EntityFrameworkCore;
using QuizA1.Data;
using QuizA1.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container with a resilient provider fallback
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<QuizA1DbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        options.UseSqlServer(connectionString);
    }
    else
    {
        options.UseSqlite("Data Source=quiz.db");
    }
});

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

// Ensure database exists and seed fallback data to avoid empty states
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<QuizA1DbContext>();
    db.Database.EnsureCreated();

    if (!db.Exams.Any())
    {
        SeedFallbackData(db);
    }
}

// Configure the HTTP request pipeline
app.UseCors();
app.UseStaticFiles();
app.MapGet("/admin", () => Results.Redirect("/admin.html"));

// GET /api/exams - Lấy danh sách 10 đề thi
app.MapGet("/api/exams", async (QuizA1DbContext db) =>
{
    var exams = await db.Exams
        .AsNoTracking()
        .Where(e => !e.Inactive)
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
        .AsNoTracking()
        .Where(e => e.ExamID == examId && !e.Inactive)
        .Select(e => new
        {
            examId = e.ExamID,
            examName = e.ExamName,
            questions = e.ExamQuestions
                .Where(eq => eq.Question != null && !eq.Question.Inactive)
                .OrderBy(eq => eq.DisplayOrder)
                .Select(eq => new
                {
                    questionId = eq.Question!.QuestionID,
                    questionText = eq.Question.QuestionText,
                    hasImage = eq.Question.ImageData != null,
                    explanation = eq.Question.Explanation,
                    answers = eq.Question.Answers
                        .Where(a => !a.Inactive)
                        .OrderBy(a => a.AnswerID)
                        .Select(a => new
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
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error loading exam {examId}: {ex}");
        return Results.Problem($"Lỗi server: {ex.Message}");
    }
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

// GET /api/questions/{questionId} - Lấy chi tiết câu hỏi cho trang admin
app.MapGet("/api/questions/{questionId}", async (int questionId, QuizA1DbContext db) =>
{
    var question = await db.Questions
        .AsNoTracking()
        .Where(q => q.QuestionID == questionId && !q.Inactive)
        .Select(q => new
        {
            questionId = q.QuestionID,
            questionText = q.QuestionText,
            explanation = q.Explanation,
            hasImage = q.ImageData != null,
            answers = q.Answers
                .Where(a => !a.Inactive)
                .OrderBy(a => a.AnswerID)
                .Select(a => new
                {
                    answerId = a.AnswerID,
                    answerText = a.AnswerText,
                    isCorrect = a.IsCorrect
                }).ToList()
        })
        .FirstOrDefaultAsync();

    if (question == null)
    {
        return Results.NotFound(new { success = false, message = "Không tìm thấy câu hỏi" });
    }

    return Results.Ok(question);
});

// PUT /api/questions/{questionId} - Cập nhật câu hỏi và đáp án
app.MapPut("/api/questions/{questionId}", async (int questionId, HttpRequest request, QuizA1DbContext db) =>
{
    try
    {
        var question = await db.Questions.Include(q => q.Answers)
            .FirstOrDefaultAsync(q => q.QuestionID == questionId);

        if (question == null)
        {
            return Results.NotFound(new { success = false, message = "Không tìm thấy câu hỏi" });
        }

        var form = await request.ReadFormAsync();

        question.QuestionText = form["QuestionText"].ToString();
        question.Explanation = form["Explanation"].ToString();
        question.IsActive = true;
        question.CreatedAt = DateTime.Now;

        // Xử lý ảnh nếu gửi kèm
        var imageFile = form.Files.GetFile("Image");
        if (imageFile != null && imageFile.Length > 0)
        {
            using var memoryStream = new MemoryStream();
            await imageFile.CopyToAsync(memoryStream);
            question.ImageData = memoryStream.ToArray();
            question.ImageFileName = imageFile.FileName;
            question.ImageMimeType = imageFile.ContentType;
        }

        // Cập nhật đáp án
        db.Answers.RemoveRange(question.Answers);

        var correctIndex = int.Parse(form["CorrectAnswerIndex"].ToString());
        var answers = new List<Answer>();

        var rawAnswers = new[]
        {
            form["Answer1"].ToString(),
            form["Answer2"].ToString(),
            form["Answer3"].ToString(),
            form["Answer4"].ToString()
        };

        for (int i = 0; i < rawAnswers.Length; i++)
        {
            if (!string.IsNullOrWhiteSpace(rawAnswers[i]))
            {
                answers.Add(new Answer
                {
                    QuestionID = question.QuestionID,
                    AnswerText = rawAnswers[i],
                    IsCorrect = correctIndex == i + 1
                });
            }
        }

        db.Answers.AddRange(answers);

        await db.SaveChangesAsync();

        return Results.Ok(new { success = true, message = "Cập nhật câu hỏi thành công" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { success = false, message = ex.Message });
    }
});

// DELETE /api/exams/{examId}/questions/{questionId} - Xóa câu hỏi khỏi đề thi
app.MapDelete("/api/exams/{examId}/questions/{questionId}", async (int examId, int questionId, QuizA1DbContext db) =>
{
    try
    {
        var examQuestion = await db.ExamQuestions.FirstOrDefaultAsync(eq => eq.ExamID == examId && eq.QuestionID == questionId);
        if (examQuestion == null)
        {
            return Results.NotFound(new { success = false, message = "Không tìm thấy câu hỏi trong đề thi" });
        }

        var question = await db.Questions.Include(q => q.Answers)
            .FirstOrDefaultAsync(q => q.QuestionID == questionId);

        if (question != null)
        {
            db.Answers.RemoveRange(question.Answers);
            db.Questions.Remove(question);
        }

        db.ExamQuestions.Remove(examQuestion);
        await db.SaveChangesAsync();

        return Results.Ok(new { success = true, message = "Đã xóa câu hỏi" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { success = false, message = ex.Message });
    }
});

app.MapFallbackToFile("/index.html");

app.Run();

// Local fallback seed so the UI still works when no SQL Server is available
static void SeedFallbackData(QuizA1DbContext db)
{
    var exam = new Exam
    {
        ExamName = "Đề thi số 1",
        Description = "Bộ câu hỏi mẫu",
        CreatedAt = DateTime.Now,
        IsActive = true
    };

    var question1 = new Question
    {
        QuestionText = "Tại nơi có vạch kẻ đường cho người đi bộ, xe nào cần nhường đường?",
        Explanation = "Luôn ưu tiên người đi bộ tại vạch qua đường.",
        IsActive = true,
        CreatedAt = DateTime.Now,
        Answers = new List<Answer>
        {
            new() { AnswerText = "Xe thô sơ", IsCorrect = false },
            new() { AnswerText = "Xe cơ giới", IsCorrect = false },
            new() { AnswerText = "Cả xe thô sơ và xe cơ giới", IsCorrect = true },
            new() { AnswerText = "Không xe nào", IsCorrect = false }
        }
    };

    var question2 = new Question
    {
        QuestionText = "Trên đường không phân làn, xe nào phải đi sát bên phải?",
        Explanation = "Xe thô sơ đi sát bên phải để đảm bảo an toàn giao thông.",
        IsActive = true,
        CreatedAt = DateTime.Now,
        Answers = new List<Answer>
        {
            new() { AnswerText = "Xe cơ giới", IsCorrect = false },
            new() { AnswerText = "Xe thô sơ", IsCorrect = true },
            new() { AnswerText = "Cả hai loại", IsCorrect = false },
            new() { AnswerText = "Không xe nào", IsCorrect = false }
        }
    };

    db.Exams.Add(exam);
    db.Questions.AddRange(question1, question2);
    db.SaveChanges();

    db.ExamQuestions.AddRange(
        new ExamQuestion { ExamID = exam.ExamID, QuestionID = question1.QuestionID, DisplayOrder = 1 },
        new ExamQuestion { ExamID = exam.ExamID, QuestionID = question2.QuestionID, DisplayOrder = 2 }
    );

    db.SaveChanges();
}
