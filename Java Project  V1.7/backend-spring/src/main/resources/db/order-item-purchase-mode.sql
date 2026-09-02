-- ---------------------------------------------------------------
-- Purchase mode snapshot on an order line.
--
-- The dev profile runs with spring.jpa.hibernate.ddl-auto=none, so
-- Hibernate does not add new columns by itself. Checkout writes this
-- one, and without it every checkout fails with
--   Unknown column 'purchase_mode' in 'field list'
-- AFTER the payment has been taken.
--
-- OrderItemPurchaseModeMigrationRunner applies this automatically at
-- startup (idempotently). This file is here for anyone who prefers to
-- run it by hand, or for a DBA-controlled environment.
--
-- Nullable on purpose: order lines written before the column existed
-- keep NULL, and OrderServiceImpl derives their mode from the stored
-- (mrp_price, unit_price, points_redeemed) snapshot - so old invoices
-- print exactly as they did before.
-- ---------------------------------------------------------------

ALTER TABLE order_item ADD COLUMN purchase_mode VARCHAR(24) NULL;
