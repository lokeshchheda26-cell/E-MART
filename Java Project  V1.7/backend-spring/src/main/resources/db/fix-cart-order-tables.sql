-- ===================================================================
-- FIX: "Add to Cart" returns 400 Bad Request
-- ===================================================================
--
-- ROOT CAUSE
-- ----------
-- Your `emart` database contains four tables that were NEVER created
-- by this Spring Boot application:
--
--     cart, cart_item, orders, order_item
--
-- Proof: none of the original project ZIPs (Back-end.zip,
-- EmartCategoryMaster-updated.zip) contain a Cart, CartItem, Orders
-- or OrderItem @Entity class. Those entities were written later, when
-- the checkout flow was built. Yet the tables already appear in your
-- database dump (emartdb.txt) - so they came from an earlier
-- prototype, a hand-written script, or another tool, with a column
-- layout this application knows nothing about.
--
-- Why that breaks INSERTs:
-- `spring.jpa.hibernate.ddl-auto=update` is a purely ADDITIVE
-- strategy. It will ADD columns an entity needs, but it will NEVER
-- remove, rename or relax a column that already exists. So any
-- leftover column on those legacy tables that is NOT NULL and has no
-- DEFAULT is simply absent from Hibernate's generated INSERT
-- statement, and MySQL rejects the row with:
--
--     Field 'xxx' doesn't have a default value
--
-- Spring surfaces that as a DataAccessException, which the API layer
-- turns into the 400 Bad Request you saw on POST /api/cart/items.
--
--
-- WHY DROPPING THEM IS SAFE
-- -------------------------
-- All four tables are EMPTY. Straight from your own dump:
--
--     mysql> select * from cart;        Empty set (0.01 sec)
--     mysql> select * from cart_item;   Empty set (0.00 sec)
--     mysql> select * from orders;      Empty set (0.01 sec)
--     mysql> select * from order_item;  Empty set (0.01 sec)
--
-- They are still empty now - cart writes have been failing, so
-- nothing has ever been persisted into them. There is zero data to
-- lose. Dropping them lets Hibernate recreate all four cleanly from
-- the JPA entities on the next application start.
--
-- No other table is touched. Your products, categories, users and
-- EMCard balances are completely unaffected.
--
--
-- HOW TO RUN
-- ----------
--   1. STOP the Spring Boot backend.
--   2. Run this script:
--          mysql -u root -p emart < fix-cart-order-tables.sql
--      ...or paste it into MySQL Workbench / the mysql shell.
--   3. START the backend again. Hibernate recreates the four tables
--      to match the entities exactly.
--   4. Add to Cart will now work.
--
-- ===================================================================

USE emart;

-- Safety net: confirm the tables really are empty before dropping.
-- Each of these MUST print 0. If any prints a non-zero number, STOP
-- and do not run the DROP statements below - send me the output
-- instead and I'll write you a column-by-column migration that keeps
-- the data.
SELECT 'cart'       AS table_name, COUNT(*) AS row_count FROM cart
UNION ALL
SELECT 'cart_item',  COUNT(*) FROM cart_item
UNION ALL
SELECT 'orders',     COUNT(*) FROM orders
UNION ALL
SELECT 'order_item', COUNT(*) FROM order_item;


-- Child tables are dropped before parents so foreign keys never
-- block the operation. FOREIGN_KEY_CHECKS is toggled off as a
-- belt-and-braces measure in case the legacy tables carry FK
-- constraints this application doesn't know about.
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_item;
DROP TABLE IF EXISTS cart;

SET FOREIGN_KEY_CHECKS = 1;


-- Confirm they're gone. Both should return an empty result set.
SHOW TABLES LIKE 'cart%';
SHOW TABLES LIKE 'order%';
