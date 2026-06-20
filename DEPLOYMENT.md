# Deployment

## Security

Never commit these files:

- `backend/.env`
- `frontend/.env.local`
- Any file containing `GROQ_API_KEY` or other secrets

Use platform secret managers (Vercel Environment Variables, Render Secret Files).

## Frontend — Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com/new)
2. Set **Root Directory** to `frontend` (or use root `vercel.json`)
3. Environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | *(empty string)* |
| `API_BACKEND_URL` | `https://your-backend.onrender.com` |
| `NEXT_PUBLIC_MAX_FILE_MB` | `10` |

4. Deploy

## Backend — Render

1. Create a new **Web Service** from the GitHub repo
2. Use `render.yaml` or set:
   - **Root Directory**: `backend`
   - **Runtime**: Docker
3. Environment variables:

| Variable | Value |
|----------|-------|
| `GROQ_API_KEY` | Your Groq API key (secret) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `ENVIRONMENT` | `production` |

4. After deploy, copy the Render URL into Vercel's `API_BACKEND_URL`

## Verify production

```bash
curl https://your-backend.onrender.com/health
curl -I https://your-app.vercel.app
```

Upload a PDF on the Vercel site and confirm clause counts are consistent across repeated uploads.
