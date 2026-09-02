using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Emart.Domain.Common;
using Emart.Domain.Enums;

namespace Emart.Domain.Entities;

/// <summary>
/// A placed order (table: orders). Everything money/points related is snapshotted at checkout
/// time rather than recomputed later, so an order's invoice never changes even if a product's
/// price changes afterwards.
/// </summary>
[Table("orders")]
public class Orders : IAuditable
{
    [Key]
    [Column("order_id")]
    public long OrderId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    [MaxLength(150)]
    [Column("customer_name")]
    public string? CustomerName { get; set; }

    [MaxLength(150)]
    [Column("customer_email")]
    public string? CustomerEmail { get; set; }

    [Required]
    [Column("delivery_option")]
    public DeliveryOption DeliveryOption { get; set; }

    [Column("shipping_address")]
    public string? ShippingAddress { get; set; }

    [MaxLength(255)]
    [Column("store_location")]
    public string? StoreLocation { get; set; }

    [Required]
    [Column("subtotal", TypeName = "decimal(12,2)")]
    public decimal Subtotal { get; set; }

    [Required]
    [Column("total_savings", TypeName = "decimal(12,2)")]
    public decimal TotalSavings { get; set; }

    [Required]
    [Column("payable_total", TypeName = "decimal(12,2)")]
    public decimal PayableTotal { get; set; }

    [Required]
    [Column("points_redeemed")]
    public int PointsRedeemed { get; set; } = 0;

    [Required]
    [Column("points_earned")]
    public int PointsEarned { get; set; } = 0;

    /// <summary>eMCard balance immediately BEFORE this order settled (snapshotted for stable invoices).</summary>
    [Required]
    [Column("points_balance_before")]
    public int PointsBalanceBefore { get; set; } = 0;

    /// <summary>eMCard balance immediately AFTER this order settled. Invariant: after = before - redeemed + earned.</summary>
    [Required]
    [Column("points_balance_after")]
    public int PointsBalanceAfter { get; set; } = 0;

    [Required]
    [Column("payment_status")]
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.PENDING;

    [Required]
    [Column("order_date")]
    public DateTime OrderDate { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
