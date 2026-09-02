using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Emart.Domain.Common;

namespace Emart.Domain.Entities;

/// <summary>
/// One persisted cart per user (table: cart). Line items live in <see cref="CartItem"/>.
/// userId is stored as a plain long rather than a navigation to User, since it is always taken
/// from the JWT-authenticated principal (never trusted from client input).
/// </summary>
[Table("cart")]
public class Cart : IAuditable
{
    [Key]
    [Column("cart_id")]
    public long CartId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public Cart()
    {
    }

    public Cart(long userId)
    {
        UserId = userId;
    }
}
