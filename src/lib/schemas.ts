export type JobAnalysis = {
  title: string;
  company: string;
  location: string;
  seniority: string;
  summary: string;
  skills: string[];
  requiredSkills: string[];
  bonusSkills: string[];
  responsibilities: string[];
  hiddenRequirements: string[];
};

export type MatchAnalysis = {
  matchScore: number;
  priority: "high" | "medium" | "low";
  strengths: string[];
  gaps: string[];
  resumeSuggestions: string[];
  interviewPrep: string[];
  nextAction: string;
  followUpQuestion: string;
  projectEvidence: Array<{
    project: string;
    matchedRequirements: string[];
    role: string;
    outcomes: string[];
    relevance: "high" | "medium" | "low";
  }>;
  scoring: {
    requiredPoints: number;
    bonusPoints: number;
    projectPoints: number;
    outcomePoints: number;
    matchedRequiredSkills: string[];
    matchedBonusSkills: string[];
    confidence: "high" | "medium" | "low";
    rationale: string;
  };
};

export type AnalysisRecord = {
  id: string;
  createdAt: string;
  jobText: string;
  resumeText: string;
  job: JobAnalysis;
  match: MatchAnalysis;
};
