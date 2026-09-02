using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Emart.Domain.Entities;

/// <summary>
/// Stores the specification value for a product against a specific config (e.g. Product 10 -&gt;
/// RAM -&gt; "8 GB"). Table: prod_dtl_master.
/// </summary>
[Table("prod_dtl_master")]
public class ProductSpecification
{
    [Key]
    [Column("prod_dtl_id")]
    public long ProdDtlId { get; set; }

    [Required]
    [Column("prod_id")]
    public long ProductId { get; set; }

    public Product Product { get; set; } = null!;

    [Required]
    [Column("config_id")]
    public int ConfigId { get; set; }

    public Config Config { get; set; } = null!;

    [Required]
    [MaxLength(255)]
    [Column("config_value")]
    public string ConfigValue { get; set; } = null!;
}
