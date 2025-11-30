namespace QuizA1.Models;

public class ExamQuestion
{
    public int ExamID { get; set; }
    public int QuestionID { get; set; }
    public int? DisplayOrder { get; set; }

    // Navigation properties
    public Exam Exam { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
