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
    { "name": "<course name>", "grade": "<letter grade or null>", "credits": <number>, "in_progress": <boolean>, "term": "<term name or null>" }
  ],
  "terms": [
    { "name": "<term name e.g. Fall 2024>", "gpa": <number or null>, "credits": <number or null>, "status": "completed" | "in_progress" }
  ],
  "summary": "<one sentence plain English summary of what you found>"
}

Rules:
- If you cannot find certain data, use null.
- "total_credits" must be the number of credits used as the DENOMINATOR of the cumulative GPA. On a transcript this is labeled "GPA Units" or "Cum GPA Units" or "credits earned with grades" — NOT "attempted credits" or "total points." If the transcript shows e.g. "78 attempted / 50 earned / 50 GPA Units / 128.30 points," return 50.
- For each course: letter grades use standard format (A, A-, B+, B, B-, C+, C, C-, D+, D, F). If a course has no current letter grade (in-progress, blank, or showing 0.00 earned), return grade: null and in_progress: true.
- Set "in_progress": true for any course whose grade is tentative, still changeable, blank, or marked current/future-semester. Set "in_progress": false for completed/final grades from past terms.
- If a single screenshot shows only one current semester of grades (e.g., a grade-portal view), mark every course in_progress: true.
- Always include "term" per course if the transcript groups by term (e.g., "Fall 2024", "Spring 2026").
- "terms" array: include one entry per term shown on the transcript, in chronological order. Use the per-term GPA reported (often labeled "Term GPA"). status is "completed" if the term has final grades, "in_progress" if any course in that term lacks a final grade.`;

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
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
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
      console.error('Anthropic error status:', anthropicRes.status);
      console.error('Anthropic error body:', text);
      return res.status(502).json({ error: 'Upstream model error.', detail: text, status: anthropicRes.status });
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
