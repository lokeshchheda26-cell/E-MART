package com.emart.service.purchase;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

/**
 * Factory/registry for {@link PurchaseModeStrategy}.
 *
 * Spring hands in every strategy bean it can find, and this indexes
 * them by mode. Consequences:
 *
 *   - adding a purchase mode = adding one enum value + one @Component;
 *     nothing here or in PurchaseDecisionEngine changes;
 *   - a mode without a strategy, or two strategies claiming the same
 *     mode, fails at STARTUP rather than at the till.
 */
@Component
public class PurchaseModeRegistry {

    private final Map<PurchaseMode, PurchaseModeStrategy> strategies =
            new EnumMap<>(PurchaseMode.class);


    public PurchaseModeRegistry(List<PurchaseModeStrategy> discovered) {

        for (PurchaseModeStrategy strategy : discovered) {

            PurchaseModeStrategy clash =
                    strategies.put(strategy.mode(), strategy);

            if (clash != null) {
                throw new IllegalStateException(
                        "Two purchase-mode strategies claim mode "
                                + strategy.mode() + ": "
                                + clash.getClass().getName() + " and "
                                + strategy.getClass().getName());
            }
        }

        for (PurchaseMode mode : PurchaseMode.values()) {
            if (!strategies.containsKey(mode)) {
                throw new IllegalStateException(
                        "No PurchaseModeStrategy registered for purchase mode "
                                + mode + " (Mode " + mode.getModeNumber()
                                + "). Every mode must have exactly one.");
            }
        }
    }


    public PurchaseModeStrategy forMode(PurchaseMode mode) {

        PurchaseModeStrategy strategy =
                strategies.get(mode == null ? PurchaseMode.CASH_ONLY : mode);

        if (strategy == null) {
            // Unreachable given the constructor check, but a clear
            // failure beats a NullPointerException in pricing.
            throw new IllegalStateException(
                    "No PurchaseModeStrategy registered for " + mode);
        }

        return strategy;
    }
}
