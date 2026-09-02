using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Emart.Domain.Common;

namespace Emart.Domain.Entities;

/// <summary>
/// Holds the EMCard (loyalty points) balance for a user. There is exactly one row per user.
/// Table: emcard_account.
/// </summary>
[Table("emcard_account")]
public class EmcardAccount : IAuditable
{
    [Key]
    [Column("account_id")]
    public long AccountId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    [Column("total_points")]
    public int TotalPoints { get; set; }

    /// <summary>
    /// Optimistic lock (defence-in-depth alongside the pessimistic row lock taken explicitly in
    /// EmcardService). Configured as a concurrency token in EmartDbContext; incremented manually
    /// by EmcardService on every update to mirror JPA's @Version auto-increment-on-flush.
    /// </summary>
    [Column("version")]
    public long Version { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public EmcardAccount()
    {
    }

    public EmcardAccount(long userId, int totalPoints)
    {
        UserId = userId;
        TotalPoints = totalPoints;
    }
}
