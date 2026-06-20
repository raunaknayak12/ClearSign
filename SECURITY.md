# Security

## Never commit secrets

The following are **gitignored** and must never be pushed to GitHub:

- `backend/.env` — contains `GROQ_API_KEY`
- `frontend/.env.local` — local API URLs
- `backend/app/cache/` — may contain analysed document text
- `frontend/api/_backend/app/cache/`

Only `.env.example` files (with placeholder values) are safe to commit.

## Before pushing

```powershell
git status --ignored
git ls-files | Select-String "\.env"
```

If any real `.env` file appears in `git ls-files`, **do not push**.

## Production secrets

Set these only in hosting dashboards (Vercel / Render), never in git:

| Secret | Where |
|--------|-------|
| `GROQ_API_KEY` | Render backend env |
| `ALLOWED_ORIGINS` | Render backend env |
| `API_BACKEND_URL` | Vercel env (server-side) |
| `VERCEL_TOKEN` | GitHub Actions secrets |

## Rotate keys if exposed

If a `.env` file was ever committed or shared, rotate your Groq API key at [console.groq.com](https://console.groq.com) immediately.
