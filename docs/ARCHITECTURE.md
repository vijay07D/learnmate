# LearnMate — Architecture Diagram

## System Architecture

```mermaid
flowchart TB
    Student["🎓 Student\n(Browser)"]

    subgraph Frontend["Frontend — React / Vite (TypeScript)"]
        Landing["Landing Page"]
        Chat["Chat / Onboarding"]
        Dashboard["Dashboard"]
        Careers["Career Explorer"]
        Roadmap["Roadmap Page"]
        Profile["Profile & Preferences"]
    end

    subgraph Backend["Backend — Express / Node.js (TypeScript)"]
        Routes["REST API Routes\n/api/*"]

        subgraph Agent["AI Agent State Machine"]
            S1["onboarding"]
            S2["career_discovery"]
            S3["career_detail"]
            S4["skill_gap"]
            S5["roadmap"]
            S6["checkin"]
            S1 --> S2 --> S3 --> S4 --> S5 --> S6
            S6 -->|"propose revision\n(student approves)"| S5
        end

        subgraph RAI["Responsible AI Controls"]
            V1["JSON output validation"]
            V2["No silent state changes"]
            V3["Revision approval gate"]
            V4["Demo mode labeling"]
            V5["Profile-only inference\n(no demographics)"]
        end

        Prompts["Prompt Templates\n(onboarding / matching /\nskill-gap / roadmap / checkin)"]
        Catalog["Career Catalog\n(10 diverse careers\nacross 7 fields)"]
    end

    subgraph IBM["IBM Cloud"]
        Granite["IBM Granite 13B Instruct\n(watsonx.ai REST API)"]
        IAM["IBM IAM\n(token exchange)"]
        Cloudant["IBM Cloudant\n(Lite — production path)"]
    end

    subgraph Persist["Persistence"]
        JSON["Local JSON files\n(demo mode)"]
    end

    Student <-->|"HTTP + JSON"| Frontend
    Frontend <-->|"HTTP /api/*\n(proxied)"| Routes
    Routes <--> Agent
    Agent <--> RAI
    Agent --> Prompts
    Agent --> Catalog
    Prompts -->|"REST POST\n/ml/v1/text/generation"| Granite
    Granite -->|"generated_text"| Prompts
    Routes --> IAM
    IAM --> Granite
    Routes <-->|"read/write sessions"| JSON
    Routes -.->|"production swap-in"| Cloudant

    style IBM fill:#0530ad,color:#fff
    style Agent fill:#eff6ff
    style RAI fill:#f0fdf4
    style Frontend fill:#fafafa
    style Backend fill:#f7f8fa
```

## Progress Feedback Loop

```mermaid
sequenceDiagram
    participant S as Student
    participant UI as LearnMate UI
    participant A as Agent (backend)
    participant G as IBM Granite

    S->>UI: Complete milestone
    UI->>A: POST /complete-milestone
    A->>UI: agentState = "checkin"
    UI->>S: "What did you learn? What was challenging?"
    S->>UI: Feedback text
    UI->>A: POST /message (feedback)
    A->>G: buildCheckinPrompt(milestone, feedback, roadmap)
    G->>A: Proposed adaptation text + suggestion
    A->>UI: pendingRoadmapRevision + revisionReason
    UI->>S: "Here's a proposed revision — Accept / Reject?"
    S->>UI: Accept
    UI->>A: POST /revision-response {accept: true}
    A->>A: Apply revision, preserve completed steps
    A->>UI: Updated roadmap
    UI->>S: "Roadmap updated ✓"
```

## Data Model

```
StudentSession {
  id, createdAt, updatedAt
  agentState: AgentState         ← explicit workflow position
  profile: StudentProfile        ← interests, skills, goals, etc.
  conversation: Message[]        ← full history
  onboardingStep: number
  savedCareers: Career[]
  dismissedCareerIds: string[]
  selectedCareerId: string|null
  skillGap: SkillGap|null        ← existing vs. to-learn
  roadmap: Roadmap|null          ← current roadmap
  pendingRoadmapRevision: Roadmap|null  ← proposed, not yet applied
  revisionReason: string|null
}
```

## Responsible AI in the Architecture

| Layer | Control |
|---|---|
| **Prompt layer** | Prompts instruct Granite not to invent URLs/certifications; to explain reasoning; to state uncertainty |
| **Validation layer** | `extractJSON()` validates all structured Granite outputs before use; falls back to demo data on parse failure |
| **State machine** | No silent major decision changes; revision proposals require explicit student approval before `session.roadmap` is updated |
| **UI layer** | Every career card shows `fitReason`; demo mode banner always visible; responsible AI notices on roadmap and career pages |
| **Data layer** | Only profile fields needed for personalization are stored; no authentication data beyond session ID |
