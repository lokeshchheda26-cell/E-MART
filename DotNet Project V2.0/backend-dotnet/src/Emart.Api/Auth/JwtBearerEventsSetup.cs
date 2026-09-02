using System.Security.Claims;
using System.Text.Json;
using Emart.Application.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace Emart.Api.Auth;

/// <summary>
/// The Java JWT carries only `sub` (email) - every request re-loads the User from the database
/// by email and derives authorities from the live row (JwtAuthenticationFilter +
/// CustomUserDetailsService). This does the same: on successful token validation, load the user
/// and enrich the ClaimsPrincipal with userId/name/role/emcard-member claims so downstream
/// [Authorize(Roles=...)] checks and controllers see live data, not stale token claims.
/// </summary>
public static class JwtBearerEventsSetup
{
    public static JwtBearerEvents Create() => new()
    {
        OnTokenValidated = async context =>
        {
            var email = context.Principal?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                ?? context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(email))
            {
                context.Fail("Token has no subject.");
                return;
            }

            var userRepository = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
            var user = await userRepository.FindByEmailAsync(email, context.HttpContext.RequestAborted);

            if (user is null)
            {
                context.Fail("User not found.");
                return;
            }

            var identity = (ClaimsIdentity)context.Principal!.Identity!;
            identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()));
            identity.AddClaim(new Claim(ClaimTypes.Email, user.Email));
            identity.AddClaim(new Claim(ClaimTypes.GivenName, user.FirstName));
            identity.AddClaim(new Claim(ClaimTypes.Surname, user.LastName));
            identity.AddClaim(new Claim(ClaimTypes.Role, user.Role.ToString()));
            identity.AddClaim(new Claim(ClaimsPrincipalExtensions.EmcardMemberClaimType, user.IsEmcardMember.ToString()));
        },

        // Matches SecurityConfig's custom authenticationEntryPoint: a plain JSON body instead of
        // the framework's default WWW-Authenticate challenge response.
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = "Unauthorized. Please log in." }));
        },

        // Matches SecurityConfig's custom accessDeniedHandler.
        OnForbidden = async context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = "Access denied." }));
        }
    };
}
