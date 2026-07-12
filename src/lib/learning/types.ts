export type AbilityId = "script" | "listening" | "vocabulary" | "grammar" | "pragmatics" | "native";

export type StudyMode = "guided" | "self";

export type StudyGoal = "foundation" | "travel" | "media" | "native";

export type StudyIntensity = "light" | "steady" | "deep";

export type StudyFocus = "balanced" | "listening" | "reading" | "conversation";

export type TaskKind = "review" | "lesson" | "hangul" | "vocabulary" | "grammar" | "native" | "quiz" | "checkpoint" | "immersion";
export type TaskLane = "core" | "self" | "bridge" | "expansion";

export interface UserProfile {
  name: string;
  studyMode: StudyMode;
  selfStudyGoal: StudyGoal;
  selfStudyIntensity: StudyIntensity;
  selfStudyFocus: StudyFocus;
  minutesGoal: number;
  romanization: "fade" | "always" | "hidden";
  createdAt: string;
  updatedAt: string;
}

export interface LearningProgress {
  completedLessons: string[];
  lessonScores: Record<string, number>;
  previewLessonScores: Record<string, number>;
  masteredHangul: string[];
  learnedVocab: string[];
  learnedGrammar: string[];
  learnedNative: string[];
  nativeEvidence: Record<string, { listened: boolean; retell: string; transfer: string; updatedAt: string }>;
  completedMaterials: string[];
  materialEvidence: Record<string, { dictation: string; retell: string; selfCheck: string[]; outputEntryId?: string; updatedAt: string }>;
  completedCheckpoints: string[];
  checkpointEvidence: Record<string, string>;
  completedTasks: Record<string, string>;
  ability: Record<AbilityId, number>;
  abilityEvents: Record<string, number | Partial<Record<AbilityId, number>>>;
  practiceItems: Record<string, {
    attempts: number;
    correct: number;
    wrong: number;
    streak: number;
    lastCorrect: boolean;
    lastSeenAt: string;
    lastSource: "lesson" | "review" | "quiz";
  }>;
  streak: number;
  lastStudyDate: string | null;
  minutesGoal: number;
  updatedAt: string;
}

export interface StudyTask {
  id: string;
  kind: TaskKind;
  title: string;
  detail: string;
  href: string;
  minutes: number;
  ability: AbilityId[];
  source: "guided" | "self" | "system";
  priority: number;
  lane?: TaskLane;
  reason?: string;
  completed?: boolean;
  completionLabel?: string;
  completionAsset?: "complete" | "selfStudy";
}

export interface LearningWorkspace {
  profile: UserProfile;
  progress: LearningProgress;
  modeLabel: string;
  nextLesson: any | null;
  recommended: StudyTask[];
  openStudy: StudyTask[];
  abilityGaps: AbilityId[];
  proficiency: {
    current: any;
    next: any | null;
    progress: number;
    evidence: Record<string, number>;
    nextRequirements: Array<{ metric: string; label: string; current: number; target: number; met: boolean }>;
  };
  stats: {
    completedLessons: number;
    totalLessons: number;
    masteredHangul: number;
    totalHangul: number;
    learnedVocab: number;
    totalVocab: number;
    completedMaterials: number;
    totalMaterials: number;
    outputEntries: number;
    mistakeCards: number;
    dueMistakes: number;
    practiceItems: number;
    weakPracticeItems: number;
  };
  evidence: {
    validMaterialIds: string[];
  };
}
