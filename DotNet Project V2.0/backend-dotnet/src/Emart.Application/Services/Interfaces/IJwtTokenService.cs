namespace Emart.Application.Services.Interfaces;

public interface IJwtTokenService
{
    /// <summary>Generates a signed JWT for the given email (the "sub" claim), 24h expiry.</summary>
    string GenerateToken(string email);

    string? ExtractEmail(string token);

    bool IsTokenExpired(string token);

    bool IsTokenValid(string token, string email);
}
