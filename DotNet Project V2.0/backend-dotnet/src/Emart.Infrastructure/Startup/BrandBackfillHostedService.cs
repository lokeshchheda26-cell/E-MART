using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Emart.Infrastructure.Startup;

/// <summary>
/// One-time startup migration: assigns a brand to any product still missing one, matched by a
/// keyword found in the product's own name. Idempotent - only touches blank-brand rows.
/// Mirrors the Java BrandBackfillRunner.
/// </summary>
public class BrandBackfillHostedService : IHostedService
{
    // Ordered so more specific keywords (e.g. "iphone") are checked before generic ones.
    private static readonly (string Keyword, string Brand)[] BrandKeywords =
    [
        ("iphone", "Apple"),
        ("samsung", "Samsung"),
        ("sony", "Sony"),
        ("canon", "Canon"),
        ("nikon", "Nikon"),
        ("daawat", "Daawat"),
        ("india gate", "India Gate"),
        ("moong dal", "Tata Sampann"),
        ("toor dal", "Tata Sampann"),
        ("chilli powder", "Everest"),
        ("turmeric powder", "Everest"),
        ("black tea", "Tata Tea"),
        ("coconut water", "Paper Boat"),
        ("coffee", "Nescafe"),
        ("energy drink", "Red Bull"),
        ("real go", "Real"),
        ("real-go", "Real")
    ];

    private readonly IServiceProvider _services;
    private readonly ILogger<BrandBackfillHostedService> _logger;

    public BrandBackfillHostedService(IServiceProvider services, ILogger<BrandBackfillHostedService> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmartDbContext>();

        var missingBrand = await db.Products
            .Where(p => p.Brand == null || p.Brand == "")
            .ToListAsync(cancellationToken);

        if (missingBrand.Count == 0)
        {
            return;
        }

        var updated = 0;

        foreach (var product in missingBrand)
        {
            var name = product.ProductName.ToLowerInvariant();

            foreach (var (keyword, brand) in BrandKeywords)
            {
                if (name.Contains(keyword))
                {
                    product.Brand = brand;
                    updated++;
                    break;
                }
            }
        }

        if (updated > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "BrandBackfillHostedService: assigned a brand to {Updated} of {Total} product(s) that had no brand value yet.",
            updated, missingBrand.Count);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
