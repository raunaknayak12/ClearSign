# ClearSign — Understand Before You Sign.

ClearSign is an AI-powered document analysis tool that breaks down legal documents into plain-language explanations. Upload a PDF or DOCX, and ClearSign will identify every clause, categorise it, and explain what it means — in seconds.

## Features (v1.0)

- **Universal Upload** — Drag-and-drop or file selector supporting PDF and DOCX documents (up to 10 MB)
- **Document-Type Awareness** — Auto-detects contract category (Employment, Lease/Rental, Non-Disclosure Agreement (NDA), Service Agreement, Vendor Agreement) using `llama-3.1-8b-instant`
- **Full-Coverage Breakdown** — Deep clause decomposition, categorization (Payment, Termination, Liability, Confidentiality, IP, Non-Compete), and plain-English translations powered by `llama-3.3-70b-versatile`
- **Risk & Red-Flag Identification** — Highlights atypical, high-liability, or aggressive clauses with actionable risk flags
- **Clause-Level Q&A** — Context-grounded interactive chat on specific clauses powered by low-latency Llama 3 inference
- **Real-Time Streaming** — Progressive Server-Sent Events (SSE) streaming clause cards directly to the UI without full-page blocking
- **Exportable PDF Reports** — High-quality downloadable analysis summary generated on-the-fly via ReportLab (`app/services/pdf_generator.py`)
- **Privacy-First Architecture** — Zero sign-up, zero document persistence, no tracking database. File streams process strictly in-memory

## Stack

| Layer | Technology | Details |
|---|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) | Tailwind CSS, Server-Sent Events client hook, progressive rendering |
| Backend | FastAPI (Python 3.12) | Async pipeline, PyMuPDF (`fitz`), `python-docx`, ReportLab |
| AI Inference | Groq Cloud API | `llama-3.3-70b-versatile` (analysis) & `llama-3.1-8b-instant` (classification / Q&A) |
| Hosting | Vercel & Render | Frontend on Vercel (`vercel.json`), Backend Docker service on Render (`render.yaml`) |
| CI/CD | GitHub Actions | Automated linting, test suites, and Vercel preview deploys |

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- Groq API key ([console.groq.com](https://console.groq.com))

### Setup

```bash
# Clone the repo
git clone https://github.com/raunaknayak12/ClearSign.git && cd ClearSign

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

Open [https://clearsign-gamma.vercel.app/](https://clearsign-gamma.vercel.app/) in your browser.

## Architecture

```
ClearSign/
├── frontend/                  # Next.js 14 App Router application
│   ├── app/                   # Root layout, /analyse and /view routes
│   ├── components/            # ClauseCard, DocumentViewer, RiskBadge, QAModal
│   ├── hooks/                 # useAnalysisStream.ts (SSE streaming client)
│   └── package.json           # React 18, Tailwind, Lucide icons
├── backend/                   # FastAPI high-throughput async microservice
│   ├── app/
│   │   ├── main.py            # FastAPI ASGI entrypoint, CORS, routers
│   │   ├── routers/           # /analyse (SSE stream), /qa (clause Q&A), /download-pdf
│   │   ├── services/
│   │   │   ├── extractor.py       # PDF/DOCX multi-format text parsing (PyMuPDF, docx)
│   │   │   ├── classifier.py      # Zero-shot contract type classification
│   │   │   ├── groq_client.py     # Resilient Groq async client with backoff
│   │   │   ├── clause_segmenter.py# Legal clause regex & boundary segmenter
│   │   │   ├── pdf_generator.py   # Client PDF summary compiler (ReportLab)
│   │   │   └── web_search.py      # Contextual legal definitions (DuckDuckGo Lite)
│   │   └── models/            # Pydantic request/response schemas & enums
│   ├── Dockerfile             # Multi-stage production container
│   └── requirements.txt       # Pinned backend dependencies
├── render.yaml                # Render Infrastructure-as-Code blueprint
├── vercel.json                # Vercel frontend routing & deployment config
└── README.md                  # Project documentation
```

## Authors & Contact

- **Author**: Raunak Nayak ([GitHub](https://github.com/raunaknayak12) · [LinkedIn](https://linkedin.com/in/raunak-nayak-5b937732a))
- **Live Application**: [https://clearsign-gamma.vercel.app/](https://clearsign-gamma.vercel.app/)

## Disclaimer

ClearSign is an AI assistant that aids document comprehension. It does not constitute legal advice and does not replace a qualified legal professional.

---

*v1.0 · June 2026*
