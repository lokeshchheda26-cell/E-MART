using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class UserRepository : GenericRepository<User>, IUserRepository
{
    public UserRepository(EmartDbContext context) : base(context)
    {
    }

    public Task<User?> FindByEmailAsync(string email, CancellationToken ct = default) =>
        Set.FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<User?> FindByPhoneAsync(string phone, CancellationToken ct = default) =>
        Set.FirstOrDefaultAsync(u => u.Phone == phone, ct);

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken ct = default) =>
        Set.AnyAsync(u => u.Email == email, ct);

    public Task<bool> ExistsByPhoneAsync(string phone, CancellationToken ct = default) =>
        Set.AnyAsync(u => u.Phone == phone, ct);
}
