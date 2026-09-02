using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Domain.Enums;

namespace Emart.Infrastructure.Auth;

public class GoogleAccountLinker : IGoogleAccountLinker
{
    // Google-only users have no local password. This value can never match a real bcrypt
    // comparison, so email/password login stays impossible for this account unless they
    // separately set a password later.
    private const string NoPasswordSentinel = "OAUTH2_GOOGLE_ACCOUNT_NO_PASSWORD";

    private readonly IUserRepository _userRepository;

    public GoogleAccountLinker(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<User> LinkOrCreateAsync(string email, string firstName, string lastName, CancellationToken ct = default)
    {
        // If someone already registered with this email using normal login, this links their
        // Google login to the SAME account.
        var existing = await _userRepository.FindByEmailAsync(email, ct);
        if (existing is not null)
        {
            return existing;
        }

        var newUser = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Role = Role.CUSTOMER,
            AuthProvider = AuthProvider.GOOGLE,
            IsEmcardMember = false,
            EmcardPoints = 0,
            Password = NoPasswordSentinel
        };

        var saved = await _userRepository.AddAsync(newUser, ct);
        await _userRepository.SaveChangesAsync(ct);
        return saved;
    }
}
