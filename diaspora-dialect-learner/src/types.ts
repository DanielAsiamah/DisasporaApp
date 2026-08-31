/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum BaseLanguage {
  English = "en",
  French = "fr",
  Arabic = "ar"
}

export interface DialectCourse {
  id: string;
  name: string;
  nativeName: string;
  region: string;
  flag: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tagline: string;
}

export interface QuizQuestion {
  id: string;
  type: "choice" | "translate" | "match";
  question: string;
  options: string[];
  correctAnswer: string; // For multiple choice, or comma-separated correct sequence
  explanation?: string;
  audioMock?: string; // Phonetics helper
}

export interface LessonStep {
  id: string;
  type: "teaching" | "choice" | "translate" | "match";
  question?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  audioKey?: string;
  conceptTitle?: string;
  conceptExplanation?: string;
  narrative?: string;
  character?: {
    name: string;
    avatar: string; // e.g., elder, student
    role: string; // e.g., "Grammar Griot", "Abidjan Local"
  };
}

export interface LessonNode {
  id: string;
  title: string;
  description: string;
  type: "vocab" | "grammar" | "culture" | "slang" | "milestone";
  status: "locked" | "available" | "completed";
  questions: QuizQuestion[]; // Backwards compatibility
  steps?: LessonStep[]; // Master workbook step array
}

export interface Unit {
  id: string;
  number: number;
  title: string;
  description: string;
  themeColor: string;
  borderColor: string;
  lessons: LessonNode[];
}

export interface UserProgress {
  baseLanguage: BaseLanguage | null;
  selectedCourseId: string | null;
  hearts: number;
  xp: number;
  streak: number;
  completedLessons: string[]; // lessonNode.id
  unlockedUnits: string[]; // unit.id
  level: number;
}
