import ExcelJS from 'exceljs'

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param sheetName Name of the Excel sheet
 * @param filename Name of the file (without extension)
 * @returns Excel file as Buffer
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  sheetName: string = 'Data',
  _filename: string = 'export'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName, { headerFooter: { firstHeader: sheetName } })

  if (data.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  const keys = Object.keys(data[0] as object)
  worksheet.columns = keys.map((k) => ({
    header: k,
    key: k,
    width: Math.min(20, Math.max(10, k.length + 2)),
  }))
  worksheet.addRows(data)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
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
