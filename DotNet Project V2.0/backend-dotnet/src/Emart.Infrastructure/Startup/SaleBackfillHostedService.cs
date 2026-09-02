using Emart.Application.Common.Options;
using Emart.Application.Repositories;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Emart.Infrastructure.Startup;

/// <summary>
/// Startup demo/dev convenience for the homepage Sale Banner - if nothing is currently on an
/// active sale, puts a deterministic demo sale on the N lowest-id eligible products. Config-gated
/// (SaleBootstrap:*), on by default to match the Java SaleBackfillRunner's out-of-the-box behaviour.
/// </summary>
public class SaleBackfillHostedService : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly SaleBootstrapSettings _settings;
    private readonly ILogger<SaleBackfillHostedService> _logger;

    public SaleBackfillHostedService(IServiceProvider services, IOptions<SaleBootstrapSettings> settings, ILogger<SaleBackfillHostedService> logger)
    {
        _services = services;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_settings.Enabled || _settings.ProductCount <= 0)
        {
            return;
        }

        if (_settings.DiscountPercent <= 0 || _settings.DiscountPercent >= 100)
        {
            _logger.LogWarning(
                "SaleBackfillHostedService: SaleBootstrap:DiscountPercent={Discount} is not between 1 and 99 - skipping the demo sale.",
                _settings.DiscountPercent);
            return;
        }

        using var scope = _services.CreateScope();
        var productRepository = scope.ServiceProvider.GetRequiredService<IProductRepository>();
        var db = scope.ServiceProvider.GetRequiredService<EmartDbContext>();

        if (await productRepository.FindRandomActiveSaleProductAsync(cancellationToken) is not null)
        {
            return;
        }

        var candidates = await db.Products
            .Where(p => p.Status && p.Stock > 0)
            .OrderBy(p => p.ProductId)
            .Take(_settings.ProductCount)
            .ToListAsync(cancellationToken);

        if (candidates.Count == 0)
        {
            return;
        }

        var saleEndDate = DateTime.UtcNow.AddHours(_settings.DurationHours);
        var multiplier = (100m - _settings.DiscountPercent) / 100m;

        foreach (var product in candidates)
        {
            // Whole-number sale price, no charm-pricing decimals.
            var salePrice = Math.Round(product.MrpPrice * multiplier, 0, MidpointRounding.AwayFromZero);

            product.OnSale = true;
            product.SalePrice = salePrice;
            product.SaleEndDate = saleEndDate;
        }

        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "SaleBackfillHostedService: started a {Discount}% demo sale on {Count} product(s), ending {End}.",
            _settings.DiscountPercent, candidates.Count, saleEndDate);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
