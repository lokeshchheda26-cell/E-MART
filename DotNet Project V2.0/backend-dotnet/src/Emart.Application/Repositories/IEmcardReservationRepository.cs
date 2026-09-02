using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IEmcardReservationRepository : IGenericRepository<EmcardReservation>
{
    Task<IReadOnlyList<EmcardReservation>> FindByUserIdAsync(long userId, CancellationToken ct = default);

    Task<EmcardReservation?> FindByUserIdAndProductIdAsync(long userId, long productId, CancellationToken ct = default);

    /// <summary>Sum of points currently held for this user across every EMCard-selected product. Never null.</summary>
    Task<int> SumReservedPointsByUserIdAsync(long userId, CancellationToken ct = default);

    Task DeleteByUserIdAndProductIdAsync(long userId, long productId, CancellationToken ct = default);

    Task DeleteAllByUserIdAsync(long userId, CancellationToken ct = default);
}
