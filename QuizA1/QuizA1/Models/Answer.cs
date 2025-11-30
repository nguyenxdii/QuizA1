using System.ComponentModel.DataAnnotations.Schema;

namespace QuizA1.Models;

public class Answer
{
    public int AnswerID { get; set; }
    public int QuestionID { get; set; }
    public string AnswerText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; } = false;

    [Column("Inactive")]
    public bool Inactive { get; set; } = false;

    [NotMapped]
    public bool IsActive
    {
        get => !Inactive;
        set => Inactive = !value;
    }

    // Navigation property
    public Question Question { get; set; } = null!;
}
