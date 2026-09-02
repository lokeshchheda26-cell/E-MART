using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Emart.Domain.Entities;

[Table("category_master")]
public class Category
{
    [Key]
    [Column("catmaster_id")]
    public int CatmasterId { get; set; }

    [Column("cat_id")]
    public string? CatId { get; set; }

    [Column("subcat_id")]
    public string? SubcatId { get; set; }

    [Column("cat_name")]
    public string? CatName { get; set; }

    [Column("cat_image_path")]
    public string? CatImagePath { get; set; }

    [Column("flag")]
    public bool? Flag { get; set; }
}
