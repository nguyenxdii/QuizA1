namespace QuizA1.Models;

public class Exam
{
    public int ExamID { get; set; }
    public string ExamName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Navigation properties
    public ICollection<ExamQuestion> ExamQuestions { get; set; } = new List<ExamQuestion>();
}
