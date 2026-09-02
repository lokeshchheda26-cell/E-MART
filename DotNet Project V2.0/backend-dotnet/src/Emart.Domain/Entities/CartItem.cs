using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Emart.Domain.Common;

namespace Emart.Domain.Entities;

/// <summary>
/// A single product line in a <see cref="Cart"/> (table: cart_item).
/// Deliberately does NOT snapshot price or "EMCard applied" here - both are always derived live.
/// </summary>
[Table("cart_item")]
public class CartItem : IAuditable
{
    [Key]
    [Column("cart_item_id")]
    public long CartItemId { get; set; }

    [Required]
    [Column("cart_id")]
    public long CartId { get; set; }

    public Cart Cart { get; set; } = null!;

    [Required]
    [Column("prod_id")]
    public long ProductId { get; set; }

    public Product Product { get; set; } = null!;

    [Required]
    [Range(1, int.MaxValue)]
    [Column("quantity")]
    public int Quantity { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public CartItem()
    {
    }

    public CartItem(Cart cart, Product product, int quantity)
    {
        Cart = cart;
        Product = product;
        Quantity = quantity;
    }
}
