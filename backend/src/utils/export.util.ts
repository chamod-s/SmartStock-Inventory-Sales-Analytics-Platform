/**
 * Modular Report Export Engine
 *
 * Provides extensible data export capabilities with CSV implementation.
 * Designed to easily support PDF and Excel generators in future phases without touching business logic.
 */

export interface ExportColumn<T = any> {
  header: string;
  key: keyof T | string;
  format?: (value: any, row: T) => string;
}

export interface IReportExporter {
  generateCsv<T>(columns: ExportColumn<T>[], rows: T[]): string;
}

export class ModularReportExporter implements IReportExporter {
  /**
   * Escape special characters and wrap in quotes for CSV RFC 4180 compliance
   */
  private escapeCsvValue(val: any): string {
    if (val === null || val === undefined) {
      return '';
    }
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Extract nested object property e.g. 'customer.name'
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  /**
   * Generate RFC 4180 compliant CSV string from tabular dataset
   */
  public generateCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
    const headerRow = columns.map((c) => this.escapeCsvValue(c.header)).join(',');

    const dataRows = rows.map((row) => {
      return columns
        .map((col) => {
          const rawValue = this.getNestedValue(row, col.key as string);
          const formatted = col.format ? col.format(rawValue, row) : rawValue;
          return this.escapeCsvValue(formatted);
        })
        .join(',');
    });

    return [headerRow, ...dataRows].join('\r\n');
  }
}

export const reportExporter = new ModularReportExporter();
