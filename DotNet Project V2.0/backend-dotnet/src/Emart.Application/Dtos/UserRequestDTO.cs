using Emart.Domain.Enums;

namespace Emart.Application.Dtos;

public class UserRequestDTO
{
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    // Nullable: UpdateUserAsync treats a blank password as "leave it unchanged", so this can't be
    // implicitly required the way a non-nullable reference type would be under ASP.NET Core's
    // built-in model validation. RegisterAsync enforces its own non-empty check where it IS
    // mandatory.
    public string? Password { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public Gender? Gender { get; set; }
    public DateOnly? Dob { get; set; }
    public bool IsEmcardMember { get; set; } = false;
}
