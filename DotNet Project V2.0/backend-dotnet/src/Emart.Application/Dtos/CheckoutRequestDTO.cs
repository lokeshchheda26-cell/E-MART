namespace Emart.Application.Dtos;

/// <summary>
/// What the Checkout page submits. DeliveryOption is a plain string ("COURIER" or "PICKUP")
/// rather than the enum type directly, so a bad/unknown value fails with a clean validation-style
/// message instead of a deserialization error.
/// </summary>
public class CheckoutRequestDTO
{
    public string DeliveryOption { get; set; } = null!;

    /// <summary>Required when DeliveryOption = COURIER. Falls back to the user's profile address if left blank.</summary>
    public string? ShippingAddress { get; set; }

    /// <summary>Only meaningful when DeliveryOption = PICKUP.</summary>
    public string? StoreLocation { get; set; }
}
