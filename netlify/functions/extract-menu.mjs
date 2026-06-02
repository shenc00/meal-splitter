import Anthropic from '@anthropic-ai/sdk'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { imageData, mediaType, mode = 'menu' } = body
  if (!imageData || !mediaType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing imageData or mediaType' }) }
  }
  const isReceipt = mode === 'receipt'

  // base64 inflates size ~33%; Netlify caps the request body near 6 MB.
  // Reject early with a clear message instead of a confusing gateway error.
  const approxBytes = Math.floor(imageData.length * 0.75)
  if (approxBytes > 4 * 1024 * 1024) {
    return {
      statusCode: 413,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'File too large', details: 'Please upload a file under 4 MB (try a single-page PDF or a compressed image).' }),
    }
  }

  try {
    const client = new Anthropic({ apiKey })

    const isPdf = mediaType === 'application/pdf'
    const sourceBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageData } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            sourceBlock,
            {
              type: 'text',
              text: isReceipt
                ? 'This is an itemized restaurant receipt. Extract each ordered food/drink line item. For a line with quantity N and a line total, set "price" to the PER-UNIT price (line total divided by N) and repeat nothing — quantities are chosen later by each person. Ignore non-item lines (subtotal, rounding, change, totals). Detect whether a service charge line and a GST/tax line are present. Return ONLY a valid JSON object with no markdown: {"items":[{"name":string,"price":number,"category":one of "Appetizers"|"Main Course"|"Sides"|"Desserts"|"Drinks"|"Other"}],"serviceChargeDetected":boolean,"gstDetected":boolean}. Example: {"items":[{"name":"Chicken Rice","price":5.50,"category":"Main Course"}],"serviceChargeDetected":true,"gstDetected":true}'
                : 'Extract all menu items from this image. Return ONLY a valid JSON object with no markdown: {"items":[{"name":string,"price":number in the currency shown with no symbol,"category":one of "Appetizers"|"Main Course"|"Sides"|"Desserts"|"Drinks"|"Other"}]}. Example: {"items":[{"name":"Chicken Rice","price":5.50,"category":"Main Course"},{"name":"Teh Tarik","price":1.80,"category":"Drinks"}]}',
            },
          ],
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock) {
      throw new Error('Model returned no text content')
    }
    const text = textBlock.text.trim()

    // Strip markdown code fences if present, then pull out the JSON object.
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)

    let items = []
    let serviceChargeDetected = false
    let gstDetected = false

    if (objMatch) {
      const parsed = JSON.parse(objMatch[0])
      items = Array.isArray(parsed.items) ? parsed.items : []
      serviceChargeDetected = Boolean(parsed.serviceChargeDetected)
      gstDetected = Boolean(parsed.gstDetected)
    } else if (arrMatch) {
      // Fallback: model returned a bare array.
      items = JSON.parse(arrMatch[0])
    } else {
      throw new Error('Response did not contain JSON')
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, serviceChargeDetected, gstDetected }),
    }
  } catch (err) {
    console.error('Menu extraction error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to extract menu', details: err.message }),
    }
  }
}
