using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IEmcardTransactionRepository : IGenericRepository<EmcardTransaction>
{
    /// <summary>Newest first - what the "my points history" screen shows.</summary>
    Task<IReadOnlyList<EmcardTransaction>> FindByUserIdOrderByTxnIdDescAsync(long userId, CancellationToken ct = default);

    Task<IReadOnlyList<EmcardTransaction>> FindByOrderIdOrderByTxnIdAscAsync(long orderId, CancellationToken ct = default);
}
