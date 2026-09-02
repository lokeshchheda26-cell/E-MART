using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Emart.Application.Common.Options;
using Emart.Application.Services.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Emart.Infrastructure.Auth;

/// <summary>
/// HS256 JWT issuance/validation. Claims are deliberately minimal (sub + iat + exp, no
/// roles/userId) to match the Java JwtService exactly - every request re-loads the User from the
/// database by email, so the token itself carries no authorization data.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;
    private readonly SymmetricSecurityKey _signingKey;

    public JwtTokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
        _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
    }

    public string GenerateToken(string email)
    {
        var now = DateTime.UtcNow;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, email)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            notBefore: now,
            expires: now.AddHours(_settings.ExpirationHours),
            signingCredentials: new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256));

        // iat is not set by the JwtSecurityToken constructor above - add it explicitly so it's
        // present exactly like the Java Jwts.builder().issuedAt(...) call.
        token.Payload[JwtRegisteredClaimNames.Iat] = new DateTimeOffset(now).ToUnixTimeSeconds();

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string? ExtractEmail(string token)
    {
        var claims = ParseClaims(token);
        return claims?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    }

    public bool IsTokenExpired(string token)
    {
        var claims = ParseClaims(token);
        var exp = claims?.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;

        if (exp is null || !long.TryParse(exp, out var expSeconds))
        {
            return true;
        }

        return DateTimeOffset.FromUnixTimeSeconds(expSeconds) < DateTimeOffset.UtcNow;
    }

    public bool IsTokenValid(string token, string email)
    {
        var extracted = ExtractEmail(token);
        return extracted == email && !IsTokenExpired(token);
    }

    private ClaimsPrincipal? ParseClaims(string token)
    {
        // JwtSecurityTokenHandler remaps short claim names ("sub" etc) to long legacy XML/SOAP
        // claim URIs by default (JwtRegisteredClaimNames.Sub -> ClaimTypes.NameIdentifier) unless
        // this is disabled - without it, FindFirst(JwtRegisteredClaimNames.Sub) below would never
        // match and every token would silently fail to extract its email.
        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };

        try
        {
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _signingKey
            }, out _);
        }
        catch (Exception)
        {
            return null;
        }
    }
}
