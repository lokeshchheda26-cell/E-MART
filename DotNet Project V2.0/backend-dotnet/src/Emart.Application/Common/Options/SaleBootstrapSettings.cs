namespace Emart.Application.Common.Options;

/// <summary>Startup demo/dev convenience for the homepage Sale Banner. Off in a real deployment.</summary>
public class SaleBootstrapSettings
{
    public const string SectionName = "SaleBootstrap";

    public bool Enabled { get; set; } = true;

    public int ProductCount { get; set; } = 3;

    public int DiscountPercent { get; set; } = 25;

    public long DurationHours { get; set; } = 48;
}
