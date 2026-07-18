export function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])

  // Convert objects to CSV string
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          let val = row[header]
          if (val === null || val === undefined) val = ''
          val = String(val)
          // Escape quotes and wrap in quotes if contains comma
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val.replace(/"/g, '""')}"`
          }
          return val
        })
        .join(',')
    ),
  ].join('\n')

  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
