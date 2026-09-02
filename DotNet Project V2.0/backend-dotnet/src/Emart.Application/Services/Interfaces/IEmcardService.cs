using Emart.Application.Dtos;

namespace Emart.Application.Services.Interfaces;

public interface IEmcardService
{
    Task<EmcardStatusDTO> GetSummaryAsync(long userId, CancellationToken ct = default);

    /// <summary>
    /// Upgrades an already-registered CUSTOMER to eMCard membership: flips IsEmcardMember,
    /// opens an EmcardAccount, and grants the same 100-point joining bonus a new registration
    /// gets when eMCard is chosen at signup (see AuthService.RegisterAsync). No monetary cost -
    /// there is no "purchase" in this data model, just the opt-in.
    /// </summary>
    Task<EmcardStatusDTO> JoinMembershipAsync(long userId, CancellationToken ct = default);

    /// <summary>
    /// Reserves the eMCard offer for this product. `emcardQuantity` is how many of the product's
    /// units currently in the cart should take the offer (the rest pay the regular price in the
    /// same line); omit it to opt in for the full cart quantity, same as a plain checkbox click.
    /// </summary>
    Task<EmcardStatusDTO> ReserveAsync(long userId, long productId, int? emcardQuantity, CancellationToken ct = default);

    Task<EmcardStatusDTO> ReleaseAsync(long userId, long productId, CancellationToken ct = default);

    Task<EmcardStatusDTO> ReleaseAllAsync(long userId, CancellationToken ct = default);

    Task<EmcardSettlementDTO> SettleCheckoutAsync(long userId, long? orderId, int pointsToRedeem, decimal paidAmount, CancellationToken ct = default);

    Task<IReadOnlyList<EmcardTransactionResponseDTO>> GetTransactionsAsync(long userId, CancellationToken ct = default);
}
