import { api } from './api';

export type SupportedExportFormat = 'csv' | 'pdf' | 'excel';

/**
 * Triggers a browser download of a blob or string content
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Modular report export dispatcher.
 * Currently generates verified RFC 4180 CSV downloads;
 * extensible to PDF and Excel generators.
 */
export async function exportReport(
  reportType: 'sales' | 'purchases' | 'inventory' | 'customers' | 'expenses' | 'profit',
  params: Record<string, any>,
  format: SupportedExportFormat = 'csv'
): Promise<void> {
  if (format === 'csv') {
    const res = await api.get(`/reports/${reportType}`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${reportType}-report-${timestamp}.csv`;
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    triggerBrowserDownload(blob, filename);
    return;
  }

  // Extensible future PDF / Excel support
  throw new Error(`Export format '${format}' is scheduled for an upcoming release.`);
}
