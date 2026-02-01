'use client'

import { Download } from 'lucide-react'

interface PaymentData {
  date: string
  heure: string
  client: string
  facture: string
  montant: number
  methode: string
  reference: string
}

interface ExportPaymentsButtonProps {
  data: PaymentData[]
}

export default function ExportPaymentsButton({ data }: ExportPaymentsButtonProps) {
  const handleExport = () => {
    if (data.length === 0) {
      alert('Aucune donnée à exporter')
      return
    }

    // CSV headers
    const headers = ['Date', 'Heure', 'Client', 'Facture', 'Montant TTC', 'Méthode', 'Référence']
    
    // CSV rows
    const rows = data.map(row => [
      row.date,
      row.heure,
      `"${row.client.replace(/"/g, '""')}"`, // Escape quotes
      row.facture,
      row.montant.toFixed(2).replace('.', ','), // French decimal format
      row.methode,
      `"${row.reference.replace(/"/g, '""')}"`
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
    const filename = `paiements_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`
    
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
      Exporter CSV
    </button>
  )
}
