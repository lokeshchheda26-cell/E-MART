using Emart.Domain.Entities;

namespace Emart.Application.Services.Interfaces;

/// <summary>
/// Resolves the Google-authenticated visitor to a local User: links to an existing
/// email-matched account (registered normally), or creates a new GOOGLE-provider one.
/// Mirrors the Java CustomOAuth2UserService.
/// </summary>
public interface IGoogleAccountLinker
{
    Task<User> LinkOrCreateAsync(string email, string firstName, string lastName, CancellationToken ct = default);
}
