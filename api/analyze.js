const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
]);

const MAX_BASE64_BYTES = 10 * 1024 * 1024;

const EXTRACTION_PROMPT = `You are analyzing a student's academic transcript or grade report. Extract the following and respond ONLY with valid JSON, no markdown, no explanation:
{
  "cumulative_gpa": <number or null>,
  "total_credits": <number or null>,
  "courses": [
    { "name": "<course name>", "grade": "<letter grade>", "credits": <number> }
  ],
  "summary": "<one sentence plain English summary of what you found>"
}
If you cannot find certain data, use null. For courses, only include courses visible in the transcript. Letter grades should be standard format: A, A-, B+, B, B-, C+, C, C-, D+, D, F.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'Server is not configured.' });
  }

  const { base64, mime } = req.body || {};

  if (typeof base64 !== 'string' || typeof mime !== 'string') {
    return res.status(400).json({ error: 'Missing base64 or mime in request body.' });
  }
  if (!ALLOWED_MIME.has(mime)) {
    return res.status(400).json({ error: 'Unsupported file type.' });
  }
  if (base64.length > MAX_BASE64_BYTES) {
    return res.status(413).json({ error: 'File too large. Max 10 MB.' });
  }

  const isPdf = mime === 'application/pdf';
  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } };

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: EXTRACTION_PROMPT }
          ]
        }]
      })
    });

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      console.error('Anthropic error', anthropicRes.status, text);
      return res.status(502).json({ error: 'Upstream model error.' });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || []).find(b => b.type === 'text')?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse model output:', raw);
      return res.status(502).json({ error: 'Could not parse transcript data.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Handler error', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' }
  }
};
