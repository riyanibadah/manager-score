# Rate My Manager

Honest manager reviews from real employees.

## Deploy to Netlify

### Option A — Drag & drop (easiest)

1. Install dependencies and build:
   ```
   npm install
   npm run build
   ```
2. Go to [netlify.com](https://netlify.com) → Add new site → Deploy manually
3. Drag the `dist/` folder into the upload area
4. Done — your site is live

> **Note:** With drag & drop, the AI tag generation won't work (it needs a server). Everything else will. To enable AI tags, use Option B.

---

### Option B — Git deploy (enables AI features)

1. Push this folder to a GitHub/GitLab repo
2. In Netlify: Add new site → Import from Git → select your repo
3. Build settings are auto-detected from `netlify.toml`
4. Go to **Site settings → Environment variables** and add:
   ```
   ANTHROPIC_API_KEY = sk-ant-...
   ```
5. Redeploy — AI tag generation will now work on the review form

Get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com)

---

## Local development

```
npm install
npm run dev
```

Open http://localhost:5173

> AI tags won't work locally unless you add `ANTHROPIC_API_KEY` to a `.env` file and set up the Netlify CLI (`netlify dev`).

---

## Data storage

Reviews are stored in the visitor's browser (`localStorage`). Each visitor sees only their own submitted reviews. To add a shared database (so all visitors see all reviews), you'd need to connect a backend — Supabase or Airtable work well for this.
