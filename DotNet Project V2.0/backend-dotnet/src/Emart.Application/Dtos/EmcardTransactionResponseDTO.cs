namespace Emart.Application.Dtos;

public class EmcardTransactionResponseDTO
{
    public long TxnId { get; set; }
    public long? OrderId { get; set; }
    public string? Type { get; set; }
    public int Points { get; set; }
    public int BalanceBefore { get; set; }
    public int BalanceAfter { get; set; }
    public DateTime CreatedAt { get; set; }

    public EmcardTransactionResponseDTO()
    {
    }

    public EmcardTransactionResponseDTO(long txnId, long? orderId, string? type, int points, int balanceBefore, int balanceAfter, DateTime createdAt)
    {
        TxnId = txnId;
        OrderId = orderId;
        Type = type;
        Points = points;
        BalanceBefore = balanceBefore;
        BalanceAfter = balanceAfter;
        CreatedAt = createdAt;
    }
}
