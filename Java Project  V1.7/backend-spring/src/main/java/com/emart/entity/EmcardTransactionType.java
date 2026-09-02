package com.emart.entity;

/**
 * Why an eMCard point balance changed. One row per reason, so a
 * checkout that both redeems and earns produces two ledger rows
 * rather than one netted row - that way the invoice's "points
 * redeemed" and "points earned" lines can each be traced back to a
 * real record.
 */
public enum EmcardTransactionType {

    /** Points granted when the eMCard account is first opened. */
    CREDIT_INITIAL,

    /** Points spent redeeming products at checkout. */
    REDEEM,

    /** Points earned as 10% of the cash actually paid at checkout. */
    EARN
}
