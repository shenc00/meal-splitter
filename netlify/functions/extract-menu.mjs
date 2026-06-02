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

  const { imageData, mediaType } = body
  if (!imageData || !mediaType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing imageData or mediaType' }) }
  }

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData },
            },
            {
              type: 'text',
              text: 'Extract all menu items from this image. Return ONLY a valid JSON array with no markdown formatting. Each object must have exactly these fields: "name" (string), "price" (number in the currency shown, no currency symbol), "category" (one of: "Appetizers", "Main Course", "Sides", "Desserts", "Drinks", "Other"). Example output: [{"name":"Chicken Rice","price":5.50,"category":"Main Course"},{"name":"Teh Tarik","price":1.80,"category":"Drinks"}]',
            },
          ],
        },
      ],
    })

    const text = message.content[0].text.trim()

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Response did not contain a JSON array')
    }

    const items = JSON.parse(jsonMatch[0])

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
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
