using Emart.Application.Dtos;

namespace Emart.Application.Services.Interfaces;

public interface IPdfInvoiceService
{
    byte[] GenerateInvoicePdf(OrderResponseDTO order);
}
