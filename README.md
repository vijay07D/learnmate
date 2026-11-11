# LearnMate — AI Agent for Personalized Career Discovery

> IBM SkillsBuild University Education · Proof of Concept

LearnMate is a conversational AI agent that helps students discover career paths, understand skill gaps, and build personalized learning roadmaps — powered by **IBM Granite** via watsonx.ai.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Stack and Technology Choices](#stack)
3. [IBM Granite Configuration](#ibm-granite)
4. [IBM Cloud Lite Setup](#ibm-cloud-lite)
5. [Environment Variables](#environment-variables)
6. [Demo Mode](#demo-mode)
7. [Local Run Instructions](#local-run)
8. [Project Structure](#project-structure)
9. [Agent Workflow](#agent-workflow)
10. [Responsible AI](#responsible-ai)
11. [Submission Materials](#submission-materials)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Student Browser                     │
│  React SPA (Vite, TypeScript)                           │
│  Pages: Landing, Chat, Dashboard, Careers, Roadmap,     │
│         Profile                                         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP /api/*
┌────────────────────▼────────────────────────────────────┐
│              LearnMate Backend (Express / Node)          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              AI Agent State Machine              │   │
│  │  onboarding → career_discovery → career_detail  │   │
│  │  → skill_gap → roadmap → checkin → (loop)       │   │
│  └──────────────┬──────────────────────────────────┘   │
│                 │                                        │
│  ┌──────────────▼──────────────────────────────────┐   │
│  │  Responsible AI Controls                         │   │
│  │  - JSON validation of AI outputs                 │   │
│  │  - No silent state changes                       │   │
│  │  - Revision approval before applying             │   │
│  │  - Demo mode fallback with clear labels          │   │
│  └──────────────┬──────────────────────────────────┘   │
│                 │                                        │
│  ┌──────────────▼────────┐  ┌─────────────────────┐    │
│  │  IBM Granite           │  │  Persistence        │    │
│  │  (watsonx.ai REST API) │  │  (JSON files/demo)  │    │
│  │  - Onboarding Q&A      │  │  Ready for Cloudant │    │
│  │  - Career matching     │  └─────────────────────┘    │
│  │  - Skill gap analysis  │                              │
│  │  - Roadmap generation  │                              │
│  │  - Check-in responses  │                              │
│  └────────────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

**Progress feedback loop:** When a student completes a milestone, the agent runs a check-in, collects feedback, and proposes a roadmap revision. The student must explicitly accept or reject any change before it is applied.

---

## Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | Node.js + Express (TypeScript) | Lightweight, widely understood, minimal dependencies |
| Frontend | React + Vite (TypeScript) | Fast dev experience, strong typing |
| AI | IBM Granite 13B Instruct via watsonx.ai REST API | Specified IBM requirement; no SDK needed |
| Persistence | Local JSON files (demo) / IBM Cloudant (production) | Zero-setup demo; Cloudant is IBM Cloud Lite-compatible |
| Auth | None (demo profile per browser localStorage) | Not required for POC; data model is auth-ready |

---

## IBM Granite Configuration

LearnMate calls IBM Granite through the **watsonx.ai text generation REST API** (`/ml/v1/text/generation`).

### To connect real IBM Granite:

1. **Create an IBM Cloud account** (Lite tier is sufficient for POC)
2. **Provision watsonx.ai** in your region (e.g. us-south)
3. **Create a project** in watsonx.ai and note the Project ID
4. **Generate an IBM Cloud API key** (IAM → API keys)
5. Copy `learnmate/backend/.env.example` → `learnmate/backend/.env`
6. Fill in:

```env
IBM_CLOUD_API_KEY=your_api_key_here
IBM_WATSONX_PROJECT_ID=your_project_id_here
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_GRANITE_MODEL_ID=ibm/granite-13b-instruct-v2
```

The backend authenticates via IBM IAM token exchange (no SDK required), caches the IAM token, and calls the Granite generation endpoint directly.

### Granite model used

`ibm/granite-13b-instruct-v2` — IBM's instruction-following model, suitable for conversational agents, structured JSON generation, and text summarization.

### What Granite is used for

| Feature | Granite task |
|---|---|
| Onboarding | Conversational follow-up questions based on student profile |
| Career matching | JSON selection + fit reason from career catalog |
| Skill gap | JSON analysis of profile vs. career requirements |
| Roadmap generation | JSON structured learning plan |
| Check-in response | Conversational adaptation and revision proposal |

---

## IBM Cloud Lite Setup

LearnMate is designed to run on **IBM Cloud Lite** (free tier):

| Service | IBM Cloud Lite option |
|---|---|
| watsonx.ai | Available on Lite plan (capacity units) |
| Backend hosting | IBM Code Engine (free tier: 50 vCPU hours/month) |
| Persistence | IBM Cloudant (Lite: 1GB, 20 r/s) |

### To deploy backend to IBM Code Engine:

```bash
ibmcloud ce application create \
  --name learnmate-backend \
  --image icr.io/your-namespace/learnmate-backend \
  --env IBM_CLOUD_API_KEY=... \
  --env IBM_WATSONX_PROJECT_ID=... \
  --port 3001
```

### To switch from JSON files to IBM Cloudant:

Replace `learnmate/backend/src/persistence.ts` with a Cloudant implementation using the `@ibm-cloud/cloudant` Node.js SDK. The interface (`saveSession`, `loadSession`, `deleteSession`) is unchanged.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IBM_CLOUD_API_KEY` | For live mode | IBM Cloud API key with watsonx.ai access |
| `IBM_WATSONX_PROJECT_ID` | For live mode | watsonx.ai project ID |
| `IBM_WATSONX_URL` | Optional | watsonx.ai endpoint (default: us-south) |
| `IBM_GRANITE_MODEL_ID` | Optional | Granite model ID (default: granite-13b-instruct-v2) |
| `PORT` | Optional | Backend port (default: 3001) |
| `DEMO_MODE` | Optional | Force demo mode even with credentials (default: auto) |
| `NODE_ENV` | Optional | `development` or `production` |

---

## Demo Mode

LearnMate **automatically runs in demo mode** when `IBM_CLOUD_API_KEY` or `IBM_WATSONX_PROJECT_ID` are absent.

In demo mode:
- All AI responses use pre-written sample data from `src/demoResponses.ts`
- A visible **"⚠ Demo Mode"** banner appears in the navbar and chat
- The agent workflow, state machine, UI, and persistence all function normally
- **Demo mode is clearly labeled throughout the app and is not represented as a live IBM integration**

To force demo mode (useful for presentations without credentials):
```env
DEMO_MODE=true
```

---

## Local Run Instructions

### Prerequisites

- Node.js 18+ and npm
- (Optional) IBM Cloud credentials for live Granite mode

### 1. Install backend dependencies

```bash
cd learnmate/backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — leave IBM fields empty to run in demo mode
```

### 3. Start the backend

```bash
npm run dev
# Runs on http://localhost:3001
# Shows: ⚠️ DEMO (IBM Granite not connected) or ✅ LIVE (IBM Granite connected)
```

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 5. Start the frontend

```bash
npm run dev
# Runs on http://localhost:5173
# Proxies /api/* to backend automatically
```

### 6. Open the app

Navigate to **http://localhost:5173** and click "Start my journey".

### Type checking (CI)

```bash
# Backend
cd learnmate/backend && npm run typecheck

# Frontend
cd learnmate/frontend && npm run typecheck
```

---

## Project Structure

```
learnmate/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express app entry point
│   │   ├── routes.ts         # All API routes
│   │   ├── agent.ts          # AI agent state machine
│   │   ├── granite.ts        # IBM Granite / watsonx.ai integration
│   │   ├── prompts.ts        # Granite prompt templates
│   │   ├── demoResponses.ts  # Demo mode responses (no Granite)
│   │   ├── careerCatalog.ts  # 10-career diverse catalog
│   │   ├── persistence.ts    # JSON file persistence (Cloudant-ready)
│   │   └── types.ts          # Shared TypeScript types
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Router and layout
│   │   ├── main.tsx          # React entry point
│   │   ├── index.css         # Global styles
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── CareerCard.tsx
│   │   │   └── RoadmapStepCard.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CareerExplore.tsx
│   │   │   ├── RoadmapPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── hooks/
│   │   │   └── useSession.tsx  # Session context + API calls
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── api.ts          # Backend API client
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── data/                       # Session JSON files (auto-created)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRESENTATION_OUTLINE.md
│   └── DEMO_SCRIPT.md
└── README.md
```

---

## Agent Workflow

The agent is implemented as an **explicit state machine** in `agent.ts`:

```
onboarding ──→ career_discovery ──→ career_detail
                                         │
                                      skill_gap
                                         │
                                       roadmap ←──┐
                                         │         │
                                       checkin ────┘
                                    (propose revision)
                                    (student approves/rejects)
```

Each state has a dedicated handler function. State transitions are explicit. The agent **never silently changes major decisions** — roadmap revisions are proposed and require student approval.

---

## Responsible AI

| Principle | Implementation |
|---|---|
| Student decides | Agent advises; all career and roadmap decisions require student action |
| Explained recommendations | Every career match includes a `fitReason` explaining why it fits |
| No stereotyping | Career matching uses interests, skills, and goals only — no demographic inference |
| Minimal data collection | Only profile fields needed for personalization are stored |
| Editable profile | Full profile editing on the Profile page |
| No invented resources | Resources are topic areas and search phrases, not specific URLs or certifications |
| No false promises | UI includes responsible AI disclaimers throughout |
| Transparent AI mode | Demo vs. live mode is always clearly labeled |

---

## Submission Materials

- `docs/ARCHITECTURE.md` — Architecture diagram (text + Mermaid)
- `docs/PRESENTATION_OUTLINE.md` — Slide-by-slide PowerPoint outline
- `docs/DEMO_SCRIPT.md` — Full demo walkthrough script
