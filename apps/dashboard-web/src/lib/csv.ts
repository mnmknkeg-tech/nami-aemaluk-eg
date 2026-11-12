/**
 * تصدير CSV — تفويض لمحرك التصدير الموحد (BOM + escaping + حماية من حقن الصيغ).
 * تحميل المحرك lazy حتى لا تُحمّل مكتبة Excel إلا عند التصدير فعلاً.
 */
export async function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const { buildExportBlob, downloadBlob } = await import('@/lib/export');
  const blob = buildExportBlob({ filename, headers, rows }, 'csv');
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}
