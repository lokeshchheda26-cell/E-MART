using Emart.Application.Common.Options;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Emart.Infrastructure.Startup;

/// <summary>
/// One-time price cleanup - rounds "charm" prices (2999, 24.99) to clean round numbers. OFF by
/// default: the one-time migration it existed for has already happened, and re-running it
/// silently rewrites real money values, so it only runs when explicitly enabled.
/// </summary>
public class PriceRoundingBackfillHostedService : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly PriceRoundingSettings _settings;
    private readonly ILogger<PriceRoundingBackfillHostedService> _logger;

    public PriceRoundingBackfillHostedService(IServiceProvider services, IOptions<PriceRoundingSettings> settings, ILogger<PriceRoundingBackfillHostedService> logger)
    {
        _services = services;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_settings.Enabled)
        {
            return;
        }

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmartDbContext>();

        var products = await db.Products.ToListAsync(cancellationToken);
        var changed = 0;

        foreach (var product in products)
        {
            var touched = false;

            var cleanMrp = RoundToClean(product.MrpPrice);
            if (cleanMrp != product.MrpPrice)
            {
                product.MrpPrice = cleanMrp;
                touched = true;
            }

            var cleanCardholder = RoundToClean(product.CardholderPrice);
            if (cleanCardholder != product.CardholderPrice)
            {
                product.CardholderPrice = cleanCardholder;
                touched = true;
            }

            if (touched)
            {
                changed++;
            }
        }

        if (changed == 0)
        {
            return;
        }

        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "PriceRoundingBackfillHostedService: replaced charm pricing with clean round numbers on {Count} product(s).",
            changed);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    /// <summary>
    /// Rounds a "charm" price to a clean round number, using a rounding unit that scales with
    /// magnitude (2999 -&gt; 3000, 2499 -&gt; 2500, 24.99 -&gt; 20). Never rounds down to zero for a
    /// positive input.
    /// </summary>
    private static decimal RoundToClean(decimal value)
    {
        if (value <= 0m)
        {
            return value;
        }

        var unit = value switch
        {
            >= 10_000m => 500m,
            >= 1_000m => 100m,
            >= 100m => 50m,
            _ => 10m
        };

        var rounded = Math.Round(value / unit, 0, MidpointRounding.AwayFromZero) * unit;

        return rounded == 0m ? unit : rounded;
    }
}
