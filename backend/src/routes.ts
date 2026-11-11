// LearnMate Express API routes

import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import {
  createNewSession,
  processAgentTurn,
  selectCareerAction,
  completeMilestoneAction,
  updateStepNotesAction,
  saveCareerAction,
  dismissCareerAction,
  updateWeeklyHoursAction,
} from "./agent";
import { loadSession, saveSession } from "./persistence";
import { isDemoMode } from "./granite";
import { CAREER_CATALOG } from "./careerCatalog";

const router = Router();

// ── Health ─────────────────────────────────────────────────────────────────────
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    demoMode: isDemoMode(),
    timestamp: new Date().toISOString(),
  });
});

// ── Start a new session ────────────────────────────────────────────────────────
router.post("/sessions", async (_req: Request, res: Response) => {
  try {
    const session = createNewSession();
    const welcomeMessage =
      "Hi there! I'm **LearnMate** 👋 — your personal career discovery guide.\n\n" +
      "I'm going to ask you a few questions to understand your interests, skills, and goals. " +
      "Then I'll suggest career paths across different fields — including options you might not have heard of — " +
      "and help you build a step-by-step learning plan.\n\n" +
      "There are no wrong answers, and you can skip or edit anything at any time.\n\n" +
      "⚠️ *Responsible AI note: I'm here to advise and explore options with you, not to decide your future. " +
      "All career choices remain entirely yours. I don't promise employment, income, or admission to any program.*\n\n" +
      "Let's start! 🌟\n\n" +
      "**What are some activities or topics you genuinely enjoy?** " +
      "This could be anything — hobbies, subjects you study, things you do in your spare time, or problems you like solving. " +
      "(You can list a few, or just say one thing to start.)";

    const welcomeTurn = {
      message: welcomeMessage,
      agentState: session.agentState,
      isDemo: isDemoMode(),
    };

    session.conversation.push({
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date().toISOString(),
    });

    saveSession(session);

    res.json({ sessionId: session.id, agentTurn: welcomeTurn });
  } catch (err) {
    console.error("Start session error:", err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

// ── Get session ────────────────────────────────────────────────────────────────
router.get("/sessions/:id", (req: Request, res: Response) => {
  const session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;
  res.json(session);
});

// ── Send a message ─────────────────────────────────────────────────────────────
router.post(
  "/sessions/:id/message",
  [body("message").trim().isLength({ min: 1, max: 2000 })],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }) as unknown as void;

    const session = loadSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;

    try {
      const { session: updated, turn } = await processAgentTurn(session, req.body.message as string);
      saveSession(updated);
      res.json({ agentTurn: turn, session: updated });
    } catch (err) {
      console.error("Message processing error:", err);
      res.status(500).json({ error: "Agent processing failed" });
    }
  }
);

// ── Select a career (from career card UI — bypasses chat) ─────────────────────
router.post("/sessions/:id/select-career", async (req: Request, res: Response) => {
  const { careerId } = req.body as { careerId: string };
  const session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;

  // Select the career (sets state to skill_gap)
  const { session: withCareer, turn: selectTurn } = selectCareerAction(session, careerId);
  // Immediately run skill gap + roadmap generation
  const { session: withSkillGap, turn: roadmapTurn } = await processAgentTurn(withCareer, `generate roadmap for ${careerId}`);
  saveSession(withSkillGap);
  res.json({ agentTurn: roadmapTurn, session: withSkillGap });
});

// ── Save / dismiss career ──────────────────────────────────────────────────────
router.post("/sessions/:id/save-career", (req: Request, res: Response) => {
  const { careerId } = req.body as { careerId: string };
  let session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;
  session = saveCareerAction(session, careerId);
  saveSession(session);
  res.json({ success: true });
});

router.post("/sessions/:id/dismiss-career", (req: Request, res: Response) => {
  const { careerId } = req.body as { careerId: string };
  let session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;
  session = dismissCareerAction(session, careerId);
  saveSession(session);
  res.json({ success: true });
});

// ── Generate roadmap (explicit trigger) ───────────────────────────────────────
router.post("/sessions/:id/generate-roadmap", async (req: Request, res: Response) => {
  const session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;

  try {
    // Ensure we're in skill_gap state to trigger roadmap generation
    if (session.agentState !== "skill_gap" && session.agentState !== "roadmap") {
      session.agentState = "skill_gap";
    }
    const { session: updated, turn } = await processAgentTurn(session, "generate roadmap");
    saveSession(updated);
    res.json({ agentTurn: turn, session: updated });
  } catch (err) {
    console.error("Roadmap generation error:", err);
    res.status(500).json({ error: "Roadmap generation failed" });
  }
});

// ── Complete a milestone ───────────────────────────────────────────────────────
router.post("/sessions/:id/complete-milestone", (req: Request, res: Response) => {
  const { stepId } = req.body as { stepId: string };
  let session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;
  const { session: updated, turn } = completeMilestoneAction(session, stepId);
  saveSession(updated);
  res.json({ agentTurn: turn, session: updated });
});

// ── Update step notes ──────────────────────────────────────────────────────────
router.patch("/sessions/:id/steps/:stepId/notes", (req: Request, res: Response) => {
  const { notes } = req.body as { notes: string };
  let session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;
  session = updateStepNotesAction(session, req.params.stepId, notes ?? "");
  saveSession(session);
  res.json({ success: true });
});

// ── Update weekly study hours ──────────────────────────────────────────────────
router.patch("/sessions/:id/weekly-hours", (req: Request, res: Response) => {
  const { hours } = req.body as { hours: number };
  let session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;
  const { session: updated, turn } = updateWeeklyHoursAction(session, hours);
  saveSession(updated);
  res.json({ agentTurn: turn, session: updated });
});

// ── Accept / reject pending roadmap revision ──────────────────────────────────
router.post("/sessions/:id/revision-response", async (req: Request, res: Response) => {
  const { accept } = req.body as { accept: boolean };
  let session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;

  const message = accept ? "accept the revision" : "reject the revision keep my roadmap";
  const { session: updated, turn } = await processAgentTurn(session, message);
  saveSession(updated);
  res.json({ agentTurn: turn, session: updated });
});

// ── Get career catalog ─────────────────────────────────────────────────────────
router.get("/careers", (_req: Request, res: Response) => {
  res.json(CAREER_CATALOG);
});

router.get("/careers/:id", (req: Request, res: Response) => {
  const career = CAREER_CATALOG.find((c) => c.id === req.params.id);
  if (!career) return res.status(404).json({ error: "Career not found" }) as unknown as void;
  res.json(career);
});

// ── Update profile ─────────────────────────────────────────────────────────────
router.patch("/sessions/:id/profile", (req: Request, res: Response) => {
  let session = loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" }) as unknown as void;
  const allowed = [
    "interests", "skills", "subjects", "education", "educationProgram",
    "yearOfStudy", "experience", "priorities", "goals", "preferredCareers",
    "learningFormat", "weeklyStudyHours",
  ];
  for (const key of allowed) {
    if (key in req.body && req.body[key] !== undefined) {
      (session.profile as unknown as Record<string, unknown>)[key] = req.body[key];
    }
  }
  saveSession(session);
  res.json({ profile: session.profile });
});

export default router;
