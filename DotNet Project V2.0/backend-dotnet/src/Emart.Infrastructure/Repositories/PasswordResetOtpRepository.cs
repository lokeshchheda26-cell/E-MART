using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class PasswordResetOtpRepository : GenericRepository<PasswordResetOtp>, IPasswordResetOtpRepository
{
    public PasswordResetOtpRepository(EmartDbContext context) : base(context)
    {
    }

    public Task<PasswordResetOtp?> FindTopByEmailOrderByCreatedAtDescAsync(string email, CancellationToken ct = default) =>
        Set.Where(o => o.Email == email).OrderByDescending(o => o.CreatedAt).FirstOrDefaultAsync(ct);

    public async Task DeleteByEmailAsync(string email, CancellationToken ct = default) =>
        await Set.Where(o => o.Email == email).ExecuteDeleteAsync(ct);
}
