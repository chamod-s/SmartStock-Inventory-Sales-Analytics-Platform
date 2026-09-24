import { SaleRepository, saleRepository as defaultSaleRepo, SaleWithDetails } from '../repositories/sale.repository';
import { SaleService, saleService as defaultSaleService, FormattedSaleWithDetails } from './sale.service';
import { SaleQueryInput } from '../validators/sale.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export interface BusinessInfo {
  name: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  currency: string;
  terms: string;
}

export const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  name: 'SmartStock Retail & Wholesale Solutions',
  legalName: 'SmartStock Platform Inc.',
  address: '100 Business Tech Parkway, Suite 400, Innovation City, NY 10001',
  phone: '+1 (800) 555-STOCK',
  email: 'billing@smartstock.com',
  website: 'https://smartstock.io',
  taxId: 'US-TAX-89210-POS',
  currency: 'USD',
  terms: 'Thank you for shopping with SmartStock. All returns or exchanges must be presented within 14 days with this invoice in original condition and packaging.',
};

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionRef: string | null;
  paidAt: string;
}

export interface InvoiceDetails {
  business: BusinessInfo;
  id: string;
  invoiceNumber: string;
  date: string;
  formattedDate: string;
  status: string;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  customer: {
    id: string | null;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  cashier: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalPaid: number;
  balanceRemaining: number;
  payments: InvoicePayment[];
  paymentMethod: string;
  notes: string | null;
}

export interface InvoiceSummaryItem {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  cashierName: string;
  totalAmount: number;
  totalPaid: number;
  balanceRemaining: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  itemCount: number;
}

export interface InvoiceListResult extends IPaginatedData<InvoiceSummaryItem> {
  business: BusinessInfo;
}

export class InvoiceService {
  constructor(
    private saleRepo: SaleRepository = defaultSaleRepo,
    private saleService: SaleService = defaultSaleService,
    private businessInfo: BusinessInfo = DEFAULT_BUSINESS_INFO
  ) {}

  public formatInvoice(sale: FormattedSaleWithDetails | SaleWithDetails): InvoiceDetails {
    const formattedSale =
      'totalPaid' in sale
        ? (sale as FormattedSaleWithDetails)
        : SaleService.formatSaleDetails(sale as SaleWithDetails);

    const subtotal = Number(formattedSale.subtotal);
    const discount = Number(formattedSale.discountAmount);
    const tax = Number(formattedSale.taxAmount);
    const total = Number(formattedSale.totalAmount);
    const totalPaid = Number(formattedSale.totalPaid);
    const balanceRemaining = Number(formattedSale.balanceRemaining);

    const items: InvoiceItem[] = (formattedSale.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || 'Item',
      sku: item.product?.sku || 'N/A',
      category: (item.product as any)?.category?.name || 'General',
      quantity: item.quantity,
      unit: item.product?.unit || 'pcs',
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    }));

    const payments: InvoicePayment[] = (formattedSale.payments || []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      transactionRef: p.transactionRef,
      paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : String(p.paidAt),
    }));

    const paymentMethodsSet = new Set(payments.map((p) => p.paymentMethod));
    const paymentMethodSummary =
      paymentMethodsSet.size > 0 ? Array.from(paymentMethodsSet).join(', ') : 'UNPAID';

    const createdAtDate =
      formattedSale.createdAt instanceof Date ? formattedSale.createdAt : new Date(formattedSale.createdAt);

    return {
      business: this.businessInfo,
      id: formattedSale.id,
      invoiceNumber: formattedSale.invoiceNumber,
      date: createdAtDate.toISOString(),
      formattedDate: createdAtDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: formattedSale.status,
      paymentStatus: formattedSale.paymentStatus,
      customer: {
        id: formattedSale.customer?.id || null,
        code: formattedSale.customer?.code || 'WALK-IN',
        name: formattedSale.customer?.name || 'Walk-in Customer',
        email: formattedSale.customer?.email || null,
        phone: formattedSale.customer?.phone || null,
      },
      cashier: {
        id: formattedSale.user?.id || '',
        name: formattedSale.user?.name || 'Cashier',
        email: formattedSale.user?.email || '',
        role: formattedSale.user?.role || 'CASHIER',
      },
      items,
      subtotal,
      discount,
      tax,
      total,
      totalPaid,
      balanceRemaining,
      payments,
      paymentMethod: paymentMethodSummary,
      notes: formattedSale.notes,
    };
  }

  public async getInvoiceById(id: string): Promise<InvoiceDetails> {
    const sale = await this.saleRepo.findById(id);
    if (!sale) {
      throw ApiError.notFound(`Invoice with sale ID '${id}' was not found`);
    }
    return this.formatInvoice(sale);
  }

  public async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceDetails> {
    const sale = await this.saleRepo.findByInvoiceNumber(invoiceNumber);
    if (!sale) {
      throw ApiError.notFound(`Invoice '${invoiceNumber}' was not found`);
    }
    return this.formatInvoice(sale);
  }

  public async listInvoices(query: SaleQueryInput): Promise<InvoiceListResult> {
    const salesResult = await this.saleService.listSales(query);

    const items: InvoiceSummaryItem[] = salesResult.items.map((sale) => {
      const payments = sale.payments || [];
      const methods = Array.from(new Set(payments.map((p) => p.paymentMethod))).join(', ');

      return {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        date: sale.createdAt instanceof Date ? sale.createdAt.toISOString() : String(sale.createdAt),
        customerName: sale.customer?.name || 'Walk-in Customer',
        cashierName: sale.user?.name || 'Cashier',
        totalAmount: Number(sale.totalAmount),
        totalPaid: Number(sale.totalPaid),
        balanceRemaining: Number(sale.balanceRemaining),
        status: sale.status,
        paymentStatus: sale.paymentStatus,
        paymentMethod: methods || 'UNPAID',
        itemCount: sale.items?.length || 0,
      };
    });

    return {
      items,
      pagination: salesResult.pagination,
      business: this.businessInfo,
    };
  }

  public generatePrintableHtml(invoice: InvoiceDetails): string {
    const b = invoice.business;
    const itemsHtml = invoice.items
      .map(
        (item, index) => `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b;">${index + 1}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; font-size: 13px;">${item.productName}</strong><br />
            <span style="font-size: 11px; color: #64748b;">SKU: ${item.sku} &bull; ${item.category}</span>
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${item.quantity} ${item.unit}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">$${item.subtotal.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const paymentsHtml =
      invoice.payments.length > 0
        ? invoice.payments
            .map(
              (p) => `
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569;">
            <span>${p.paymentMethod.replace('_', ' ')} ${p.transactionRef ? `(${p.transactionRef})` : ''}:</span>
            <strong style="font-family: monospace; color: #059669;">$${p.amount.toFixed(2)}</strong>
          </div>`
            )
            .join('')
        : '<div style="font-size: 12px; color: #dc2626; font-style: italic;">No payment recorded yet.</div>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoice.invoiceNumber} - ${b.name}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 20px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .brand-name {
      font-size: 24px;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .meta-box { text-align: right; }
    .invoice-title {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .invoice-number {
      font-size: 26px;
      font-weight: 900;
      color: #0f172a;
      font-family: monospace;
      margin: 4px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      text-transform: uppercase;
    }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-partial { background: #fef3c7; color: #b45309; }
    .status-unpaid { background: #fee2e2; color: #b91c1c; }
    .grid-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 28px;
      gap: 20px;
    }
    .info-col { width: 48%; }
    .info-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 8px;
      border-bottom: 2px solid #cbd5e1;
    }
    .totals-container {
      display: flex;
      justify-content: space-between;
      border-top: 2px solid #e2e8f0;
      padding-top: 18px;
    }
    .totals-col { width: 280px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 13px;
      color: #475569;
    }
    .grand-total {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      border-top: 1px solid #cbd5e1;
      margin-top: 6px;
      padding-top: 8px;
    }
    .footer-terms {
      margin-top: 32px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; width: 100%; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #4f46e5; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-name">${b.name}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">
          ${b.address}<br />
          Phone: ${b.phone} &bull; Email: ${b.email}<br />
          Tax Reg ID: ${b.taxId} &bull; ${b.website}
        </div>
      </div>
      <div class="meta-box">
        <div class="invoice-title">Sales Invoice</div>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Date: ${invoice.formattedDate}</div>
        <div>
          <span class="status-badge ${
            invoice.paymentStatus === 'PAID'
              ? 'status-paid'
              : invoice.paymentStatus === 'PARTIALLY_PAID'
              ? 'status-partial'
              : 'status-unpaid'
          }">
            ${invoice.paymentStatus.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>

    <div class="grid-info">
      <div class="info-col">
        <div class="info-label">Customer / Billed To:</div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${invoice.customer.name}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">
          Customer Code: ${invoice.customer.code}<br />
          ${invoice.customer.phone ? `Phone: ${invoice.customer.phone}<br />` : ''}
          ${invoice.customer.email ? `Email: ${invoice.customer.email}` : ''}
        </div>
      </div>
      <div class="info-col" style="text-align: right;">
        <div class="info-label">Cashier & Station:</div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${invoice.cashier.name}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">
          Role: ${invoice.cashier.role}<br />
          Station: Terminal 01 &bull; Status: ${invoice.status}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th style="text-align: left;">Product Description</th>
          <th style="text-align: center; width: 80px;">Qty</th>
          <th style="text-align: right; width: 100px;">Unit Price</th>
          <th style="text-align: right; width: 100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-container">
      <div style="max-width: 320px;">
        <div class="info-label">Payment Information</div>
        ${paymentsHtml}
        ${
          invoice.notes
            ? `<div style="margin-top: 12px; font-size: 12px; color: #64748b;"><em>Note: ${invoice.notes}</em></div>`
            : ''
        }
      </div>

      <div class="totals-col">
        <div class="total-row">
          <span>Subtotal:</span>
          <span style="font-family: monospace;">$${invoice.subtotal.toFixed(2)}</span>
        </div>
        ${
          invoice.discount > 0
            ? `<div class="total-row" style="color: #dc2626;">
          <span>Discount:</span>
          <span style="font-family: monospace;">-$${invoice.discount.toFixed(2)}</span>
        </div>`
            : ''
        }
        <div class="total-row">
          <span>Tax Amount:</span>
          <span style="font-family: monospace;">+$${invoice.tax.toFixed(2)}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total Invoice:</span>
          <span style="font-family: monospace; font-size: 18px;">$${invoice.total.toFixed(2)}</span>
        </div>
        <div class="total-row" style="color: #059669; font-weight: 600;">
          <span>Total Paid:</span>
          <span style="font-family: monospace;">$${invoice.totalPaid.toFixed(2)}</span>
        </div>
        ${
          invoice.balanceRemaining > 0
            ? `<div class="total-row" style="color: #b45309; font-weight: 700;">
          <span>Balance Due:</span>
          <span style="font-family: monospace;">$${invoice.balanceRemaining.toFixed(2)}</span>
        </div>`
            : ''
        }
      </div>
    </div>

    <div class="footer-terms">
      <p>${b.terms}</p>
      <p style="margin-top: 4px; font-family: monospace; font-size: 10px; color: #94a3b8;">Generated by SmartStock &bull; Invoice Record: ${invoice.id}</p>
    </div>
  </div>
</body>
</html>`;
  }
}

export const invoiceService = new InvoiceService();
