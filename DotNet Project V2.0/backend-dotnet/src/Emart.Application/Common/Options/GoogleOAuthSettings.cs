namespace Emart.Application.Common.Options;

public class GoogleOAuthSettings
{
    public const string SectionName = "GoogleOAuth";

    public string ClientId { get; set; } = null!;

    public string ClientSecret { get; set; } = null!;

    /// <summary>Where the frontend should land after Google login, with ?token=&amp;type=Bearer appended.</summary>
    public string RedirectUri { get; set; } = "http://localhost:5173/oauth2/redirect";
}
