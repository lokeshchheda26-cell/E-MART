using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IPasswordResetOtpRepository : IGenericRepository<PasswordResetOtp>
{
    /// <summary>Most recent OTP issued for this email - the only one resetPassword() ever checks against.</summary>
    Task<PasswordResetOtp?> FindTopByEmailOrderByCreatedAtDescAsync(string email, CancellationToken ct = default);

    /// <summary>Wipes any previously-issued OTP(s) for this email so a fresh request invalidates older ones.</summary>
    Task DeleteByEmailAsync(string email, CancellationToken ct = default);
}
