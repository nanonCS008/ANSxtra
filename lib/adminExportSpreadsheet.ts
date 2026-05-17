import * as XLSX from 'xlsx'

export function statusLabelForExport(status: string): string {
  if (status === 'approved') return 'Enrolled'
  if (status === 'rejected') return 'Denied'
  if (status === 'pending') return 'Pending'
  return status
}

export function buildSpreadsheetBuffer(header: string[], rows: unknown[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

  ws['!cols'] = header.map((h, colIdx) => {
    let maxLen = h.length
    for (const row of rows) {
      const text = String(row[colIdx] ?? '')
      const firstLine = text.split('\n')[0] ?? ''
      maxLen = Math.max(maxLen, firstLine.length)
    }
    return { wch: Math.min(Math.max(maxLen + 2, 12), 72) }
  })

  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }

  const videoColIndexes = header
    .map((label, index) => (/video/i.test(label) ? index : -1))
    .filter((index) => index >= 0)

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (const colIndex of videoColIndexes) {
      const url = String(rows[rowIndex][colIndex] ?? '').trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) continue
      const ref = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex })
      ws[ref] = {
        t: 's',
        v: 'Watch application video',
        l: { Target: url, Tooltip: 'Open video submission' },
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Applications')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
