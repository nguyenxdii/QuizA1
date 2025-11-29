namespace QuizA1.Models;

public class Question
{
    public int QuestionID { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public byte[]? ImageData { get; set; }
    public string? ImageFileName { get; set; }
    public string? ImageMimeType { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Navigation properties
    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    public ICollection<ExamQuestion> ExamQuestions { get; set; } = new List<ExamQuestion>();
}
