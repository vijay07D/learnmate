# LearnMate — AI Career Guidance Agent

> An AI agent that helps students discover career paths and build personalized learning roadmaps.
> Built with IBM watsonx.ai · Node.js · React · TypeScript

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/vijay07D/learnmate)

---

## 🚀 Quickstart for Evaluators

> **No IBM account needed to evaluate.** The app runs in Demo Mode automatically — all features work with sample AI responses clearly labeled as demo data.

### Option A — Run locally (5 minutes)

**Requirements:** Node.js 18+ installed ([nodejs.org](https://nodejs.org))

```bash
# 1. Clone the repo
git clone https://github.com/vijay07D/learnmate.git
cd learnmate

# 2. Install dependencies
npm install --prefix backend
npm install --prefix frontend

# 3. Copy environment file (leave IBM fields blank = demo mode)
cp backend/.env.example backend/.env

# 4. Build and start (single port, no config needed)
npm run build
npm start --prefix backend
```

Open **http://localhost:3001** — the full app runs on one port.

> On Windows PowerShell, prefix every npm command with:
> `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force`

---

### Option B — Deploy to Heroku (one click)

Click the **Deploy to Heroku** button above. Add your IBM credentials in the form (or leave blank for demo mode). Heroku builds and deploys automatically.

---

## ✨ What the app does

LearnMate is a **conversational AI agent** (not a form or quiz) that guides students through a 7-step journey:

| Step | What happens |
|---|---|
| 1 | Chat asks about your **interests and hobbies** |
| 2 | Chat asks about your **skills and strengths** |
| 3 | Shows **broad career options** across 9 fields including non-obvious paths |
| 4 | Asks for your **course and year of study** |
| 5 | **Filters and re-explains** careers for your education background |
| 6 | Asks which career interests you and what your **goals** are |
| 7 | Generates a **personalized learning roadmap** with skills, resources, projects and milestones |
| Ongoing | **Progress check-ins** — proposes roadmap adjustments, you approve or reject |

---

## 🤖 IBM watsonx.ai Integration

LearnMate calls IBM watsonx.ai directly via REST API (no SDK) using the `meta-llama/llama-3-3-70b-instruct` model available on the IBM Cloud Lite plan.

| Feature | What the AI does |
|---|---|
| Onboarding | Generates follow-up questions based on student answers |
| Career matching | Selects careers from catalog + writes personalized fit reasons |
| Education filtering | Re-explains careers based on program and year of study |
| Skill gap analysis | Compares student profile to career requirements |
| Roadmap generation | Creates sequenced learning plan in JSON |
| Check-in responses | Adapts and proposes roadmap changes conversationally |

### Connect real IBM watsonx.ai

1. Create a free IBM Cloud account at [cloud.ibm.com](https://cloud.ibm.com)
2. Provision **watsonx.ai** → create a project → note your Project ID
3. Associate **Watson AI Runtime** with the project (Manage → Services & integrations)
4. Generate an API key (IAM → API keys)
5. Edit `backend/.env`:

```env
IBM_CLOUD_API_KEY=your_api_key_here
IBM_WATSONX_PROJECT_ID=your_project_id_here
IBM_WATSONX_URL=https://au-syd.ml.cloud.ibm.com
IBM_GRANITE_MODEL_ID=meta-llama/llama-3-3-70b-instruct
```

Restart the server — it switches from ⚠️ DEMO to ✅ LIVE automatically.

---

## 🖥 Running in development (two terminals, hot-reload)

```bash
# From the learnmate/ root — starts both servers together
npm run dev
```

- Frontend (React + Vite): **http://localhost:5173**
- Backend API: http://localhost:3001

---

## 📁 Project structure

```
learnmate/
├── backend/
│   └── src/
│       ├── agent.ts          # 7-step AI agent state machine
│       ├── granite.ts        # IBM watsonx.ai REST API integration
│       ├── prompts.ts        # Prompt templates
│       ├── demoResponses.ts  # Demo mode fallback responses
│       ├── careerCatalog.ts  # 16-career diverse catalog (9 fields)
│       ├── routes.ts         # Express API routes
│       ├── persistence.ts    # JSON file session storage
│       └── types.ts          # Shared TypeScript types
├── frontend/
│   └── src/
│       ├── pages/            # Landing, Chat, Dashboard, Careers, Roadmap, Profile
│       ├── components/       # ChatMessage, CareerCard, RoadmapStepCard, Navbar
│       ├── hooks/            # useSession (session context + API calls)
│       └── utils/api.ts      # Backend API client
├── app.json                  # Heroku deployment manifest
├── Procfile                  # Heroku process definition
└── docs/ARCHITECTURE.md      # Detailed architecture notes
```

---

## 🛡 Responsible AI

- Every career recommendation includes a clear **reason based on your profile**
- The agent **never silently changes your roadmap** — all revisions require your approval
- No demographic inference — matching uses only interests, skills, and goals
- Resources are described as **topic areas and search phrases**, not invented URLs
- LearnMate **does not promise** employment, income, or admission to any program
- Demo vs. live AI mode is always **clearly labeled** in the UI

---

## ⚙️ Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `IBM_CLOUD_API_KEY` | Live mode only | — | IBM Cloud API key |
| `IBM_WATSONX_PROJECT_ID` | Live mode only | — | watsonx.ai project ID |
| `IBM_WATSONX_URL` | No | `https://au-syd.ml.cloud.ibm.com` | Regional endpoint |
| `IBM_GRANITE_MODEL_ID` | No | `meta-llama/llama-3-3-70b-instruct` | Model ID |
| `NODE_ENV` | No | `development` | Set to `production` for single-port mode |
| `PORT` | No | `3001` | Server port |
| `DEMO_MODE` | No | auto | Force demo mode (`true`) |

---

## 🔧 Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js 18 + Express 4 + TypeScript |
| Frontend | React 18 + Vite 5 + TypeScript |
| AI | IBM watsonx.ai REST API (direct HTTPS, no SDK) |
| Agent | Hand-written state machine (no LangChain / LangFlow) |
| Persistence | JSON files (local) — interface is Cloudant-ready |
| Deployment | Single Express server serves built React app |
