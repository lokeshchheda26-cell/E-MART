using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Emart.Infrastructure.Startup;

/// <summary>
/// One-time startup migration for the loyalty offer columns: classifies any product whose
/// OfferType is still null by saving it (EmartDbContext.SaveChanges calls Product.NormaliseOffer,
/// same as the Java @PreUpdate hook). Idempotent and self-limiting.
/// </summary>
public class OfferTypeBackfillHostedService : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<OfferTypeBackfillHostedService> _logger;

    public OfferTypeBackfillHostedService(IServiceProvider services, ILogger<OfferTypeBackfillHostedService> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmartDbContext>();

        var unclassified = await db.Products.Where(p => p.OfferType == null).ToListAsync(cancellationToken);

        if (unclassified.Count == 0)
        {
            return;
        }

        foreach (var product in unclassified)
        {
            db.Entry(product).State = EntityState.Modified;
        }

        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "OfferTypeBackfillHostedService: classified the eMCard offer on {Count} product(s) that predate the offer_type column.",
            unclassified.Count);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
