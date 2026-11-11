// Shared frontend types (mirrors backend types)

export type AgentState =
  | "onboarding"           // Steps 1–2: interests, skills, strengths (multi-turn)
  | "broad_careers"        // Step 3: broad career possibilities from interests+skills
  | "onboarding_education" // Step 4: ask course/program + year of study
  | "filtered_careers"     // Step 5: careers filtered by education+interests+skills
  | "goal_setting"         // Step 6: which career + career goals
  | "skill_gap"            // Internal: compute skill gap for chosen career
  | "roadmap"              // Step 7: personalized learning path
  | "checkin"              // Ongoing: progress check-ins and adaptations
  | "complete";

export interface StudentProfile {
  interests: string[];
  skills: string[];
  subjects: string[];
  education: string;
  educationProgram: string;
  yearOfStudy: string;
  experience: string[];
  priorities: string[];
  goals: string;
  preferredCareers: string[];
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
  fitReason: string;
  skillsNeeded: string[];
  relatedCareers: string[];
  field: string;
  relevantPrograms: string[];
  relevantYears: string[];
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
  broadCareerSuggestions: Career[];
  savedCareers: Career[];
  dismissedCareerIds: string[];
  filteredCareers: Career[];
  selectedCareerId: string | null;
  skillGap: SkillGap | null;
  roadmap: Roadmap | null;
  pendingRoadmapRevision: Roadmap | null;
  revisionReason: string | null;
}

export interface AgentTurn {
  message: string;
  agentState: AgentState;
  careers?: Career[];
  careerStage?: "broad" | "filtered";
  skillGap?: SkillGap;
  roadmap?: Roadmap;
  pendingRevision?: Roadmap;
  revisionReason?: string;
  profileSnapshot?: StudentProfile;
  isDemo: boolean;
}
