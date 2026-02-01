'use client'

import { Download } from 'lucide-react'

interface InvoiceData {
  numero: string
  date: string
  client: string
  montantHT: number
  montantTTC: number
  paye: number
  reste: number
  statut: string
}

interface ExportInvoicesButtonProps {
  data: InvoiceData[]
}

export default function ExportInvoicesButton({ data }: ExportInvoicesButtonProps) {
  const handleExport = () => {
    if (data.length === 0) {
      alert('Aucune donnée à exporter')
      return
    }

    // CSV headers
    const headers = ['Numéro', 'Date', 'Client', 'Montant HT', 'Montant TTC', 'Payé', 'Reste à payer', 'Statut']
    
    // CSV rows
    const rows = data.map(row => [
      row.numero,
      row.date,
      `"${row.client.replace(/"/g, '""')}"`, // Escape quotes
      row.montantHT.toFixed(2).replace('.', ','), // French decimal format
      row.montantTTC.toFixed(2).replace('.', ','),
      row.paye.toFixed(2).replace('.', ','),
      row.reste.toFixed(2).replace('.', ','),
      row.statut
    ])

    // Build CSV content
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n')

    // Add BOM for Excel compatibility with French characters
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // Generate filename with date
    const now = new Date()
    const filename = `factures_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`
    
    // Download
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
    >
      <Download className="w-4 h-4" />
      CSV filtré
    </button>
  )
}
