export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Debug: log exactly what we receive
    console.log('req.body:', JSON.stringify(req.body))
    console.log('Content-Type:', req.headers['content-type'])

    const { question } = req.body

    if (!question) {
      return res.status(400).json({ 
        error: 'No question provided',
        received: req.body,
        contentType: req.headers['content-type']
      })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert Louisiana state tax law advisor specializing in Louisiana Revised Statutes (RS) Title 47 and Louisiana Department of Revenue regulations.

You MUST respond with a valid JSON object only. No extra text, no markdown, no code fences.

Required JSON structure:
{
  "status": "TAXABLE",
  "summary": "One direct sentence answer stating the taxability",
  "analysis": "Paragraph 1 here.\\n\\nParagraph 2 here.\\n\\nParagraph 3 here.",
  "statutes": [
    { "code": "RS 47:301", "title": "Definitions", "excerpt": "What this statute says" }
  ],
  "examples": [
    { "title": "Example name", "description": "Two sentence scenario.", "status": "taxable" }
  ],
  "localNotes": "Parish or local tax notes, or empty string",
  "tpp": true,
  "relatedQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}

The status field must be exactly one of: TAXABLE, EXEMPT, PARTIALLY_TAXABLE, NEEDS_MORE_INFO
The examples status field must be exactly: taxable or exempt`
          },
          {
            role: 'user',
            content: `Louisiana tax question: ${question}`
          }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({ 
        error: err?.error?.message || `Groq API error ${response.status}` 
      })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    if (!raw) {
      return res.status(500).json({ error: 'Empty response from AI. Please try again.' })
    }

    // Try to extract JSON if there's any extra text
    let clean = raw.trim()
    const jsonStart = clean.indexOf('{')
    const jsonEnd = clean.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      clean = clean.substring(jsonStart, jsonEnd + 1)
    }

    try {
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch (e) {
      console.error('JSON parse error:', e.message)
      console.error('Raw response:', raw)
      return res.status(500).json({ 
        error: 'AI returned an invalid response. Please try your question again.' 
      })
    }

  } catch (err) {
    console.error('Handler error:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
