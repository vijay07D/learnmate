// Shared types for LearnMate backend

// Agent states follow the required 7-step student journey:
// onboarding → broad_careers → onboarding_education → filtered_careers →
// goal_setting → skill_gap → roadmap → checkin → (loop)
export type AgentState =
  | "onboarding"            // Steps 1–2: interests, skills, strengths (multi-turn)
  | "broad_careers"         // Step 3: show broad career possibilities from interests+skills
  | "onboarding_education"  // Step 4: ask course/program + year of study
  | "filtered_careers"      // Step 5: show careers filtered by education+interests+skills
  | "goal_setting"          // Step 6: ask which career interests them + career goals
  | "skill_gap"             // Internal: compute skill gap for chosen career
  | "roadmap"               // Step 7: personalized learning path
  | "checkin"               // Ongoing: progress check-ins and adaptations
  | "complete";

export interface StudentProfile {
  interests: string[];
  skills: string[];
  subjects: string[];
  education: string;           // e.g. "BSc Computer Science"
  educationProgram: string;    // parsed program name
  yearOfStudy: string;         // e.g. "Year 2", "Final year"
  experience: string[];
  priorities: string[];
  goals: string;
  preferredCareers: string[];  // careers they expressed interest in
  learningFormat: string;
  weeklyStudyHours: number | null;
}

export interface ConversationMessage {
  role: "assistant" | "student";
  content: string;
  timestamp: string;
}

export interface Career {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  fitReason: string;           // filled in per-student at match time
  skillsNeeded: string[];
  relatedCareers: string[];
  field: string;
  // Tags used for education-based filtering
  relevantPrograms: string[];  // e.g. ["computer science", "engineering", "any"]
  relevantYears: string[];     // e.g. ["any", "final year"]
}

export interface SkillGap {
  existing: string[];
  toLearn: string[];
}

export interface RoadmapStep {
  id: string;
  stage: number;
  objective: string;
  skills: string[];
  resource: string;
  estimatedWeeks: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  project: string;
  milestone: string;
  completed: boolean;
  notes: string;
}

export interface Roadmap {
  careerId: string;
  careerTitle: string;
  steps: RoadmapStep[];
  weeklyStudyHours: number;
  totalWeeks: number;
  lastRevised: string;
}

export interface StudentSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  agentState: AgentState;
  profile: StudentProfile;
  conversation: ConversationMessage[];
  onboardingStep: number;
  // Career lists
  broadCareerSuggestions: Career[];  // from Step 3 (before education filter)
  savedCareers: Career[];            // user-saved
  dismissedCareerIds: string[];
  filteredCareers: Career[];         // from Step 5 (after education filter)
  selectedCareerId: string | null;
  // Roadmap
  skillGap: SkillGap | null;
  roadmap: Roadmap | null;
  pendingRoadmapRevision: Roadmap | null;
  revisionReason: string | null;
}

export interface AgentTurn {
  message: string;
  agentState: AgentState;
  careers?: Career[];            // careers to display in UI
  careerStage?: "broad" | "filtered";  // which list these are
  skillGap?: SkillGap;
  roadmap?: Roadmap;
  pendingRevision?: Roadmap;
  revisionReason?: string;
  profileSnapshot?: StudentProfile;
  isDemo: boolean;
}

export interface StartSessionResponse {
  sessionId: string;
  agentTurn: AgentTurn;
}
