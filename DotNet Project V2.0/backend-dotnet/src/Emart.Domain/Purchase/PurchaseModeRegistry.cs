namespace Emart.Domain.Purchase;

/// <summary>
/// Factory/registry for <see cref="IPurchaseModeStrategy"/>. DI hands in every strategy
/// implementation it can find, and this indexes them by mode.
///
/// A mode without a strategy, or two strategies claiming the same mode, fails here - callers
/// (Program.cs) resolve this eagerly at startup so that failure happens at STARTUP rather than
/// at the till, mirroring the Spring @Component constructor-time check.
/// </summary>
public sealed class PurchaseModeRegistry
{
    private readonly Dictionary<PurchaseMode, IPurchaseModeStrategy> _strategies = new();

    public PurchaseModeRegistry(IEnumerable<IPurchaseModeStrategy> discovered)
    {
        foreach (var strategy in discovered)
        {
            if (_strategies.TryGetValue(strategy.Mode(), out var clash))
            {
                throw new InvalidOperationException(
                    $"Two purchase-mode strategies claim mode {strategy.Mode()}: " +
                    $"{clash.GetType().FullName} and {strategy.GetType().FullName}");
            }

            _strategies[strategy.Mode()] = strategy;
        }

        foreach (PurchaseMode mode in Enum.GetValues<PurchaseMode>())
        {
            if (!_strategies.ContainsKey(mode))
            {
                throw new InvalidOperationException(
                    $"No IPurchaseModeStrategy registered for purchase mode {mode} " +
                    $"(Mode {mode.ModeNumber()}). Every mode must have exactly one.");
            }
        }
    }

    public IPurchaseModeStrategy ForMode(PurchaseMode? mode)
    {
        var resolved = mode ?? PurchaseMode.CASH_ONLY;

        if (!_strategies.TryGetValue(resolved, out var strategy))
        {
            // Unreachable given the constructor check, but a clear failure beats a
            // NullReferenceException in pricing.
            throw new InvalidOperationException($"No IPurchaseModeStrategy registered for {resolved}");
        }

        return strategy;
    }
}
