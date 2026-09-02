using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Emart.Infrastructure.External;

/// <summary>
/// Renders the exact same figures as the on-screen Invoice page into a downloadable PDF, via
/// QuestPDF (the .NET equivalent role to the Java side's OpenPDF port) - same 5 sections (header,
/// customer+delivery, 7-column items table, summary, footer), same dark-green branding.
/// </summary>
public class PdfInvoiceService : IPdfInvoiceService
{
    private readonly ILogger<PdfInvoiceService> _logger;

    private static readonly string BrandColor = "#006633"; // rgb(0,102,51)

    public PdfInvoiceService(ILogger<PdfInvoiceService> logger)
    {
        _logger = logger;
    }

    public byte[] GenerateInvoicePdf(OrderResponseDTO order)
    {
        try
        {
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(36, Unit.Point);
                    page.DefaultTextStyle(x => x.FontSize(10));

                    page.Content().Column(column =>
                    {
                        column.Spacing(10);

                        column.Item().Text("e-MART").FontSize(20).Bold().FontColor(BrandColor);
                        column.Item().Text("Tax Invoice").FontSize(12).Bold();

                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn();
                                c.RelativeColumn();
                            });

                            AddPlainRow(table, "Invoice / Order No.", $"#{order.OrderId}");
                            AddPlainRow(table, "Order Date", order.OrderDate.ToString("dd MMM yyyy, hh:mm tt"));
                            AddPlainRow(table, "Payment Status", order.PaymentStatus ?? "-");
                        });

                        column.Item().Text("Bill To / Delivery Details").FontSize(12).Bold();

                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn();
                                c.RelativeColumn();
                            });

                            AddPlainRow(table, "Customer Name", Nvl(order.CustomerName));
                            AddPlainRow(table, "Email", Nvl(order.CustomerEmail));
                            AddPlainRow(table, "Delivery Option", Nvl(order.DeliveryOption));

                            if (string.Equals(order.DeliveryOption, "PICKUP", StringComparison.OrdinalIgnoreCase))
                            {
                                AddPlainRow(table, "Pickup Store", Nvl(order.StoreLocation));
                            }
                            else
                            {
                                AddPlainRow(table, "Shipping Address", Nvl(order.ShippingAddress));
                            }
                        });

                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(2.8f);
                                c.RelativeColumn(1.3f);
                                c.RelativeColumn(1.8f);
                                c.RelativeColumn(0.7f);
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.2f);
                                c.RelativeColumn(1.2f);
                            });

                            table.Header(header =>
                            {
                                foreach (var h in new[] { "Product", "Brand", "Purchase Mode", "Qty", "MRP", "Cash Paid", "Line Total" })
                                {
                                    header.Cell().Background(BrandColor).Padding(6)
                                        .Text(h).FontColor(Colors.White).Bold().FontSize(10);
                                }
                            });

                            foreach (var item in order.Items)
                            {
                                var points = item.PointsRedeemed;

                                var productLabel = points > 0
                                    ? $"{item.ProductName}\n({points} e-Points redeemed)"
                                    : item.ProductName ?? "";

                                table.Cell().Padding(5).Text(productLabel);
                                table.Cell().Padding(5).Text(Nvl(item.Brand));
                                table.Cell().Padding(5).Text(Nvl(item.PurchaseModeLabel));
                                table.Cell().Padding(5).Text(item.Quantity.ToString());
                                table.Cell().Padding(5).Text(FormatMoney(item.MrpPrice));

                                var cashCell = item.LineTotal == 0m && points > 0
                                    ? "0.00 (points)"
                                    : FormatMoney(item.UnitPrice);
                                table.Cell().Padding(5).Text(cashCell);
                                table.Cell().Padding(5).Text(FormatMoney(item.LineTotal));
                            }
                        });

                        column.Item().AlignRight().Width(280).Column(summary =>
                        {
                            summary.Spacing(2);

                            SummaryRow(summary, "Subtotal (MRP)", FormatMoney(order.Subtotal));
                            SummaryRow(summary, "Total Savings", $"- {FormatMoney(order.TotalSavings)}");

                            // EMCard figures are member-only, on the CURRENT membership status -
                            // never inferred from this order's points being non-zero (a member's
                            // cash-only order legitimately has zero point activity and must still
                            // count as a member; a former member's points would otherwise leak).
                            if (order.IsEmcardMember)
                            {
                                SummaryRow(summary, "EMCard Opening Balance", $"{order.PointsBalanceBefore} pts");

                                if (order.PointsRedeemed > 0)
                                {
                                    SummaryRow(summary, "EMCard Points Redeemed", $"- {order.PointsRedeemed} pts");
                                }
                            }

                            summary.Item().BorderTop(1).PaddingTop(4).Row(row =>
                            {
                                row.RelativeItem().Text("Amount Paid").Bold();
                                row.RelativeItem().Text(FormatMoney(order.PayableTotal)).Bold().AlignRight();
                            });

                            if (order.IsEmcardMember)
                            {
                                if (order.PointsEarned > 0)
                                {
                                    var rate = order.EarnRatePercent;
                                    var label = "EMCard Points Earned" + (string.IsNullOrWhiteSpace(rate) ? "" : $" ({rate}%)");
                                    SummaryRow(summary, label, $"+{order.PointsEarned} pts");
                                }

                                SummaryRow(summary, "EMCard Closing Balance", $"{order.PointsBalanceAfter} pts");
                            }
                        });

                        column.Item().AlignCenter().PaddingTop(20).Text("Thank you for shopping with e-MART!");
                    });
                });
            });

            return document.GeneratePdf();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate invoice PDF for orderId={OrderId}", order.OrderId);
            throw new InvalidOperationException($"Unable to generate invoice PDF: {ex.Message}", ex);
        }
    }

    private static void AddPlainRow(TableDescriptor table, string label, string value)
    {
        table.Cell().Padding(3).Text(label);
        // AlignRight() must be chained AFTER Text(), not on the container before it - calling it
        // on the container (the previously-shipped code) renders no text at all in QuestPDF
        // 2025.1.0, which is why every value column in the PDF used to come out blank/off-page.
        table.Cell().Padding(3).Text(value).AlignRight();
    }

    private static void SummaryRow(ColumnDescriptor column, string label, string value)
    {
        column.Item().Row(row =>
        {
            row.RelativeItem().Text(label);
            row.RelativeItem().Text(value).AlignRight();
        });
    }

    private static string FormatMoney(decimal value) => $"Rs. {value:0.00}";

    private static string Nvl(string? value) => string.IsNullOrWhiteSpace(value) ? "-" : value;
}
