<p align="center">
  <h1 align="center">Chicago Intelligence Company</h1>
  <p align="center">
    <strong>Autonomous AI-Powered VC Due Diligence in Minutes, Not Weeks</strong>
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> &nbsp;&middot;&nbsp;
    <a href="#how-it-works">How It Works</a> &nbsp;&middot;&nbsp;
    <a href="#architecture">Architecture</a> &nbsp;&middot;&nbsp;
    <a href="#api-reference">API Reference</a>
  </p>
</p>

<br/>

> **Drop in a company name. Get a full investment report.**
>
> CIC deploys an autonomous AI research agent that conducts 10–20 web searches, cross-references leadership on LinkedIn, analyzes market dynamics, evaluates competitive positioning, and delivers a structured 10-section VC analysis report — complete with a BUY / LEAN BUY / PASS recommendation — in under 10 minutes.

<br/>

## What You Get

| Section | What's Analyzed |
|---------|----------------|
| **Executive Summary** | Company overview, founding date, stage, lead investors |
| **Leadership Team** | Founders & executives with LinkedIn verification |
| **Market Analysis** | TAM/SAM sizing, growth rates, CAGR projections |
| **Product Positioning** | Value prop, differentiators, target customers, pricing |
| **Traction Metrics** | Revenue signals, user counts, growth indicators |
| **Competitive Landscape** | 3–5 competitors with strengths/weaknesses matrix |
| **Financial Analysis** | Funding history, revenue model, burn rate, runway |
| **Risk Assessment** | Categorized risks with severity and mitigation |
| **Investment Recommendation** | Rating, thesis, expected returns, timeline to exit |

**Output formats:** XLSX (formatted spreadsheet) &middot; CSV (Cofounder.co compatible) &middot; JSON (structured data)

<br/>

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Anthropic API key](https://console.anthropic.com/)

### 1. Clone & install

```bash
git clone <repo-url> && cd cic-real

# Python dependencies
pip install -r requirements.txt

# Dashboard dependencies
cd dashboard && npm install && cd ..
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Run

```bash
# Terminal 1 — API server
uvicorn server.main:app --port 8000

# Terminal 2 — Dashboard
cd dashboard && npm run dev
```

Open **http://localhost:3000** — enter a company name and hit Analyze.

### CLI Mode

Run the agent directly without the dashboard:

```bash
python agent.py "Stripe"
python agent.py "Anthropic"
python agent.py "SpaceX"
```

Reports are saved to `reports/` and intermediate research to `scratchpad/`.

<br/>

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  User enters company name + optional pitch deck                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Agent creates 8-task research plan                             │
│                                                                 │
│  ┌─── Task 1: Company overview & business model                 │
│  ├─── Task 2: Leadership team + LinkedIn verification           │
│  ├─── Task 3: Market analysis (TAM, SAM, growth)                │
│  ├─── Task 4: Competitive landscape                             │
│  ├─── Task 5: Traction & performance metrics                    │
│  ├─── Task 6: Financial analysis                                │
│  ├─── Task 7: Risk assessment                                   │
│  └─── Task 8: Final report compilation                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │  10–20 web searches
                            │  per analysis
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Structured JSON report + XLSX + CSV                            │
│  with BUY / LEAN BUY / PASS recommendation                     │
└─────────────────────────────────────────────────────────────────┘
```

### The Agent Loop

The core of CIC is a controlled while-loop in `agent.py`, powered by Claude Sonnet 4:

```
while stop_reason == "tool_use":
    response = claude(system + pinned_plan + history)
    execute client-side tools → send results back
    # web_search is server-side, handled by the API automatically

if agent tries to stop with incomplete tasks:
    inject "you have N tasks left" → continue loop
```

Three mechanisms make this reliable:

**Pinned Plan** — The todo list is re-injected into the system prompt on every iteration. It never drifts into conversation history noise.

**Re-injected Hints** — Every tool result carries a `[NEXT]` instruction nudging the agent toward the next action. No time wasted on "what should I do now?"

**Exit Gate** — If the agent outputs text with no tool calls but has incomplete tasks, the code injects a continuation prompt and forces the loop to resume. The LLM cannot decide when it's done — the code does.

### Real-Time Dashboard

Every agent action streams to the browser via WebSocket:

- Search queries appear as they're sent
- Task progress updates live with completion percentage
- Research files populate in the scratchpad viewer
- Token usage and estimated cost tracked per turn

<br/>

## Architecture

```
┌──────────────────┐      WebSocket       ┌──────────────────────┐
│                  │◄────────────────────►│                      │
│   Next.js 15     │      REST API        │   FastAPI + Uvicorn  │
│   React 19       │◄────────────────────►│                      │
│   Tailwind CSS 4 │                      │   AgentRunner        │
│                  │                      │   (thread → async)   │
│   Dashboard UI   │                      │                      │
└──────────────────┘                      └──────────┬───────────┘
   localhost:3000                                     │
                                                      │
                                              ┌───────▼───────┐
                                              │               │
                                              │   agent.py    │
                                              │   Claude API  │
                                              │   + web_search│
                                              │               │
                                              └───────┬───────┘
                                                      │
                                              ┌───────▼───────┐
                                              │  report_gen   │
                                              │  XLSX / CSV   │
                                              └───────────────┘
```

### Key Design Decisions

| Pattern | Why |
|---------|-----|
| **Pinned Plan** | Todo list re-injected every turn prevents agent drift over 50+ turns |
| **Exit Gate** | Agent can't self-terminate with incomplete tasks — code enforces completion |
| **Server-side Search** | Web search runs inside Claude's API — zero latency for result handoff |
| **Event-driven UI** | WebSocket events → React reducer — no polling, instant updates |
| **Thread-to-async Bridge** | Agent blocks on API calls in a thread; `AgentRunner` bridges to FastAPI's async loop |

<br/>

## Project Structure

```
cic-real/
├── agent.py                  # Autonomous VC analysis agent
├── report_generator.py       # XLSX + CSV report generation
├── requirements.txt          # Python dependencies
├── .env.example              # Environment template
│
├── server/
│   ├── main.py               # FastAPI server + endpoints
│   ├── runner.py             # Thread-to-async bridge
│   └── events.py             # Event type definitions
│
├── dashboard/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── dashboard/page.tsx    # Analysis dashboard
│   │   │   └── globals.css           # Design system
│   │   ├── components/
│   │   │   ├── TopBar.tsx            # Header + controls
│   │   │   ├── ActivityFeed.tsx      # Real-time event log
│   │   │   ├── Workspace.tsx         # Task plan + scratchpad
│   │   │   ├── ReportOverlay.tsx     # Report viewer modal
│   │   │   └── ...
│   │   └── lib/
│   │       ├── websocket.ts          # WebSocket connection hook
│   │       ├── demo.ts              # Demo mode event replay
│   │       └── types.ts             # TypeScript interfaces
│   └── package.json
│
├── scratchpad/               # Agent research files (runtime)
└── reports/                  # Generated reports (runtime)
```

<br/>

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Start analysis — body: `{ company, pitch_context? }` |
| `POST` | `/api/upload-pitch` | Upload pitch deck (PDF/TXT/MD) |
| `WS` | `/ws/{run_id}` | Stream real-time agent events |
| `GET` | `/api/report/{run_id}` | Fetch completed report JSON |
| `GET` | `/api/download/{run_id}/{fmt}` | Download report (`xlsx` / `csv` / `json`) |
| `GET` | `/api/download-all/{run_id}` | Download all formats as ZIP |
| `GET` | `/api/runs` | List all analysis runs |
| `GET` | `/health` | Health check |

<br/>

## Investment Rating Scale

| Rating | Sentiment | Meaning |
|--------|-----------|---------|
| **STRONG BUY** | Bullish | Exceptional opportunity — clear market leader potential |
| **BUY** | Positive | Strong fundamentals with manageable risks |
| **LEAN BUY** | Cautiously Positive | Promising but notable concerns to monitor |
| **PASS** | Negative | Risk/reward unfavorable — do not invest |
| **NEEDS MORE DATA** | Inconclusive | Insufficient public information |

<br/>

## Demo Mode

The dashboard includes a built-in demo that replays a complete analysis of **Indigo Systems & Technology Consulting Inc** — an IAM consulting firm. It walks through all 8 research tasks with realistic timing, showing how the agent researches, reasons, and arrives at a **LEAN BUY** recommendation with 15–25% risk-adjusted IRR.

Click **"Watch Demo"** on the landing page to see it in action without using any API credits.

<br/>

## Performance & Cost

| Metric | Typical Range |
|--------|--------------|
| Runtime | 3–10 minutes per company |
| Web searches | 10–20 per analysis |
| Input tokens | 50K–150K |
| Output tokens | 8K–60K |
| **Cost per analysis** | **$0.50–2.00** |

<br/>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI** | Claude Sonnet 4 via Anthropic API |
| **Backend** | Python, FastAPI, Uvicorn, WebSockets |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| **Reports** | openpyxl (XLSX), CSV, JSON |

<br/>

## License

Proprietary. All rights reserved.

---

<p align="center">
  <strong>Chicago Intelligence Company</strong><br/>
  <sub>Turning hours of due diligence into minutes of intelligence.</sub>
</p>
