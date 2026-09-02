using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IUserRepository : IGenericRepository<User>
{
    Task<User?> FindByEmailAsync(string email, CancellationToken ct = default);

    Task<User?> FindByPhoneAsync(string phone, CancellationToken ct = default);

    Task<bool> ExistsByEmailAsync(string email, CancellationToken ct = default);

    Task<bool> ExistsByPhoneAsync(string phone, CancellationToken ct = default);
}
