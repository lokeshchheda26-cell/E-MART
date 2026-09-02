-- ===================================================================
-- eMART LOYALTY POINTS SYSTEM - SCHEMA MIGRATION
-- ===================================================================
--
-- Everything here is ADDITIVE. No column is dropped, renamed or
-- retyped, and no existing row loses data, so the application keeps
-- working unchanged if you roll the code back.
--
-- You normally do NOT need to run this by hand:
--   * spring.jpa.hibernate.ddl-auto=update adds the columns and the
--     emcard_transaction table automatically on the next startup;
--   * OfferTypeBackfillRunner then classifies the existing products.
--
-- This file exists for DBAs who would rather apply the change
-- explicitly, and as the record of what the migration actually does.
-- Every statement is safe to re-run.
-- ===================================================================


-- -------------------------------------------------------------------
-- 1. PRODUCT: make the eMCard offer explicit
-- -------------------------------------------------------------------
-- Until now the offer was INFERRED from the combination of
-- (mrp_price, cardholder_price, points_to_be_redeemed) in three
-- separate places. These four columns state it once.
--
-- points_required / cash_required mirror the legacy
-- points_to_be_redeemed / cardholder_price columns; Product's
-- @PrePersist/@PreUpdate hook keeps the two representations in step
-- so they cannot drift.

ALTER TABLE product_master
  ADD COLUMN offer_type     VARCHAR(24)    NULL,
  ADD COLUMN points_required INT           NULL,
  ADD COLUMN cash_required  DECIMAL(10,2)  NULL,
  ADD COLUMN display_type   VARCHAR(32)    NULL;


-- Classify every product that has not been classified yet.
--   PARTIAL_REDEMPTION - cash discount AND points  (Condition 4)
--   FULL_REDEMPTION    - points only               (Condition 3)
--   EMCARD_PRICE       - cash discount only        (Condition 2)
--   NORMAL             - no eMCard offer           (Condition 1)

UPDATE product_master
SET offer_type = CASE
        WHEN points_to_be_redeemed > 0
             AND cardholder_price > 0
             AND cardholder_price < mrp_price THEN 'PARTIAL_REDEMPTION'
        WHEN points_to_be_redeemed > 0        THEN 'FULL_REDEMPTION'
        WHEN cardholder_price > 0
             AND cardholder_price < mrp_price THEN 'EMCARD_PRICE'
        ELSE 'NORMAL'
    END
WHERE offer_type IS NULL;


UPDATE product_master
SET points_required = CASE
        WHEN offer_type IN ('FULL_REDEMPTION', 'PARTIAL_REDEMPTION')
            THEN COALESCE(points_to_be_redeemed, 0)
        ELSE 0
    END,
    cash_required = CASE
        WHEN offer_type = 'FULL_REDEMPTION'                      THEN 0.00
        WHEN offer_type IN ('EMCARD_PRICE', 'PARTIAL_REDEMPTION') THEN cardholder_price
        ELSE mrp_price
    END,
    display_type = CASE
        WHEN offer_type = 'EMCARD_PRICE'       THEN 'MRP_AND_EMCARD_PRICE'
        WHEN offer_type = 'FULL_REDEMPTION'    THEN 'MRP_AND_POINTS'
        WHEN offer_type = 'PARTIAL_REDEMPTION' THEN 'MRP_AND_CASH_PLUS_POINTS'
        ELSE 'MRP_ONLY'
    END
WHERE points_required IS NULL
   OR cash_required IS NULL
   OR display_type IS NULL;


-- -------------------------------------------------------------------
-- 2. ORDERS: opening / closing point balance on the invoice
-- -------------------------------------------------------------------
-- The BRD requires the bill to show the point credit/debit and the
-- resulting balance. The opening balance used to be back-calculated
-- from a live figure that was only present on the checkout response,
-- so re-opening or re-downloading an older invoice silently lost it.
-- Storing both makes the invoice a stable historical record.
--
-- Existing orders keep 0/0 - their true balances were never recorded
-- and cannot be reconstructed. New orders are accurate.

ALTER TABLE orders
  ADD COLUMN points_balance_before INT NOT NULL DEFAULT 0,
  ADD COLUMN points_balance_after  INT NOT NULL DEFAULT 0;


-- -------------------------------------------------------------------
-- 3. EMCARD_TRANSACTION: append-only points ledger
-- -------------------------------------------------------------------
-- emcard_account.total_points only says where the balance is NOW.
-- This says why. One row per reason, written inside the same locked
-- transaction that moves the balance, so the two cannot disagree.
-- Nothing ever updates or deletes a row here.

CREATE TABLE IF NOT EXISTS emcard_transaction (
    txn_id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id        BIGINT       NOT NULL,
    order_id       BIGINT       NULL,
    txn_type       VARCHAR(20)  NOT NULL,   -- CREDIT_INITIAL | REDEEM | EARN
    points         INT          NOT NULL,   -- always positive; direction is in txn_type
    balance_before INT          NOT NULL,
    balance_after  INT          NOT NULL,
    created_at     DATETIME     NOT NULL,
    PRIMARY KEY (txn_id),
    KEY idx_emcard_txn_user  (user_id),
    KEY idx_emcard_txn_order (order_id)
);


-- -------------------------------------------------------------------
-- 4. VERIFICATION
-- -------------------------------------------------------------------
-- Expect zero rows from both queries.

-- 4a. Any product left unclassified?
-- SELECT prod_id, prod_name FROM product_master WHERE offer_type IS NULL;

-- 4b. Any ledger row that breaks the balance invariant?
-- SELECT * FROM emcard_transaction
--  WHERE (txn_type = 'REDEEM' AND balance_after <> balance_before - points)
--     OR (txn_type <> 'REDEEM' AND balance_after <> balance_before + points);
