using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Emart.Domain.Enums;

namespace Emart.Domain.Entities;

/// <summary>
/// Append-only ledger of every change to an eMCard point balance (table: emcard_transaction).
/// Rows are written inside the same locked transaction that mutates emcard_account, so the
/// ledger can never disagree with the balance. Nothing ever updates or deletes a row here.
/// </summary>
[Table("emcard_transaction")]
public class EmcardTransaction
{
    [Key]
    [Column("txn_id")]
    public long TxnId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    /// <summary>The order this movement belongs to, or null for movements not tied to a purchase (e.g. the joining bonus).</summary>
    [Column("order_id")]
    public long? OrderId { get; set; }

    [Required]
    [Column("txn_type")]
    public EmcardTransactionType TxnType { get; set; }

    /// <summary>
    /// Always a positive magnitude. The direction is carried by <see cref="TxnType"/> (REDEEM
    /// debits, EARN/CREDIT_INITIAL credit).
    /// </summary>
    [Required]
    [Column("points")]
    public int Points { get; set; }

    [Required]
    [Column("balance_before")]
    public int BalanceBefore { get; set; }

    [Required]
    [Column("balance_after")]
    public int BalanceAfter { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public EmcardTransaction()
    {
    }

    public EmcardTransaction(long userId, long? orderId, EmcardTransactionType txnType, int points, int balanceBefore, int balanceAfter)
    {
        UserId = userId;
        OrderId = orderId;
        TxnType = txnType;
        Points = points;
        BalanceBefore = balanceBefore;
        BalanceAfter = balanceAfter;
        CreatedAt = DateTime.UtcNow;
    }
}
