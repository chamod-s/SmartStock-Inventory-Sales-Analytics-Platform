import { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import {
  salesReportQuerySchema,
  purchasesReportQuerySchema,
  inventoryReportQuerySchema,
  customersReportQuerySchema,
  expensesReportQuerySchema,
  profitReportQuerySchema,
} from '../validators/report.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

function handleReportResponse(res: Response, result: any, reportName: string) {
  if (result.csvData) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.csvData);
  }
  return ApiResponse.success(res, `${reportName} generated successfully`, result);
}

export const getSalesReport = asyncHandler(async (req: Request, res: Response) => {
  const query = salesReportQuerySchema.parse(req.query);
  const result = await reportService.getSalesReport(query);
  return handleReportResponse(res, result, 'Sales report');
});

export const getPurchasesReport = asyncHandler(async (req: Request, res: Response) => {
  const query = purchasesReportQuerySchema.parse(req.query);
  const result = await reportService.getPurchasesReport(query);
  return handleReportResponse(res, result, 'Purchases report');
});

export const getInventoryReport = asyncHandler(async (req: Request, res: Response) => {
  const query = inventoryReportQuerySchema.parse(req.query);
  const result = await reportService.getInventoryReport(query);
  return handleReportResponse(res, result, 'Inventory report');
});

export const getCustomersReport = asyncHandler(async (req: Request, res: Response) => {
  const query = customersReportQuerySchema.parse(req.query);
  const result = await reportService.getCustomersReport(query);
  return handleReportResponse(res, result, 'Customers report');
});

export const getExpensesReport = asyncHandler(async (req: Request, res: Response) => {
  const query = expensesReportQuerySchema.parse(req.query);
  const result = await reportService.getExpensesReport(query);
  return handleReportResponse(res, result, 'Expenses report');
});

export const getProfitReport = asyncHandler(async (req: Request, res: Response) => {
  const query = profitReportQuerySchema.parse(req.query);
  const result = await reportService.getProfitReport(query);
  return handleReportResponse(res, result, 'Profit & Loss report');
});
