using System.Security.Claims;

namespace Emart.Api.Auth;

/// <summary>
/// Reads the claims added by <see cref="JwtBearerEventsSetup"/> during token validation -
/// the .NET equivalent of reading Spring's CustomUserDetails principal in a controller.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public const string EmcardMemberClaimType = "emcard_member";

    public static long? GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : null;
    }

    public static string? GetEmail(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Email);

    public static string? GetFirstName(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.GivenName);

    public static string? GetLastName(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Surname);

    public static string? GetRole(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Role);

    public static bool IsEmcardMember(this ClaimsPrincipal user) =>
        bool.TryParse(user.FindFirstValue(EmcardMemberClaimType), out var isMember) && isMember;
}
