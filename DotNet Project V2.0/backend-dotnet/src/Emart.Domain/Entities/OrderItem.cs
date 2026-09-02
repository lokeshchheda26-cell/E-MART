using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Emart.Domain.Entities;

/// <summary>
/// One line of a placed <see cref="Orders"/> (table: order_item). Snapshots the product's
/// name/brand/prices at the moment of checkout in addition to keeping the FK to the live Product
/// row, so the invoice stays accurate even if the product is later renamed, repriced, or deleted.
/// </summary>
[Table("order_item")]
public class OrderItem
{
    [Key]
    [Column("order_item_id")]
    public long OrderItemId { get; set; }

    [Required]
    [Column("order_id")]
    public long OrderId { get; set; }

    public Orders Order { get; set; } = null!;

    [Column("prod_id")]
    public long? ProductId { get; set; }

    public Product? Product { get; set; }

    [MaxLength(150)]
    [Column("product_name_snapshot")]
    public string? ProductNameSnapshot { get; set; }

    [MaxLength(100)]
    [Column("brand_snapshot")]
    public string? BrandSnapshot { get; set; }

    [Required]
    [Column("mrp_price", TypeName = "decimal(10,2)")]
    public decimal MrpPrice { get; set; }

    [Required]
    [Column("unit_price", TypeName = "decimal(10,2)")]
    public decimal UnitPrice { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    [Column("quantity")]
    public int Quantity { get; set; }

    [Required]
    [Column("emcard_applied")]
    public bool EmcardApplied { get; set; } = false;

    [Required]
    [Column("points_redeemed")]
    public int PointsRedeemed { get; set; } = 0;

    [Required]
    [Column("line_total", TypeName = "decimal(12,2)")]
    public decimal LineTotal { get; set; }

    /// <summary>
    /// The purchase mode actually charged for this line, captured at checkout, as its enum name
    /// string. Nullable so rows written before this column existed keep working - OrderService
    /// derives their mode from the stored (MrpPrice, UnitPrice, PointsRedeemed) snapshot instead.
    /// </summary>
    [MaxLength(24)]
    [Column("purchase_mode")]
    public string? PurchaseMode { get; set; }
}
