// Shared client for the AI extraction function, used by both the menu scanner
// (mode 'menu') and the receipt scanner (mode 'receipt').
//
// Returns { items, serviceChargeDetected, gstDetected }. The tax flags are only
// meaningful for receipts; for menus they come back false.

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result.split(',')[1])
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

export async function extractItems(file, mode = 'menu') {
  const base64 = await fileToBase64(file)

  const res = await fetch('/.netlify/functions/extract-menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData: base64, mediaType: file.type, mode }),
  })

  if (!res.ok) {
    let detail = `Server error ${res.status}`
    try {
      const errBody = await res.json()
      if (errBody.error) detail = errBody.details ? `${errBody.error}: ${errBody.details}` : errBody.error
    } catch {
      // response wasn't JSON (e.g. gateway timeout) — keep status-based message
    }
    throw new Error(detail)
  }

  const data = await res.json()
  return {
    items: data.items || [],
    serviceChargeDetected: Boolean(data.serviceChargeDetected),
    gstDetected: Boolean(data.gstDetected),
  }
}
