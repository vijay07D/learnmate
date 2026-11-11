// LearnMate AI Agent — core workflow engine
// 7-step student journey:
// 1. onboarding (interests + skills, multi-turn)
// 2. broad_careers (show diverse careers from interests+skills)
// 3. onboarding_education (ask course/program + year)
// 4. filtered_careers (filter by education+year+interests+skills)
// 5. goal_setting (ask which career interests them + career goals)
// 6. skill_gap (compute skill gap for chosen career)
// 7. roadmap (generate personalized learning path)
// 8. checkin (progress check-ins + proposed adaptations with approval)

import { v4 as uuidv4 } from "uuid";
import {
  AgentState,
  AgentTurn,
  Career,
  ConversationMessage,
  Roadmap,
  RoadmapStep,
  StudentProfile,
  StudentSession,
} from "./types";
import { CAREER_CATALOG } from "./careerCatalog";
import { graniteGenerate, extractJSON, isDemoMode } from "./granite";
import {
  buildOnboardingPrompt,
  buildCareerMatchPrompt,
  buildEducationFilterPrompt,
  buildSkillGapPrompt,
  buildRoadmapPrompt,
  buildCheckinPrompt,
} from "./prompts";
import {
  getDemoOnboardingMessage,
  getDemoBroadCareerMatches,
  getDemoEducationQuestion,
  getDemoFilteredCareerMatches,
  getDemoGoalSettingMessage,
  getDemoSkillGap,
  getDemoRoadmap,
  getDemoCheckinResponse,
  getDemoRoadmapRevision,
} from "./demoResponses";

// ── Session factory ────────────────────────────────────────────────────────────
export function createNewSession(): StudentSession {
  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agentState: "onboarding",
    profile: {
      interests: [],
      skills: [],
      subjects: [],
      education: "",
      educationProgram: "",
      yearOfStudy: "",
      experience: [],
      priorities: [],
      goals: "",
      preferredCareers: [],
      learningFormat: "",
      weeklyStudyHours: null,
    },
    conversation: [],
    onboardingStep: 0,
    broadCareerSuggestions: [],
    savedCareers: [],
    dismissedCareerIds: [],
    filteredCareers: [],
    selectedCareerId: null,
    skillGap: null,
    roadmap: null,
    pendingRoadmapRevision: null,
    revisionReason: null,
  };
}

// ── Profile extractor from student message ─────────────────────────────────────
// onboardingStep 0 = interests, 1 = skills/strengths, 2 = subjects
// onboardingStep 3+ = handled in onboarding_education or goal_setting
function updateProfileFromOnboarding(profile: StudentProfile, message: string, step: number): StudentProfile {
  const updated = { ...profile };
  const lower = message.toLowerCase();
  const words = message.split(/[\s,;]+/).filter((w) => w.length > 2);

  switch (step) {
    case 0: // interests
      updated.interests = [...updated.interests, ...words.slice(0, 8)].slice(0, 15);
      break;
    case 1: // skills/strengths
      updated.skills = [...updated.skills, ...words.slice(0, 8)].slice(0, 15);
      break;
    case 2: // subjects
      updated.subjects = [...updated.subjects, ...words.slice(0, 6)].slice(0, 10);
      break;
    case 3: // experience / extra context — don't overwrite earlier fields
      if (words.length > 0) {
        updated.experience = [...updated.experience, message.slice(0, 200)].slice(0, 5);
      }
      break;
    default: // extra info if student keeps adding
      updated.interests = [...updated.interests, ...words.slice(0, 4)].slice(0, 15);
      break;
  }

  // Pull study hours opportunistically from any message
  const hoursMatch = message.match(/(\d+)\s*(?:hours?|hrs?)/i);
  if (hoursMatch && !updated.weeklyStudyHours) {
    updated.weeklyStudyHours = parseInt(hoursMatch[1], 10);
  } else if (lower.includes("little time") || lower.includes("not much time")) {
    if (!updated.weeklyStudyHours) updated.weeklyStudyHours = 3;
  }

  return updated;
}

function updateProfileFromEducation(profile: StudentProfile, message: string): StudentProfile {
  const updated = { ...profile };
  updated.education = message.slice(0, 300);

  // Try to extract program and year
  const yearPatterns = [
    /\b(first|second|third|fourth|1st|2nd|3rd|4th)\s*year\b/i,
    /\byear\s*(\d)\b/i,
    /\b(final year|last year)\b/i,
    /\bpostgrad(?:uate)?\b/i,
    /\bmaster'?s?\b/i,
    /\bphd\b/i,
  ];
  for (const p of yearPatterns) {
    const m = message.match(p);
    if (m) {
      updated.yearOfStudy = m[0];
      break;
    }
  }

  // Try to extract program keywords
  const programKeywords = [
    "computer science", "software engineering", "information technology",
    "business", "accounting", "finance", "economics",
    "nursing", "medicine", "health informatics", "pharmacy",
    "biology", "chemistry", "physics", "mathematics",
    "psychology", "sociology", "political science", "law",
    "engineering", "electrical", "mechanical", "civil",
    "communications", "marketing", "journalism",
    "education", "environmental", "sustainability",
    "game design", "interactive media", "graphic design",
  ];
  for (const kw of programKeywords) {
    if (message.toLowerCase().includes(kw)) {
      updated.educationProgram = kw;
      break;
    }
  }
  if (!updated.educationProgram) {
    // Fallback: use the education string itself
    updated.educationProgram = message.slice(0, 100);
  }

  return updated;
}

function formatConversation(messages: ConversationMessage[]): string {
  return messages
    .slice(-10)
    .map((m) => `${m.role === "assistant" ? "LearnMate" : "Student"}: ${m.content}`)
    .join("\n");
}

// ── Catalog filter helpers ─────────────────────────────────────────────────────
function filterCareersByEducation(careers: Career[], profile: StudentProfile): Career[] {
  const program = (profile.educationProgram || profile.education || "").toLowerCase();
  const year = (profile.yearOfStudy || "").toLowerCase();

  return careers.filter((career) => {
    const progMatch =
      career.relevantPrograms.includes("any") ||
      career.relevantPrograms.some((rp) => program.includes(rp) || rp.includes(program.slice(0, 6)));
    const yearMatch =
      career.relevantYears.includes("any") ||
      career.relevantYears.some((ry) => year.includes(ry.toLowerCase()));
    return progMatch || yearMatch;
  });
}

// ── Main agent turn ────────────────────────────────────────────────────────────
export async function processAgentTurn(
  session: StudentSession,
  userMessage: string
): Promise<{ session: StudentSession; turn: AgentTurn }> {
  // Append user message to conversation
  session.conversation.push({
    role: "student",
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  let turn: AgentTurn;

  switch (session.agentState) {
    case "onboarding":
      turn = await handleOnboarding(session, userMessage);
      break;
    case "broad_careers":
      turn = await handleBroadCareers(session, userMessage);
      break;
    case "onboarding_education":
      turn = await handleOnboardingEducation(session, userMessage);
      break;
    case "filtered_careers":
      turn = await handleFilteredCareers(session, userMessage);
      break;
    case "goal_setting":
      turn = await handleGoalSetting(session, userMessage);
      break;
    case "skill_gap":
      turn = await handleSkillGap(session, userMessage);
      break;
    case "roadmap":
      turn = await handleRoadmap(session, userMessage);
      break;
    case "checkin":
      turn = await handleCheckin(session, userMessage);
      break;
    default:
      turn = {
        message:
          "Your journey looks complete! You can review your roadmap, explore more careers, or start a new journey from the menu.",
        agentState: "complete",
        isDemo: isDemoMode(),
      };
  }

  // Append agent message to conversation
  session.conversation.push({
    role: "assistant",
    content: turn.message,
    timestamp: new Date().toISOString(),
  });

  // Update session state
  session.agentState = turn.agentState;

  if (turn.careers) {
    if (turn.careerStage === "broad") {
      // Store as broad suggestions AND add to savedCareers
      session.broadCareerSuggestions = turn.careers;
      for (const c of turn.careers) {
        if (!session.savedCareers.find((s) => s.id === c.id) && !session.dismissedCareerIds.includes(c.id)) {
          session.savedCareers.push(c);
        }
      }
    } else if (turn.careerStage === "filtered") {
      session.filteredCareers = turn.careers;
      // Also add new careers to savedCareers
      for (const c of turn.careers) {
        if (!session.savedCareers.find((s) => s.id === c.id) && !session.dismissedCareerIds.includes(c.id)) {
          session.savedCareers.push(c);
        }
      }
    } else {
      // Generic career list — add to saved
      for (const c of turn.careers) {
        if (!session.savedCareers.find((s) => s.id === c.id) && !session.dismissedCareerIds.includes(c.id)) {
          session.savedCareers.push(c);
        }
      }
    }
  }

  if (turn.skillGap) session.skillGap = turn.skillGap;
  if (turn.roadmap) session.roadmap = turn.roadmap;
  if (turn.pendingRevision) {
    session.pendingRoadmapRevision = turn.pendingRevision;
    session.revisionReason = turn.revisionReason ?? null;
  }
  if (turn.profileSnapshot) session.profile = turn.profileSnapshot;

  return { session, turn };
}

// ── Step 1–2: Onboarding (interests, skills, strengths) ──────────────────────
// The agent asks 3–4 natural questions; after step 2+ it moves to broad_careers.
async function handleOnboarding(session: StudentSession, userMessage: string): Promise<AgentTurn> {
  session.profile = updateProfileFromOnboarding(session.profile, userMessage, session.onboardingStep);
  session.onboardingStep++;

  // After 3 exchanges covering interests + skills (steps 0,1,2), move to broad careers
  const readyForCareers = session.onboardingStep >= 3;

  if (isDemoMode()) {
    if (readyForCareers) {
      // Transition message before showing broad careers
      return {
        message:
          "Thanks! I now have a good sense of your interests and strengths.\n\n" +
          "Let me show you a **broad range of career possibilities** across different fields — " +
          "including options you might not have considered yet. These span technology, design, " +
          "health, sustainability, business, and more.\n\n" +
          "Take your time exploring them. You can save any that catch your eye.",
        agentState: "broad_careers",
        isDemo: true,
        profileSnapshot: session.profile,
      };
    }
    return getDemoOnboardingMessage(session.onboardingStep, session.profile);
  }

  // Granite path
  try {
    const conversationStr = formatConversation(session.conversation.slice(0, -1));
    const prompt = buildOnboardingPrompt(conversationStr, userMessage, session.profile, session.onboardingStep);
    const raw = await graniteGenerate({ prompt, maxNewTokens: 300, stopSequences: ["<END>"] });
    const cleaned = raw.replace(/<END>/g, "").trim();

    if (readyForCareers) {
      return {
        message:
          (cleaned || "Thanks for sharing!") +
          "\n\nI have enough to show you a broad range of career possibilities. Let me find directions that could suit you.",
        agentState: "broad_careers",
        isDemo: false,
        profileSnapshot: session.profile,
      };
    }

    return {
      message: cleaned || "Thanks! Can you tell me a bit more about your strengths?",
      agentState: "onboarding",
      isDemo: false,
      profileSnapshot: session.profile,
    };
  } catch (err) {
    console.error("Granite onboarding error, falling back to demo:", err);
    if (readyForCareers) {
      return {
        message:
          "Thanks for sharing that! Let me now show you a broad range of careers that could suit your profile.",
        agentState: "broad_careers",
        isDemo: true,
        profileSnapshot: session.profile,
      };
    }
    return getDemoOnboardingMessage(session.onboardingStep, session.profile);
  }
}

// ── Step 3: Broad career discovery ───────────────────────────────────────────
// Called after onboarding completes; also called if student sends a message here
async function handleBroadCareers(session: StudentSession, _userMessage: string): Promise<AgentTurn> {
  // If careers already shown, student may be commenting — ask about education
  if (session.broadCareerSuggestions.length > 0) {
    return getDemoEducationQuestion(session.profile);
  }

  // Generate broad career matches
  if (isDemoMode()) {
    const turn = getDemoBroadCareerMatches(session.profile);
    return turn;
  }

  try {
    const prompt = buildCareerMatchPrompt(session.profile, CAREER_CATALOG);
    const raw = await graniteGenerate({ prompt, maxNewTokens: 900 });
    const parsed = extractJSON<Array<{ id: string; fitReason: string }>>(raw);

    if (!parsed || !Array.isArray(parsed)) throw new Error("Invalid career match JSON");

    const careers: Career[] = [];
    for (const match of parsed) {
      const base = CAREER_CATALOG.find((c) => c.id === match.id);
      if (base) careers.push({ ...base, fitReason: match.fitReason });
    }

    if (careers.length === 0) throw new Error("No valid careers matched");

    return {
      message:
        `Based on your interests and skills, here are **${careers.length} career directions** worth exploring — ` +
        `spanning multiple fields.\n\n` +
        `These are starting points for exploration, not a prediction of your future. ` +
        `Save any that interest you, dismiss ones that don't fit. You can ask me about any of them.`,
      agentState: "broad_careers",
      careers,
      careerStage: "broad",
      isDemo: false,
    };
  } catch (err) {
    console.error("Granite broad career error, falling back to demo:", err);
    return getDemoBroadCareerMatches(session.profile);
  }
}

// ── Step 4: Onboarding education ──────────────────────────────────────────────
async function handleOnboardingEducation(session: StudentSession, userMessage: string): Promise<AgentTurn> {
  // Student answered the education question — extract and move to filtered careers
  session.profile = updateProfileFromEducation(session.profile, userMessage);

  return {
    message:
      `Got it — **${session.profile.education.slice(0, 80)}**. ` +
      `Now let me refine those career suggestions based on your program and year of study.\n\n` +
      `This doesn't limit your options permanently — it just helps me explain which careers have a clearer path from where you are now.`,
    agentState: "filtered_careers",
    isDemo: isDemoMode(),
    profileSnapshot: session.profile,
  };
}

// ── Step 5: Filtered career discovery ────────────────────────────────────────
async function handleFilteredCareers(session: StudentSession, _userMessage: string): Promise<AgentTurn> {
  // If filtered careers already shown, move to goal setting
  if (session.filteredCareers.length > 0) {
    return getDemoGoalSettingMessage(session.profile, session.filteredCareers);
  }

  const candidateCareers = session.broadCareerSuggestions.length > 0
    ? session.broadCareerSuggestions
    : CAREER_CATALOG.slice(0, 8).map((c) => ({ ...c, fitReason: "" }));

  const filtered = filterCareersByEducation(candidateCareers, session.profile);
  const toShow = filtered.length >= 3 ? filtered : candidateCareers.slice(0, 5);

  if (isDemoMode()) {
    return getDemoFilteredCareerMatches(session.profile, toShow);
  }

  try {
    const prompt = buildEducationFilterPrompt(session.profile, toShow);
    const raw = await graniteGenerate({ prompt, maxNewTokens: 900 });
    const parsed = extractJSON<Array<{ id: string; fitReason: string }>>(raw);

    if (!parsed || !Array.isArray(parsed)) throw new Error("Invalid filtered career JSON");

    const careers: Career[] = [];
    for (const match of parsed) {
      const base = toShow.find((c) => c.id === match.id) ?? CAREER_CATALOG.find((c) => c.id === match.id);
      if (base) careers.push({ ...base, fitReason: match.fitReason });
    }

    if (careers.length === 0) throw new Error("No careers after filter");

    return {
      message:
        `Based on your **${session.profile.education}**, here are the career directions that align most closely with your path. ` +
        `I've explained why each one fits where you are now.\n\n` +
        `Which of these sound most interesting to you? Or is there a direction you'd like to learn more about?`,
      agentState: "filtered_careers",
      careers,
      careerStage: "filtered",
      isDemo: false,
    };
  } catch (err) {
    console.error("Granite filtered career error, falling back to demo:", err);
    return getDemoFilteredCareerMatches(session.profile, toShow);
  }
}

// ── Step 6: Goal setting ──────────────────────────────────────────────────────
async function handleGoalSetting(session: StudentSession, userMessage: string): Promise<AgentTurn> {
  // Extract career interest and goals from the student's message
  const lower = userMessage.toLowerCase();

  // Try to identify a career from the message
  const mentionedCareer = CAREER_CATALOG.find(
    (c) =>
      lower.includes(c.id.replace(/-/g, " ")) ||
      lower.includes(c.title.toLowerCase()) ||
      lower.includes(c.title.toLowerCase().split(" ")[0])
  );

  if (mentionedCareer) {
    session.selectedCareerId = mentionedCareer.id;
    session.profile.preferredCareers = [mentionedCareer.id];
  }

  // Extract goals from the message
  if (userMessage.length > 20) {
    session.profile.goals = userMessage.slice(0, 400);
  }

  // If we have a career picked and enough context, move to skill gap
  if (session.selectedCareerId && session.profile.goals) {
    const career = CAREER_CATALOG.find((c) => c.id === session.selectedCareerId)!;
    return {
      message:
        `Great choice! Let me now assess your current skills against what a **${career.title}** typically needs, ` +
        `so we can build your roadmap around your actual gaps — not what you already know.`,
      agentState: "skill_gap",
      isDemo: isDemoMode(),
      profileSnapshot: session.profile,
    };
  }

  // Ask for clarification about which career and goals
  const careerTitles = (session.filteredCareers.length > 0 ? session.filteredCareers : session.broadCareerSuggestions)
    .slice(0, 5)
    .map((c) => c.title)
    .join(", ");

  return {
    message:
      `To build your personalized learning path, I need to know a bit more:\n\n` +
      `1. **Which career direction interests you most?** ` +
      (careerTitles ? `(You can choose from: ${careerTitles})` : "") + `\n` +
      `2. **What are your career goals?** For example: "Work in healthcare technology," "Start my own business," or "Land my first tech job."\n\n` +
      `Take your time — there's no wrong answer here.`,
    agentState: "goal_setting",
    isDemo: isDemoMode(),
  };
}

// ── Step 6b: Skill gap ────────────────────────────────────────────────────────
async function handleSkillGap(session: StudentSession, _userMessage: string): Promise<AgentTurn> {
  const career = CAREER_CATALOG.find((c) => c.id === session.selectedCareerId);
  if (!career) {
    return {
      message: "Please select a career so I can assess your skill gaps.",
      agentState: "goal_setting",
      isDemo: isDemoMode(),
    };
  }

  let skillGap;
  if (isDemoMode()) {
    skillGap = getDemoSkillGap(career, session.profile);
  } else {
    try {
      const prompt = buildSkillGapPrompt(career, session.profile);
      const raw = await graniteGenerate({ prompt, maxNewTokens: 400 });
      const parsed = extractJSON<{ existing: string[]; toLearn: string[] }>(raw);
      skillGap = parsed ?? getDemoSkillGap(career, session.profile);
    } catch {
      skillGap = getDemoSkillGap(career, session.profile);
    }
  }

  const weeklyHours = session.profile.weeklyStudyHours ?? 5;
  let roadmap: Roadmap;

  if (isDemoMode()) {
    roadmap = getDemoRoadmap(career, weeklyHours, skillGap);
  } else {
    try {
      const prompt = buildRoadmapPrompt(career, skillGap, weeklyHours);
      const raw = await graniteGenerate({ prompt, maxNewTokens: 1400 });
      const steps = extractJSON<Array<Omit<RoadmapStep, "id" | "completed" | "notes">>>(raw);

      if (!steps || !Array.isArray(steps)) throw new Error("Invalid roadmap JSON");

      roadmap = {
        careerId: career.id,
        careerTitle: career.title,
        steps: steps.map((s, i) => ({
          ...s,
          id: uuidv4(),
          stage: s.stage ?? i + 1,
          completed: false,
          notes: "",
        })),
        weeklyStudyHours: weeklyHours,
        totalWeeks: steps.reduce((a, s) => a + (s.estimatedWeeks ?? 2), 0),
        lastRevised: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Granite roadmap error, falling back to demo:", err);
      roadmap = getDemoRoadmap(career, weeklyHours, skillGap);
    }
  }

  return {
    message:
      `Here's your personalized **${career.title} learning roadmap**! ✨\n\n` +
      `I've built it around your existing strengths (${skillGap.existing.slice(0, 2).join(", ") || "your current knowledge"}) ` +
      `and the gaps we need to fill.\n\n` +
      `The roadmap has ${roadmap.steps.length} stages. Work through them at your own pace — ` +
      `mark milestones complete as you go, and I'll check in to adapt the plan if needed.\n\n` +
      `⚠️ *Resources are described as topics and search phrases, not verified URLs or specific courses. Always evaluate resources independently.*`,
    agentState: "roadmap",
    skillGap,
    roadmap,
    isDemo: isDemoMode(),
  };
}

// ── Step 7: Roadmap ────────────────────────────────────────────────────────────
async function handleRoadmap(session: StudentSession, userMessage: string): Promise<AgentTurn> {
  const lower = userMessage.toLowerCase();

  // Accept/reject pending revision
  if (session.pendingRoadmapRevision) {
    if (lower.includes("accept") || lower.includes("yes") || lower.includes("approve") || lower.includes("ok")) {
      session.roadmap = session.pendingRoadmapRevision;
      session.pendingRoadmapRevision = null;
      session.revisionReason = null;
      return {
        message: "✅ Roadmap updated! Your completed milestones are preserved. Keep up the great work.",
        agentState: "roadmap",
        roadmap: session.roadmap,
        isDemo: isDemoMode(),
      };
    } else if (lower.includes("reject") || lower.includes("no") || lower.includes("keep")) {
      session.pendingRoadmapRevision = null;
      session.revisionReason = null;
      return {
        message: "No problem — your original roadmap stays as is. Let me know when you've completed another milestone.",
        agentState: "roadmap",
        roadmap: session.roadmap ?? undefined,
        isDemo: isDemoMode(),
      };
    }
  }

  // Student triggered a check-in
  if (lower.includes("complete") || lower.includes("done") || lower.includes("finished") || lower.includes("check in")) {
    return {
      message:
        "That's great progress! 🎉\n\nTell me: **what did you learn from this milestone?** Was anything challenging or particularly interesting? Your feedback helps me keep your roadmap relevant.",
      agentState: "checkin",
      isDemo: isDemoMode(),
    };
  }

  // Default roadmap state response
  return {
    message:
      "You can mark milestones complete using the roadmap below, add notes, or adjust your weekly study hours. " +
      "What would you like to do next?",
    agentState: "roadmap",
    roadmap: session.roadmap ?? undefined,
    isDemo: isDemoMode(),
  };
}

// ── Check-in + adaptation ──────────────────────────────────────────────────────
async function handleCheckin(session: StudentSession, userMessage: string): Promise<AgentTurn> {
  const completedMilestone = session.roadmap?.steps.find((s) => s.completed)?.milestone ?? "milestone";

  if (isDemoMode()) {
    const completedCount = session.roadmap?.steps.filter((s) => s.completed).length ?? 0;
    if (completedCount >= 1 && session.roadmap) {
      return getDemoRoadmapRevision(session.roadmap, "your feedback and progress so far");
    }
    return getDemoCheckinResponse(completedMilestone, userMessage, session.roadmap!);
  }

  try {
    const roadmapSummary = session.roadmap?.steps
      .filter((s) => !s.completed)
      .slice(0, 3)
      .map((s) => `Stage ${s.stage}: ${s.objective}`)
      .join("; ") ?? "No remaining steps";

    const prompt = buildCheckinPrompt(completedMilestone, userMessage, roadmapSummary);
    const raw = await graniteGenerate({ prompt, maxNewTokens: 400, stopSequences: ["<END>"] });
    const cleaned = raw.replace(/<END>/g, "").trim();

    return {
      message: cleaned || "Thanks for the update! Keep going — you're making real progress.",
      agentState: "roadmap",
      isDemo: false,
    };
  } catch (err) {
    console.error("Granite checkin error:", err);
    return getDemoCheckinResponse(completedMilestone, userMessage, session.roadmap!);
  }
}

// ── Explicit action handlers (called from routes, not from chat) ───────────────

export function selectCareerAction(
  session: StudentSession,
  careerId: string
): { session: StudentSession; turn: AgentTurn } {
  const career = CAREER_CATALOG.find((c) => c.id === careerId);
  if (!career) {
    return {
      session,
      turn: {
        message: "Career not found.",
        agentState: session.agentState,
        isDemo: isDemoMode(),
      },
    };
  }
  session.selectedCareerId = careerId;
  session.profile.preferredCareers = [careerId];
  // Move to skill_gap state for roadmap generation
  session.agentState = "skill_gap";
  const turn: AgentTurn = {
    message: `Great choice! Let me assess your skill profile against **${career.title}** and build your roadmap…`,
    agentState: "skill_gap",
    isDemo: isDemoMode(),
  };
  return { session, turn };
}

export function completeMilestoneAction(
  session: StudentSession,
  stepId: string
): { session: StudentSession; turn: AgentTurn } {
  if (!session.roadmap) {
    return {
      session,
      turn: { message: "No active roadmap.", agentState: session.agentState, isDemo: isDemoMode() },
    };
  }
  const step = session.roadmap.steps.find((s) => s.id === stepId);
  if (step) {
    step.completed = true;
    session.agentState = "checkin";
  }
  const turn: AgentTurn = {
    message: `Milestone marked complete! Tell me what you learned — your feedback helps me keep your roadmap relevant.`,
    agentState: "checkin",
    roadmap: session.roadmap,
    isDemo: isDemoMode(),
  };
  return { session, turn };
}

export function updateStepNotesAction(
  session: StudentSession,
  stepId: string,
  notes: string
): StudentSession {
  if (session.roadmap) {
    const step = session.roadmap.steps.find((s) => s.id === stepId);
    if (step) step.notes = notes.slice(0, 500);
  }
  return session;
}

export function saveCareerAction(session: StudentSession, careerId: string): StudentSession {
  const career = CAREER_CATALOG.find((c) => c.id === careerId);
  if (career && !session.savedCareers.find((c) => c.id === careerId)) {
    session.savedCareers.push(career);
  }
  session.dismissedCareerIds = session.dismissedCareerIds.filter((id) => id !== careerId);
  return session;
}

export function dismissCareerAction(session: StudentSession, careerId: string): StudentSession {
  session.savedCareers = session.savedCareers.filter((c) => c.id !== careerId);
  if (!session.dismissedCareerIds.includes(careerId)) {
    session.dismissedCareerIds.push(careerId);
  }
  return session;
}

export function updateWeeklyHoursAction(
  session: StudentSession,
  hours: number
): { session: StudentSession; turn: AgentTurn } {
  session.profile.weeklyStudyHours = Math.max(1, Math.min(40, hours));
  const turn: AgentTurn = {
    message: `Updated! I'll plan your roadmap around ${hours} hours per week.`,
    agentState: session.agentState,
    isDemo: isDemoMode(),
  };
  return { session, turn };
}
