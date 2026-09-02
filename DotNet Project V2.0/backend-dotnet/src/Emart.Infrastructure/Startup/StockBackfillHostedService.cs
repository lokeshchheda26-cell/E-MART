using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Emart.Infrastructure.Startup;

/// <summary>
/// One-time startup migration: sets a sensible default stock quantity on any product still
/// sitting at 0. Mirrors the Java StockBackfillRunner FAITHFULLY, including its documented quirk:
/// this is not self-limiting and will "revive" any product that legitimately drops back to 0
/// units on every application restart. Kept as-is per the migration's fidelity goal rather than
/// silently fixed - a real deployment should stop running this once stock is actively managed.
/// </summary>
public class StockBackfillHostedService : IHostedService
{
    private const int StockBackfillQty = 100;

    private readonly IServiceProvider _services;
    private readonly ILogger<StockBackfillHostedService> _logger;

    public StockBackfillHostedService(IServiceProvider services, ILogger<StockBackfillHostedService> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmartDbContext>();

        var zeroStock = await db.Products.Where(p => p.Stock == 0).ToListAsync(cancellationToken);

        if (zeroStock.Count == 0)
        {
            return;
        }

        foreach (var product in zeroStock)
        {
            product.Stock = StockBackfillQty;
        }

        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "StockBackfillHostedService: set stock={Qty} on {Count} product(s) that had no real stock value yet.",
            StockBackfillQty, zeroStock.Count);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
