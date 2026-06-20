# ClearSign — Understand Before You Sign.

ClearSign is an AI-powered document analysis tool that breaks down legal documents into plain-language explanations. Upload a PDF or DOCX, and ClearSign will identify every clause, categorise it, and explain what it means — in seconds.

## Features (v1.0)

- **Universal Upload** — Drag-and-drop or tap to upload PDF/DOCX files (up to 10 MB)
- **Full-Coverage Breakdown** — Every clause identified, categorised, and explained in plain language
- **Document-Type Awareness** — Automatically detects document type (rental, employment, NDA, etc.)
- **Clause-Level Q&A** — Ask follow-up questions about any clause, grounded strictly in document content
- **Real-Time Streaming** — Clause cards stream in progressively via SSE — no full-page wait
- **Zero Friction** — No sign-up, no login, no data storage. Your document is never saved.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Backend | Python 3.12, FastAPI |
| AI | Groq API (Llama 3 70B / 8B) |
| Hosting | Vercel (frontend), Cloudflare Workers (backend) |

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- Groq API key ([console.groq.com](https://console.groq.com))

### Setup

```bash
# Clone the repo
git clone <repo-url> && cd clearsign

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env     # Edit with your GROQ_API_KEY
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp ../.env.example .env.local  # Edit NEXT_PUBLIC_API_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

```
clearsign/
├── frontend/          # Next.js 14 — Upload page + Results/Q&A page
├── backend/           # FastAPI — File extraction + Groq AI inference
├── .github/workflows/ # CI/CD — lint, test, deploy
├── .env.example       # All environment variables documented
└── README.md
```

## Disclaimer

ClearSign is an AI assistant that aids document comprehension. It does not constitute legal advice and does not replace a qualified legal professional.

---

*v1.0 · June 2026*
