package com.emart.service;

import com.emart.dto.OrderResponseDTO;

public interface PdfInvoiceService {

    /**
     * Renders a printable PDF invoice for an already-placed order.
     * Mirrors the same figures shown on the on-screen Invoice page
     * (see OrderResponseDTO) so the two never disagree.
     */
    byte[] generateInvoicePdf(OrderResponseDTO order);
}
