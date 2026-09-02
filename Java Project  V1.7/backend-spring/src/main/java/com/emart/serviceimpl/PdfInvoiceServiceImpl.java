package com.emart.serviceimpl;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.emart.dto.OrderItemResponseDTO;
import com.emart.dto.OrderResponseDTO;
import com.emart.service.PdfInvoiceService;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

/**
 * Renders the exact same figures as the on-screen Invoice page into
 * a downloadable PDF, using OpenPDF (a permissively-licensed fork of
 * the classic iText 2.x API). Deliberately plain/table-based rather
 * than styled with images - this is a functional invoice document,
 * not a marketing piece.
 */
@Service
public class PdfInvoiceServiceImpl implements PdfInvoiceService {

    private static final Logger log = LoggerFactory.getLogger(PdfInvoiceServiceImpl.class);

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private static final Font TITLE_FONT =
            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new java.awt.Color(0, 102, 51));
    private static final Font HEADING_FONT =
            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    private static final Font NORMAL_FONT =
            FontFactory.getFont(FontFactory.HELVETICA, 10);
    private static final Font TABLE_HEADER_FONT =
            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.WHITE);
    private static final Font BOLD_FONT =
            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);


    @Override
    public byte[] generateInvoicePdf(OrderResponseDTO order) {

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            addHeader(document, order);
            addCustomerAndDelivery(document, order);
            addItemsTable(document, order);
            addSummary(document, order);
            addFooter(document);

            document.close();

            return out.toByteArray();

        } catch (Exception ex) {
            log.error("Failed to generate invoice PDF for orderId={}",
                    order.getOrderId(), ex);
            throw new IllegalStateException(
                    "Unable to generate invoice PDF: " + ex.getMessage(), ex);
        }
    }


    private void addHeader(Document document, OrderResponseDTO order) throws Exception {

        Paragraph title = new Paragraph("e-MART", TITLE_FONT);
        title.setAlignment(Element.ALIGN_LEFT);
        document.add(title);

        Paragraph subtitle = new Paragraph("Tax Invoice", HEADING_FONT);
        subtitle.setSpacingAfter(10);
        document.add(subtitle);

        PdfPTable meta = new PdfPTable(2);
        meta.setWidthPercentage(100);
        meta.setSpacingAfter(14);

        addPlainRow(meta, "Invoice / Order No.", "#" + order.getOrderId());
        addPlainRow(meta, "Order Date",
                order.getOrderDate() != null
                        ? order.getOrderDate().format(DATE_FORMAT)
                        : "-");
        addPlainRow(meta, "Payment Status",
                order.getPaymentStatus() != null ? order.getPaymentStatus() : "-");

        document.add(meta);
    }

    private void addCustomerAndDelivery(Document document, OrderResponseDTO order)
            throws Exception {

        Paragraph heading = new Paragraph("Bill To / Delivery Details", HEADING_FONT);
        heading.setSpacingBefore(4);
        heading.setSpacingAfter(6);
        document.add(heading);

        PdfPTable meta = new PdfPTable(2);
        meta.setWidthPercentage(100);
        meta.setSpacingAfter(14);

        addPlainRow(meta, "Customer Name", nvl(order.getCustomerName()));
        addPlainRow(meta, "Email", nvl(order.getCustomerEmail()));
        addPlainRow(meta, "Delivery Option", nvl(order.getDeliveryOption()));

        if ("PICKUP".equalsIgnoreCase(order.getDeliveryOption())) {
            addPlainRow(meta, "Pickup Store", nvl(order.getStoreLocation()));
        } else {
            addPlainRow(meta, "Shipping Address", nvl(order.getShippingAddress()));
        }

        document.add(meta);
    }

    private void addItemsTable(Document document, OrderResponseDTO order) throws Exception {

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2.8f, 1.3f, 1.8f, 0.7f, 1.1f, 1.2f, 1.2f});
        table.setSpacingAfter(14);

        // "Purchase Mode" is a real column now: the same invoice has to
        // explain a cash-only line, an eMCard-priced line, a points-only
        // line and a cash+points line, and the mode is what tells the
        // reader which one they are looking at.
        String[] headers = {
                "Product", "Brand", "Purchase Mode", "Qty",
                "MRP", "Cash Paid", "Line Total"
        };

        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new com.lowagie.text.Phrase(h, TABLE_HEADER_FONT));
            cell.setBackgroundColor(new java.awt.Color(0, 102, 51));
            cell.setPadding(6);
            table.addCell(cell);
        }

        if (order.getItems() != null) {
            for (OrderItemResponseDTO item : order.getItems()) {

                int points = item.getPointsRedeemed() == null
                        ? 0
                        : item.getPointsRedeemed();

                table.addCell(cellText(
                        item.getProductName()
                                + (points > 0
                                        ? "\n(" + points + " e-Points redeemed)"
                                        : "")
                ));
                table.addCell(cellText(nvl(item.getBrand())));
                table.addCell(cellText(nvl(item.getPurchaseModeLabel())));
                table.addCell(cellText(String.valueOf(item.getQuantity())));
                table.addCell(cellText(formatMoney(item.getMrpPrice())));
                // Cash column: a full redemption pays nothing, and
                // saying so is clearer than printing 0.00.
                table.addCell(cellText(
                        item.getLineTotal() != null
                                && item.getLineTotal().signum() == 0
                                && points > 0
                                        ? "0.00 (points)"
                                        : formatMoney(item.getUnitPrice())
                ));
                table.addCell(cellText(formatMoney(item.getLineTotal())));
            }
        }

        document.add(table);
    }

    private void addSummary(Document document, OrderResponseDTO order) throws Exception {

        PdfPTable summary = new PdfPTable(2);
        summary.setWidthPercentage(50);
        summary.setHorizontalAlignment(Element.ALIGN_RIGHT);
        summary.setSpacingAfter(14);

        addPlainRow(summary, "Subtotal (MRP)", formatMoney(order.getSubtotal()));
        addPlainRow(summary, "Total Savings", "- " + formatMoney(order.getTotalSavings()));

        boolean hasEmcardActivity =
                (order.getPointsRedeemed() != null && order.getPointsRedeemed() > 0)
                        || (order.getPointsEarned() != null && order.getPointsEarned() > 0);

        // Opening balance now comes straight off the order row. It
        // used to be BACK-CALCULATED from the closing balance, which
        // only worked on the live checkout response - re-downloading
        // an older invoice passed a null closing balance and silently
        // dropped both figures from the bill, even though the BRD
        // requires the point credit/debit and balances to appear.
        if (hasEmcardActivity && order.getPointsBalanceBefore() != null) {
            addPlainRow(summary, "EMCard Opening Balance",
                    order.getPointsBalanceBefore() + " pts");
        }

        if (order.getPointsRedeemed() != null && order.getPointsRedeemed() > 0) {
            addPlainRow(summary, "EMCard Points Redeemed",
                    "- " + order.getPointsRedeemed() + " pts");
        }

        PdfPCell payableLabel = new PdfPCell(new com.lowagie.text.Phrase("Amount Paid", BOLD_FONT));
        payableLabel.setBorder(PdfPCell.TOP);
        payableLabel.setPadding(6);
        PdfPCell payableValue = new PdfPCell(
                new com.lowagie.text.Phrase(formatMoney(order.getPayableTotal()), BOLD_FONT));
        payableValue.setBorder(PdfPCell.TOP);
        payableValue.setPadding(6);
        payableValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        summary.addCell(payableLabel);
        summary.addCell(payableValue);

        if (order.getPointsEarned() != null && order.getPointsEarned() > 0) {
            // The rate comes with the order (LoyaltyPolicy), so a
            // configured promotion rate can never disagree with the
            // label printed here.
            String rate = order.getEarnRatePercent();
            addPlainRow(summary,
                    "EMCard Points Earned"
                            + (rate == null || rate.isBlank() ? "" : " (" + rate + "%)"),
                    "+" + order.getPointsEarned() + " pts");
        }

        if (order.getPointsBalanceAfter() != null) {
            addPlainRow(summary, "EMCard Closing Balance",
                    order.getPointsBalanceAfter() + " pts");
        }

        document.add(summary);
    }

    private void addFooter(Document document) throws Exception {
        Paragraph footer = new Paragraph(
                "Thank you for shopping with e-MART!",
                NORMAL_FONT
        );
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(20);
        document.add(footer);
    }

    private void addPlainRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new com.lowagie.text.Phrase(label, NORMAL_FONT));
        labelCell.setBorder(PdfPCell.NO_BORDER);
        labelCell.setPadding(3);

        PdfPCell valueCell = new PdfPCell(new com.lowagie.text.Phrase(value, NORMAL_FONT));
        valueCell.setBorder(PdfPCell.NO_BORDER);
        valueCell.setPadding(3);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private PdfPCell cellText(String text) {
        PdfPCell cell = new PdfPCell(new com.lowagie.text.Phrase(text, NORMAL_FONT));
        cell.setPadding(5);
        return cell;
    }

    private String formatMoney(java.math.BigDecimal value) {
        if (value == null) {
            return "Rs. 0.00";
        }
        return "Rs. " + value.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private String nvl(String value) {
        return (value == null || value.isBlank()) ? "-" : value;
    }
}
