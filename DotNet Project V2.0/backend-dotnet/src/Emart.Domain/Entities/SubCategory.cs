using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Emart.Domain.Entities;

[Table("subcategory_master")]
public class SubCategory
{
    [Key]
    [Column("subcat_master_id")]
    public int SubcatMasterId { get; set; }

    [Column("subcat_id")]
    public string? SubcatId { get; set; }

    [Column("subcat_name")]
    public string? SubcatName { get; set; }

    [Column("subcat_image_path")]
    public string? SubcatImagePath { get; set; }

    [Column("flag")]
    public bool? Flag { get; set; }

    [Column("catmaster_id")]
    public int? CatmasterId { get; set; }

    public Category? Category { get; set; }
}
