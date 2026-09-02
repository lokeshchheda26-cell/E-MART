namespace Emart.Domain.Enums;

/// <summary>
/// Payment state of an Order. This project simulates the "credit card verification page" the
/// BRD describes (no real payment gateway) - PAID is set synchronously once the mock Pay step succeeds.
/// </summary>
public enum PaymentStatus
{
    PENDING,
    PAID,
    FAILED,
    CANCELLED
}
