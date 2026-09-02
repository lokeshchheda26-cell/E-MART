namespace Emart.Application.Common.Options;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    /// <summary>Minimum 32-byte secret for HS256. Must come from config/secret-store, never a literal in source.</summary>
    public string SecretKey { get; set; } = null!;

    public int ExpirationHours { get; set; } = 24;
}
