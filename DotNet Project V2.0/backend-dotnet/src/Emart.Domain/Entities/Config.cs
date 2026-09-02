using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Emart.Domain.Entities;

/// <summary>
/// Master list of specification/configuration names that can be attached to a product
/// (RAM, Storage, Color, etc). Table: config_master.
/// </summary>
[Table("config_master")]
public class Config
{
    [Key]
    [Column("config_id")]
    public int ConfigId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("config_name")]
    public string ConfigName { get; set; } = null!;
}
