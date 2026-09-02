namespace Emart.Domain.Enums;

/// <summary>
/// Why an eMCard point balance changed. One row per reason, so a checkout that both redeems and
/// earns produces two ledger rows rather than one netted row - that way the invoice's "points
/// redeemed" and "points earned" lines can each be traced back to a real record.
/// </summary>
public enum EmcardTransactionType
{
    /// <summary>Points granted when the eMCard account is first opened.</summary>
    CREDIT_INITIAL,

    /// <summary>Points spent redeeming products at checkout.</summary>
    REDEEM,

    /// <summary>Points earned as a configured percentage of the cash actually paid at checkout.</summary>
    EARN
}
