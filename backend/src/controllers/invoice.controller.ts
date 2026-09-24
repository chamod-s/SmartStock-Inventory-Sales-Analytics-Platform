import { Request, Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { saleQuerySchema } from '../validators/sale.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const query = saleQuerySchema.parse(req.query);
  const result = await invoiceService.listInvoices(query);
  return ApiResponse.success(res, 'Invoices retrieved successfully', result);
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await invoiceService.getInvoiceById(id);
  return ApiResponse.success(res, 'Invoice retrieved successfully', invoice);
});

export const getInvoiceByNumber = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceNumber } = req.params;
  const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
  return ApiResponse.success(res, 'Invoice retrieved successfully', invoice);
});

export const downloadInvoiceHtml = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await invoiceService.getInvoiceById(id);
  const html = invoiceService.generatePrintableHtml(invoice);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="Invoice-${invoice.invoiceNumber}.html"`
  );
  return res.send(html);
});
