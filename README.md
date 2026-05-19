# GPA Calculator

Single-page GPA calculator with two flows:
1. **Upload transcript** — drop a screenshot or PDF, Claude reads the grades and returns the cumulative GPA, courses, and a summary.
2. **Manual entry** — type in current GPA + this semester's courses, get a projected GPA against a 3.0 student-teaching benchmark.

A "Path to the benchmark" card tells students what semester GPA they need to reach 3.0, in plain English, with grade-combination scenarios and an adjustable credit-load slider.

## Stack

- Static `index.html` (no build step)
- One Vercel serverless function at `api/analyze.js` that proxies the Anthropic API (keeps the API key server-side)
- Model: `claude-sonnet-4-6`

## Local dev

```bash
npm install -g vercel
vercel dev
```

`vercel dev` will prompt you to link the project and pull env vars. Open http://localhost:3000.

To run without the upload flow (just the manual calculator), open `index.html` directly in a browser.

## Deploy

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In **Project Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your `sk-ant-...` key
4. Redeploy (or push a commit — auto-deploys).

## Cost / abuse protection

The proxy enforces a 10 MB request size cap, so a single call can't blow up. **Set a hard monthly spend cap on your Anthropic key** at [console.anthropic.com → Limits](https://console.anthropic.com/settings/limits) — recommended $10–20 to start. Without that cap, anyone with the URL can run up your bill.

If the app gets shared widely, add per-IP rate limiting via Vercel KV or Upstash Redis.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Full UI + manual GPA math |
| `benchmark-path.js` | Pure helpers for the "Path to the benchmark" card |
| `test-benchmark.html` | Browser test runner for `benchmark-path.js` — open directly |
| `api/analyze.js` | Serverless proxy → Anthropic |
| `vercel.json` | Function timeout (30s for PDFs) |
| `package.json` | Marks Node 20 runtime |
