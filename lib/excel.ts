import * as XLSX from 'xlsx'

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param sheetName Name of the Excel sheet
 * @param filename Name of the file (without extension)
 * @returns Excel file as Buffer
 */
export function exportToExcel(
  data: Record<string, any>[],
  sheetName: string = 'Data',
  filename: string = 'export'
): Buffer {
  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Convert to buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return excelBuffer
}

/**
 * Format date for Excel
 */
export function formatDateForExcel(date: Date | string | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format datetime for Excel
 */
export function formatDateTimeForExcel(date: Date | string | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format money for Excel (2 decimal places)
 */
export function formatMoneyForExcel(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return amount.toFixed(2).replace('.', ',')
}

/**
 * Format percentage for Excel
 */
export function formatPercentForExcel(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) return '-'
  return `${percent.toFixed(2)}%`.replace('.', ',')
}
