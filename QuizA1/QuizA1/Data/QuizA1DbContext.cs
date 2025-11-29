using Microsoft.EntityFrameworkCore;
using QuizA1.Models;

namespace QuizA1.Data;

public class QuizA1DbContext : DbContext
{
    public QuizA1DbContext(DbContextOptions<QuizA1DbContext> options) : base(options)
    {
    }

    public DbSet<Exam> Exams { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Answer> Answers { get; set; }
    public DbSet<ExamQuestion> ExamQuestions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure ExamQuestion composite key
        modelBuilder.Entity<ExamQuestion>()
            .HasKey(eq => new { eq.ExamID, eq.QuestionID });

        // Configure relationships
        modelBuilder.Entity<ExamQuestion>()
            .HasOne(eq => eq.Exam)
            .WithMany(e => e.ExamQuestions)
            .HasForeignKey(eq => eq.ExamID);

        modelBuilder.Entity<ExamQuestion>()
            .HasOne(eq => eq.Question)
            .WithMany(q => q.ExamQuestions)
            .HasForeignKey(eq => eq.QuestionID);

        modelBuilder.Entity<Answer>()
            .HasOne(a => a.Question)
            .WithMany(q => q.Answers)
            .HasForeignKey(a => a.QuestionID);

        // Configure ImageData as VARBINARY(MAX)
        modelBuilder.Entity<Question>()
            .Property(q => q.ImageData)
            .HasColumnType("VARBINARY(MAX)");
    }
}
