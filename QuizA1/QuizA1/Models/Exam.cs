using System.ComponentModel.DataAnnotations.Schema;

namespace QuizA1.Models;

public class Exam
{
    public int ExamID { get; set; }
    public string ExamName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Map to legacy "Inactive" column so existing data stays compatible.
    [Column("Inactive")]
    public bool Inactive { get; set; } = false;

    [NotMapped]
    public bool IsActive
    {
        get => !Inactive;
        set => Inactive = !value;
    }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Navigation properties
    public ICollection<ExamQuestion> ExamQuestions { get; set; } = new List<ExamQuestion>();
}
