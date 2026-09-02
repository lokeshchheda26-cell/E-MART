using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Emart.Domain.Common;

namespace Emart.Domain.Entities;

/// <summary>
/// Represents EMCard points currently "held" against a product that a user has ticked the
/// EMCard checkbox for. One row = one (userId, prodId) pair - unique constraint
/// uq_emcard_user_product makes reserve/release idempotent and race-safe. Table: emcard_reservation.
/// </summary>
[Table("emcard_reservation")]
public class EmcardReservation : IAuditable
{
    [Key]
    [Column("reservation_id")]
    public long ReservationId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    [Required]
    [Column("prod_id")]
    public long ProductId { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    [Column("points_reserved")]
    public int PointsReserved { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public EmcardReservation()
    {
    }

    public EmcardReservation(long userId, long productId, int pointsReserved)
    {
        UserId = userId;
        ProductId = productId;
        PointsReserved = pointsReserved;
    }
}
