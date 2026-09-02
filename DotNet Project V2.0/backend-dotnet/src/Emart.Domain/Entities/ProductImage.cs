using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Emart.Domain.Entities;

/// <summary>
/// A single product image. A product can have multiple images (one-to-many).
/// Table: product_image_master.
/// </summary>
[Table("product_image_master")]
public class ProductImage
{
    [Key]
    [Column("image_id")]
    public long ImageId { get; set; }

    [Required]
    [Column("prod_id")]
    public long ProductId { get; set; }

    public Product Product { get; set; } = null!;

    [Required]
    [MaxLength(500)]
    [Column("image_url")]
    public string ImageUrl { get; set; } = null!;
}
