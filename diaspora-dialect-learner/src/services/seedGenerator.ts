/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COURSE_CONTENT } from "../data/courses";
import { LessonNode, LessonStep } from "../types";

export interface FirestoreDocument {
  path: string;
  data: Record<string, any>;
}

/**
 * Transforms the master workbook (COURSE_CONTENT) into flat Firestore collections
 * and document structures. This allows developers to see the exact structure
 * of the Firebase DB.
 */
export function generateFirestoreSeedData(): FirestoreDocument[] {
  const documents: FirestoreDocument[] = [];

  Object.entries(COURSE_CONTENT).forEach(([courseId, units]) => {
    // 1. Add Course Master Document
    documents.push({
      path: `courses/${courseId}`,
      data: {
        id: courseId,
        updatedAt: new Date().toISOString(),
        version: "2.0.0",
        schema: "master-workbook-steps"
      }
    });

    units.forEach((unit) => {
      const unitPath = `courses/${courseId}/units/${unit.id}`;
      // 2. Add Unit Document
      documents.push({
        path: unitPath,
        data: {
          id: unit.id,
          number: unit.number,
          title: unit.title,
          description: unit.description,
          themeColor: unit.themeColor,
          borderColor: unit.borderColor
        }
      });

      unit.lessons.forEach((lesson) => {
        const lessonPath = `${unitPath}/lessons/${lesson.id}`;
        
        // 3. Map steps, creating a fallback step array if none exists
        const steps: LessonStep[] = lesson.steps || generateFallbackSteps(lesson);

        // 4. Add Lesson Document with inline/subcollection step metadata
        documents.push({
          path: lessonPath,
          data: {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            type: lesson.type,
            status: lesson.status,
            stepCount: steps.length
          }
        });

        // 5. Add Step Documents inside step subcollection
        steps.forEach((step, index) => {
          documents.push({
            path: `${lessonPath}/steps/${step.id}`,
            data: {
              ...step,
              orderIndex: index
            }
          });
        });
      });
    });
  });

  return documents;
}

/**
 * Dynamically converts standard questions array to the richer LessonStep[] format
 * to ensure absolute compliance with the new workbook step schema for all languages.
 */
export function generateFallbackSteps(lesson: LessonNode): LessonStep[] {
  const steps: LessonStep[] = [];

  lesson.questions.forEach((q, idx) => {
    // Generate a contextual explanation / teaching slide before the interactive quiz
    steps.push({
      id: `${lesson.id}-teach-${idx}`,
      type: "teaching",
      conceptTitle: `${lesson.title} - Intro`,
      conceptExplanation: q.explanation || `Let's explore this linguistic concept. Pay attention to how it's phrased!`,
      narrative: `Linguistic preservation node for ${lesson.title}. Tap to hear phonetic pronunciation or review grammatical tips.`,
      audioKey: q.audioMock || undefined,
      character: {
        name: "Diaspora Elder",
        avatar: "👵🏾",
        role: "Heritage Companion"
      }
    });

    // Map quiz step
    steps.push({
      id: `${lesson.id}-quiz-${idx}`,
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      audioKey: q.audioMock || undefined
    });
  });

  return steps;
}
