package com.emart.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Adds order_item.purchase_mode if the column is missing.
 *
 * WHY THIS EXISTS
 * ---------------
 * The purchase-mode snapshot on an order line is a new column. The dev
 * profile runs with {@code spring.jpa.hibernate.ddl-auto=none} (see
 * application-dev.properties), so Hibernate does NOT create it - and
 * because checkout writes that column, every checkout failed with
 *
 *     Unknown column 'purchase_mode' in 'field list'
 *
 * AFTER the payment had already been taken, which is the worst possible
 * moment to discover a schema gap. This runs the one ALTER at startup so
 * the schema cannot drift behind the code again.
 *
 * Idempotent: it checks information_schema first, so a second startup
 * does nothing. Once the column exists in every environment this class
 * can be deleted - the equivalent one-shot SQL is in
 * src/main/resources/db/order-item-purchase-mode.sql.
 *
 * A failure here is logged, not thrown: the application still starts,
 * and the log says exactly which statement to run by hand.
 */
@Component
public class OrderItemPurchaseModeMigrationRunner implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(OrderItemPurchaseModeMigrationRunner.class);

    private static final String ADD_COLUMN_SQL =
            "ALTER TABLE order_item ADD COLUMN purchase_mode VARCHAR(24) NULL";

    // LOWER() on both sides because H2 (used by the tests) reports
    // identifiers in upper case while MySQL reports them as written.
    private static final String COLUMN_EXISTS_SQL =
            "SELECT COUNT(*) FROM information_schema.columns "
                    + "WHERE LOWER(table_name) = 'order_item' "
                    + "AND LOWER(column_name) = 'purchase_mode'";

    private final JdbcTemplate jdbcTemplate;


    public OrderItemPurchaseModeMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }


    @Override
    public void run(ApplicationArguments args) {

        try {

            Integer existing = jdbcTemplate.queryForObject(
                    COLUMN_EXISTS_SQL, Integer.class);

            if (existing != null && existing > 0) {
                return;
            }

            jdbcTemplate.execute(ADD_COLUMN_SQL);

            log.info(
                "OrderItemPurchaseModeMigrationRunner: added "
                    + "order_item.purchase_mode. Existing order lines keep a "
                    + "NULL there and have their mode derived from the stored "
                    + "prices/points, so old invoices are unchanged."
            );

        } catch (DataAccessException ex) {

            log.error(
                "OrderItemPurchaseModeMigrationRunner: could not add "
                    + "order_item.purchase_mode ({}). Checkout will fail until "
                    + "this column exists - run it by hand:\n  {};",
                ex.getMostSpecificCause() != null
                        ? ex.getMostSpecificCause().getMessage()
                        : ex.getMessage(),
                ADD_COLUMN_SQL
            );
        }
    }
}
