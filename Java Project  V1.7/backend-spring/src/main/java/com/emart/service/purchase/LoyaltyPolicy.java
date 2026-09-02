package com.emart.service.purchase;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The ONLY place that knows how eMCard points are earned.
 *
 * BRD: "cardholders will be given e-points equal to 10% of the
 * purchase amount". For this implementation "purchase amount" is the
 * CASH actually paid after eMCard pricing and any point redemption:
 *
 *   cash only          500 paid, 0 points   -> earns 50
 *   eMCard discount    450 paid, 0 points   -> earns 45
 *   partial redemption 180 paid, 120 points -> earns 18
 *   full redemption      0 paid, 450 points -> earns 0
 *
 * The rate is CONFIGURATION (emart.loyalty.earn-rate, overridable
 * with the LOYALTY_EARN_RATE env var), never a literal inside pricing
 * or invoice code - a double-points weekend is a property change, not
 * a redeploy. This class also formats the percentage shown on the
 * invoice, so the label and the arithmetic can never disagree.
 */
@Component
public class LoyaltyPolicy {

    /**
     * Used only when the property is missing entirely, so the app
     * still behaves exactly as the BRD describes out of the box.
     */
    private static final BigDecimal DEFAULT_EARN_RATE = new BigDecimal("0.10");

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    @Value("${emart.loyalty.earn-rate:0.10}")
    private BigDecimal configuredEarnRate;


    /** Spring uses this one; the rate arrives by property injection. */
    public LoyaltyPolicy() {
    }

    /**
     * Package-private, for unit tests that need to prove the rate really
     * is configuration (e.g. a double-points promotion) rather than a
     * literal buried in the arithmetic.
     */
    LoyaltyPolicy(BigDecimal earnRate) {
        this.configuredEarnRate = earnRate;
    }


    /** Fraction of cash paid that comes back as points. */
    public BigDecimal getEarnRate() {

        if (configuredEarnRate == null || configuredEarnRate.signum() < 0) {
            return DEFAULT_EARN_RATE;
        }

        return configuredEarnRate;
    }


    /**
     * Points earned for an amount of cash actually paid.
     *
     * Rounded DOWN so the loyalty scheme is never generous by a
     * rounding error, and never negative.
     */
    public int earnedPoints(BigDecimal cashPaid) {

        if (cashPaid == null || cashPaid.signum() <= 0) {
            return 0;
        }

        return cashPaid
                .multiply(getEarnRate())
                .setScale(0, RoundingMode.DOWN)
                .intValue();
    }


    /**
     * The configured rate as a whole-number percentage for display
     * ("Points earned (10% of amount paid)"). Trailing zeros stripped
     * so 0.125 reads as 12.5, not 12.50.
     */
    public String earnRatePercentLabel() {

        return getEarnRate()
                .multiply(ONE_HUNDRED)
                .stripTrailingZeros()
                .toPlainString();
    }
}
