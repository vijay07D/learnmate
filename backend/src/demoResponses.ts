// Demo responses for all agent states when IBM Granite is unavailable.
// These are clearly labeled as demo data throughout the UI.
// ⚠ Demo mode is not representative of a live IBM Granite integration.

import { AgentTurn, Career, Roadmap, SkillGap, StudentProfile } from "./types";
import { CAREER_CATALOG } from "./careerCatalog";
import { v4 as uuidv4 } from "uuid";

// ── Step 1-2: Onboarding ──────────────────────────────────────────────────────
const ONBOARDING_QUESTIONS = [
  "Thanks for sharing! Now let's talk about **skills and strengths** — including things you've picked up outside of class. For example: you might be a good communicator, great with numbers, creative, good at fixing things, or skilled with particular tools or software. What would you say you're genuinely good at?",
  "Great context! What **subjects or areas of study** do you genuinely enjoy or feel confident in? These could be from school, university, or self-directed learning.",
];

export function getDemoOnboardingMessage(step: number, profile: StudentProfile): AgentTurn {
  // step is incremented before calling, so step 1 = after first student message
  const idx = Math.min(step - 1, ONBOARDING_QUESTIONS.length - 1);
  const q = ONBOARDING_QUESTIONS[idx];

  return {
    message: q,
    agentState: "onboarding",
    isDemo: true,
    profileSnapshot: profile,
  };
}

// ── Step 3: Broad career discovery ────────────────────────────────────────────
export function getDemoBroadCareerMatches(profile: StudentProfile): AgentTurn {
  // Pick a diverse selection — spread across fields
  const fields = ["Technology", "Design", "Business", "Health Technology", "Sustainability", "Education", "Digital Media", "Finance", "Public Sector"];
  const selected: Career[] = [];
  const seenFields = new Set<string>();

  for (const career of CAREER_CATALOG) {
    if (selected.length >= 6) break;
    // Try to get one per field for diversity
    if (!seenFields.has(career.field)) {
      selected.push({ ...career, fitReason: buildFitReason(career, profile) });
      seenFields.add(career.field);
    }
  }

  // If we have fewer than 5, add more
  if (selected.length < 5) {
    for (const career of CAREER_CATALOG) {
      if (selected.length >= 6) break;
      if (!selected.find((c) => c.id === career.id)) {
        selected.push({ ...career, fitReason: buildFitReason(career, profile) });
      }
    }
  }

  return {
    message:
      "Based on what you've shared, here are **" +
      selected.length +
      " career directions** across different fields — including some you might not have considered.\n\n" +
      "These are starting points to explore, **not a prediction of your future**. " +
      "Save any that interest you, dismiss ones that don't — there's no pressure to commit.\n\n" +
      "Take your time looking through these. When you're ready, I'll ask about your studies to help filter them further.",
    agentState: "broad_careers",
    careers: selected,
    careerStage: "broad",
    isDemo: true,
  };
}

function buildFitReason(career: Career, profile: StudentProfile): string {
  const interests = profile.interests.slice(0, 2).join(" and ");
  const skills = profile.skills.slice(0, 2).join(" and ");

  if (interests && skills) {
    return `Your interest in ${interests} and your skills in ${skills} align well with what ${career.title}s do day-to-day.`;
  }
  if (interests) {
    return `Your interest in ${interests} connects well with the core work of a ${career.title}.`;
  }
  return `Your profile suggests strengths that ${career.title}s rely on regularly — this could be worth exploring.`;
}

// ── Step 4: Education question ────────────────────────────────────────────────
export function getDemoEducationQuestion(profile: StudentProfile): AgentTurn {
  return {
    message:
      "Those are good options to consider! Before I narrow them down further, " +
      "I'd like to understand your current studies better.\n\n" +
      "**What course or education program are you studying**, and what year or stage are you at? " +
      "(For example: \"BSc Computer Science, Year 2\" or \"Nursing, final year\")\n\n" +
      "This helps me explain which careers align with your academic background — " +
      "but it won't eliminate any options permanently.",
    agentState: "onboarding_education",
    isDemo: true,
    profileSnapshot: profile,
  };
}

// ── Step 5: Filtered career discovery ─────────────────────────────────────────
export function getDemoFilteredCareerMatches(profile: StudentProfile, careers: Career[]): AgentTurn {
  const withReasons = careers.map((c) => ({
    ...c,
    fitReason: buildEducationFitReason(c, profile),
  }));

  return {
    message:
      "Based on your studies, here are the career directions that have the clearest path from where you are now.\n\n" +
      "I've explained why each one fits your background. " +
      "**Which of these sound most interesting to you?** " +
      "You can also tell me if there's a direction from the previous list you'd like to keep exploring.",
    agentState: "filtered_careers",
    careers: withReasons,
    careerStage: "filtered",
    isDemo: true,
    profileSnapshot: profile,
  };
}

function buildEducationFitReason(career: Career, profile: StudentProfile): string {
  const program = profile.educationProgram || profile.education || "your program";
  const year = profile.yearOfStudy ? ` (${profile.yearOfStudy})` : "";

  if (career.relevantPrograms.includes("any")) {
    return `A background in ${program}${year} provides useful transferable skills for ${career.title} — this career is open to graduates from many disciplines.`;
  }

  const matching = career.relevantPrograms.filter((rp) =>
    (profile.educationProgram || profile.education || "").toLowerCase().includes(rp)
  );

  if (matching.length > 0) {
    return `Your ${program}${year} directly covers areas relevant to ${career.title}. Your coursework gives you a head start on several key skills.`;
  }

  return `While ${program}${year} isn't a direct pipeline, the analytical and problem-solving skills you're building transfer well to ${career.title}.`;
}

// ── Step 6: Goal setting ──────────────────────────────────────────────────────
export function getDemoGoalSettingMessage(profile: StudentProfile, filteredCareers: Career[]): AgentTurn {
  const careerTitles = filteredCareers
    .slice(0, 4)
    .map((c) => `**${c.title}**`)
    .join(", ");

  return {
    message:
      "You've explored some great options! To build your personalized learning roadmap, I need to understand your goals a bit better.\n\n" +
      `1. **Which career direction interests you most?** ` +
      (careerTitles ? `From what we've discussed: ${careerTitles} — or something else entirely.` : "") + `\n\n` +
      `2. **What are your career goals?** For example: "Work in healthcare technology," "Start my own business," "Get into data science," or "Make a difference in my community."\n\n` +
      `Take your time — there's no wrong answer. You can also tell me if you'd like to explore more options first.`,
    agentState: "goal_setting",
    isDemo: true,
    profileSnapshot: profile,
  };
}

// ── Step 6b: Skill gap ────────────────────────────────────────────────────────
export function getDemoSkillGap(career: Career, profile: StudentProfile): SkillGap {
  const knownSkills = [...profile.skills, ...profile.subjects, ...profile.interests];
  const known = career.skillsNeeded.filter((cs) =>
    knownSkills.some(
      (k) => cs.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cs.toLowerCase().split(" ")[0])
    )
  );
  const toLearn = career.skillsNeeded.filter(
    (s) => !known.some((k) => s.toLowerCase().includes(k.toLowerCase()))
  );
  return {
    existing: known.length > 0 ? known : ["Communication", "Problem-solving"],
    toLearn: toLearn.length > 0 ? toLearn : career.skillsNeeded.slice(Math.ceil(career.skillsNeeded.length / 2)),
  };
}

// ── Step 7: Roadmap ───────────────────────────────────────────────────────────
export function getDemoRoadmap(career: Career, weeklyHours: number, skillGap: SkillGap): Roadmap {
  const now = new Date().toISOString();
  const skillsToLearn = skillGap.toLearn.length > 0 ? skillGap.toLearn : career.skillsNeeded;

  const difficulties: Array<"beginner" | "intermediate" | "advanced"> = [
    "beginner", "beginner", "intermediate", "intermediate", "advanced", "advanced"
  ];

  const steps: import("./types").RoadmapStep[] = skillsToLearn.map((skill, i) => ({
    id: uuidv4(),
    stage: i + 1,
    objective: `Build ${i < 2 ? "foundational" : i < 4 ? "working" : "advanced"} knowledge in: ${skill}`,
    skills: [skill],
    resource: `Search for "${skill} ${i < 2 ? "introduction" : "tutorial"}" on Coursera, edX, YouTube, or freeCodeCamp — look for beginner-friendly ${i < 2 ? "overviews" : "hands-on courses"}`,
    estimatedWeeks: weeklyHours >= 10 ? 2 : weeklyHours >= 5 ? 3 : 4,
    difficulty: difficulties[i] ?? "intermediate",
    project: generateProject(skill, career.title, i),
    milestone: `Complete a practice exercise demonstrating ${skill} — document what you built and what you learned`,
    completed: false,
    notes: "",
  }));

  return {
    careerId: career.id,
    careerTitle: career.title,
    steps: steps.slice(0, 6), // cap at 6 stages
    weeklyStudyHours: weeklyHours,
    totalWeeks: steps.slice(0, 6).reduce((a, s) => a + s.estimatedWeeks, 0),
    lastRevised: now,
  };
}

function generateProject(skill: string, careerTitle: string, stageIndex: number): string {
  const projectTemplates = [
    `Create a small personal project applying ${skill} — aim for something you could show to a recruiter`,
    `Build a portfolio piece that demonstrates your ${skill} ability — even a simple example counts`,
    `Apply ${skill} to a real-world problem from your own life or your studies`,
    `Contribute to an open-source project or create a tutorial blog post about ${skill}`,
    `Build a more complete project combining ${skill} with skills from earlier stages`,
    `Create a capstone project for your ${careerTitle} portfolio that showcases your ${skill} skills`,
  ];
  return projectTemplates[stageIndex] ?? projectTemplates[0];
}

// ── Check-in ──────────────────────────────────────────────────────────────────
export function getDemoCheckinResponse(
  milestoneTitle: string,
  studentNote: string,
  currentRoadmap: Roadmap
): AgentTurn {
  const remaining = currentRoadmap.steps.filter((s) => !s.completed);
  const nextStep = remaining[0];

  const message = nextStep
    ? `Thanks for the update on "${milestoneTitle}"! 🎉 It sounds like you're making real progress.\n\n` +
      `Based on what you shared, your next focus should be **${nextStep.objective}**. ` +
      `This builds directly on what you've just completed.\n\n` +
      `Would you like to continue with the current plan, or would you like me to suggest an adjustment based on your progress?`
    : `Congratulations on completing that milestone! 🎉 You've worked through your entire roadmap — that's a real achievement.\n\n` +
      `Would you like to explore another career path, set a new goal, or review the skills you've built?`;

  return {
    message,
    agentState: "checkin",
    isDemo: true,
  };
}

// ── Roadmap revision proposal ─────────────────────────────────────────────────
export function getDemoRoadmapRevision(currentRoadmap: Roadmap, reason: string): AgentTurn {
  const revisedSteps = currentRoadmap.steps.map((step) =>
    step.completed
      ? step
      : {
          ...step,
          estimatedWeeks: Math.max(1, step.estimatedWeeks - 1),
          resource: step.resource + " — consider looking for more advanced resources now that you have a foundation",
        }
  );

  const revised: Roadmap = {
    ...currentRoadmap,
    steps: revisedSteps,
    totalWeeks: revisedSteps.reduce((a, s) => a + s.estimatedWeeks, 0),
    lastRevised: new Date().toISOString(),
  };

  return {
    message:
      `Based on ${reason}, I'd like to suggest a **revised roadmap**. ` +
      `I've slightly shortened some upcoming stages since you appear to be progressing well.\n\n` +
      `⚠️ **This is a proposed change — your current roadmap is unchanged until you approve it.** ` +
      `Please review the revision below.\n\n` +
      `You can **accept** it, **reject** it and keep your current plan, or ask me to adjust something specific.`,
    agentState: "roadmap",
    pendingRevision: revised,
    revisionReason: reason,
    isDemo: true,
  };
}
