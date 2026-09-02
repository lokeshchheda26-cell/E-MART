namespace Emart.Application.Common.Exceptions;

/// <summary>
/// Thrown when an eMCard operation would leave the account with a negative balance, or when a
/// non-member tries to redeem points. Mapped to HTTP 400. Thrown from inside the checkout
/// transaction, it rolls back the ENTIRE checkout - order, order items, stock decrement and
/// point mutation together.
/// </summary>
public class InsufficientPointsException : Exception
{
    public InsufficientPointsException(string message) : base(message)
    {
    }
}
