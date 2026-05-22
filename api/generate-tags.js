export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { reviewText, managerTitle, company } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Given this employee review of a manager, generate 4-6 concise trait tags (2-4 words each). Return ONLY a JSON array, no markdown, no explanation. Each item: {"tag":"string","sentiment":"positive"|"negative"|"neutral"}.

Manager: ${managerTitle} at ${company}
Review: "${reviewText}"`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '[]';
    const tags = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
