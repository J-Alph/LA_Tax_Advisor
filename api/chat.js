export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { question } = req.body

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `You are an expert Louisiana state tax law advisor specializing in Louisiana Revised Statutes (RS) Title 47 and Louisiana Department of Revenue regulations.

Analyze the tax question and respond ONLY with a valid JSON object. No markdown, no backticks, no explanation outside the JSON.

Use this exact structure:
{
  "status": "TAXABLE" or "EXEMPT" or "PARTIALLY_TAXABLE" or "NEEDS_MORE_INFO",
  "summary": "One direct sentence answer stating the taxability",
  "analysis": "Detailed 2-3 paragraph legal analysis. Separate paragraphs with \\n\\n",
  "statutes": [
    { "code": "RS 47:XXX", "title": "Short descriptive title", "excerpt": "What this statute says relevant to this topic" }
  ],
  "examples": [
    {
      "title": "Short example name (3-5 words)",
      "description": "Real-world scenario showing how the tax rule applies in practice (2 sentences)",
      "status": "taxable" or "exempt"
    }
  ],
  "localNotes": "Any parish or local tax considerations, or empty string if none",
  "tpp": true or false,
  "relatedQuestions": ["Related question 1?", "Related question 2?", "Related question 3?"]
}`
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
      return res.status(response.status).json({ error: err?.error?.message || 'Groq API error' })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim()

    try {
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' })
    }

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
