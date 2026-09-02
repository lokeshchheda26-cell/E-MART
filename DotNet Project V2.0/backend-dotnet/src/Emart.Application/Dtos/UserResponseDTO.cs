using Emart.Domain.Enums;

namespace Emart.Application.Dtos;

public class UserResponseDTO
{
    public long UserId { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public Gender? Gender { get; set; }
    public DateOnly? Dob { get; set; }
    public Role Role { get; set; }
    public bool IsEmcardMember { get; set; }
    public int EmcardPoints { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
