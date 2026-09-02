using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Emart.Domain.Common;
using Emart.Domain.Enums;

namespace Emart.Domain.Entities;

[Table("product_master")]
public class Product : IAuditable
{
    [Key]
    [Column("prod_id")]
    public long ProductId { get; set; }

    [Required]
    [Column("catmaster_id")]
    public int CategoryId { get; set; }

    public Category Category { get; set; } = null!;

    [Column("subcat_master_id")]
    public int? SubCategoryId { get; set; }

    public SubCategory? SubCategory { get; set; }

    [Required]
    [StringLength(150, MinimumLength = 3)]
    [Column("prod_name")]
    public string ProductName { get; set; } = null!;

    [Required]
    [MaxLength(255)]
    [Column("prod_short_desc")]
    public string ShortDescription { get; set; } = null!;

    [Column("prod_long_desc")]
    public string? LongDescription { get; set; }

    [Column("prod_image_path")]
    public string? ProductImagePath { get; set; }

    [Required]
    [Column("mrp_price", TypeName = "decimal(10,2)")]
    public decimal MrpPrice { get; set; }

    [Required]
    [Column("cardholder_price", TypeName = "decimal(10,2)")]
    public decimal CardholderPrice { get; set; }

    [MaxLength(100)]
    [Column("brand")]
    public string? Brand { get; set; }

    [Required]
    [Column("stock")]
    public int Stock { get; set; }

    [Required]
    [Column("points_to_be_redeemed")]
    public int PointsToBeRedeemed { get; set; }

    /// <summary>
    /// The eMCard offer, made explicit instead of leaving pricing code to infer it from
    /// (mrpPrice, cardholderPrice, pointsToBeRedeemed). Nullable so rows created before this
    /// column existed keep working; <see cref="NormaliseOffer"/> fills it in when null.
    /// </summary>
    [Column("offer_type")]
    public ProductOfferType? OfferType { get; set; }

    /// <summary>
    /// Points a cardholder must redeem PER UNIT under the offer. Authoritative for pricing; kept
    /// in sync with the legacy pointsToBeRedeemed column by <see cref="NormaliseOffer"/>.
    /// </summary>
    [Column("points_required")]
    public int? PointsRequired { get; set; }

    /// <summary>
    /// Cash a cardholder must pay PER UNIT under the offer (0 for a full redemption).
    /// Authoritative for pricing; kept in sync with the legacy cardholderPrice column.
    /// </summary>
    [Column("cash_required", TypeName = "decimal(10,2)")]
    public decimal? CashRequired { get; set; }

    /// <summary>
    /// What the product card is allowed to show. Every viewer now sees the real offer terms
    /// (member or not) - a non-member just gets a disabled checkbox in the frontend instead of
    /// an active one; enforcement of who can actually redeem stays server-side in EmcardService.
    /// </summary>
    [Column("display_type")]
    public ProductDisplayType? DisplayType { get; set; }

    [Required]
    [Column("status")]
    public bool Status { get; set; } = true;

    /// <summary>
    /// Drives the homepage Sale Banner - only products with OnSale = true AND a SaleEndDate
    /// still in the future are eligible to be picked.
    /// </summary>
    [Required]
    [Column("on_sale")]
    public bool OnSale { get; set; } = false;

    [Column("sale_price", TypeName = "decimal(10,2)")]
    public decimal? SalePrice { get; set; }

    [Column("sale_end_date")]
    public DateTime? SaleEndDate { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // =========================
    // RESOLVED OFFER (read-only, not a column)
    //
    // Every product-listing endpoint returns this entity as-is, and the listing cards need to
    // know which purchase mode a product is sold under. offer_type alone is not enough: a row
    // written before that column existed still has it null.
    // =========================

    [NotMapped]
    [JsonPropertyName("resolvedOfferType")]
    public ProductOfferType ResolvedOfferType =>
        OfferType ?? Enums.ProductOfferTypeExtensions.Derive(MrpPrice, CardholderPrice, PointsToBeRedeemed);

    /// <summary>Cash per unit under the offer, legacy column as the fallback.</summary>
    [NotMapped]
    [JsonPropertyName("resolvedCashRequired")]
    public decimal ResolvedCashRequired => CashRequired ?? (CardholderPrice != 0 ? CardholderPrice : MrpPrice);

    /// <summary>Points per unit under the offer, legacy column as the fallback.</summary>
    [NotMapped]
    [JsonPropertyName("resolvedPointsRequired")]
    public int ResolvedPointsRequired => PointsRequired ?? PointsToBeRedeemed;

    // =========================
    // OFFER NORMALISATION
    //
    // The four offer columns above are the authoritative model, but the pre-existing columns
    // (CardholderPrice, PointsToBeRedeemed) are still what the admin CRUD screens and the
    // existing product APIs read/write. Keeping two representations of the same fact is exactly
    // how data drifts, so this runs on every insert and update (see EmartDbContext.SaveChanges)
    // and makes them agree - ported byte-for-byte from Product.normaliseOffer() in the Java
    // source, including which branch writes back to which legacy column.
    // =========================
    public void NormaliseOffer()
    {
        OfferType ??= Enums.ProductOfferTypeExtensions.Derive(MrpPrice, CardholderPrice, PointsToBeRedeemed);

        if (CashRequired == null)
        {
            CashRequired = OfferType switch
            {
                ProductOfferType.FULL_REDEMPTION => 0m,
                ProductOfferType.EMCARD_PRICE or ProductOfferType.PARTIAL_REDEMPTION => CardholderPrice,
                ProductOfferType.NORMAL => MrpPrice,
                _ => 0m
            };
        }

        if (PointsRequired == null)
        {
            PointsRequired = OfferType switch
            {
                ProductOfferType.FULL_REDEMPTION or ProductOfferType.PARTIAL_REDEMPTION => PointsToBeRedeemed,
                ProductOfferType.EMCARD_PRICE or ProductOfferType.NORMAL => 0,
                _ => 0
            };
        }

        // Write the authoritative values back onto the legacy columns so nothing that still
        // reads them goes stale. CardholderPrice is NOT NULL with a positive-only check, so a
        // full redemption (CashRequired = 0) keeps MRP there rather than 0 - which is also what
        // makes ProductOfferType.Derive() classify it as points-only.
        if (OfferType is ProductOfferType.EMCARD_PRICE or ProductOfferType.PARTIAL_REDEMPTION)
        {
            CardholderPrice = CashRequired!.Value;
        }
        else if (CardholderPrice == 0)
        {
            CardholderPrice = MrpPrice;
        }

        PointsToBeRedeemed = PointsRequired!.Value;

        DisplayType = ProductDisplayTypeExtensions.ForOfferType(OfferType);
    }
}
