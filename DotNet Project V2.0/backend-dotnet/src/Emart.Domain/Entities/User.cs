using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Emart.Domain.Enums;

namespace Emart.Domain.Entities;

[Table("users")]
public class User
{
    [Key]
    [Column("user_id")]
    public long UserId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("first_name")]
    public string FirstName { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    [Column("last_name")]
    public string LastName { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    [Column("email")]
    public string Email { get; set; } = null!;

    [MaxLength(255)]
    [Column("password")]
    public string? Password { get; set; }

    [MaxLength(15)]
    [Column("phone")]
    public string? Phone { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("gender")]
    public Gender? Gender { get; set; }

    [Column("dob")]
    public DateOnly? Dob { get; set; }

    [Required]
    [Column("role")]
    public Role Role { get; set; } = Role.CUSTOMER;

    [Required]
    [Column("is_emcard_member")]
    public bool IsEmcardMember { get; set; } = false;

    [Required]
    [Column("emcard_points")]
    public int EmcardPoints { get; set; } = 0;

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [Required]
    [Column("auth_provider")]
    public AuthProvider AuthProvider { get; set; } = AuthProvider.LOCAL;
}
