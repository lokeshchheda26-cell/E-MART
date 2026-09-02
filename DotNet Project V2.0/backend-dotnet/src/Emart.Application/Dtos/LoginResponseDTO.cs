namespace Emart.Application.Dtos;

public class LoginResponseDTO
{
    public string Token { get; set; } = null!;
    public string Type { get; set; } = "Bearer";
    public long UserId { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public bool IsEmcardMember { get; set; }
}
