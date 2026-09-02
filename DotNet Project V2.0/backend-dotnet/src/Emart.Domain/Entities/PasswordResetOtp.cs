using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Emart.Domain.Entities;

/// <summary>
/// One row per forgot-password OTP request. The OTP itself is never stored in plain text - only
/// a bcrypt hash of it. Each row is single-use and time-boxed; AuthService deletes any older rows
/// for the same email before issuing a new OTP so only the most recent request is ever valid.
/// </summary>
[Table("password_reset_otp")]
public class PasswordResetOtp
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("email")]
    public string Email { get; set; } = null!;

    [Required]
    [MaxLength(255)]
    [Column("otp_hash")]
    public string OtpHash { get; set; } = null!;

    [Required]
    [Column("expiry_time")]
    public DateTime ExpiryTime { get; set; }

    [Required]
    [Column("used")]
    public bool Used { get; set; } = false;

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public PasswordResetOtp()
    {
    }

    public PasswordResetOtp(string email, string otpHash, DateTime expiryTime)
    {
        Email = email;
        OtpHash = otpHash;
        ExpiryTime = expiryTime;
        Used = false;
        CreatedAt = DateTime.UtcNow;
    }
}
