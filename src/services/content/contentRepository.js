import { getFirestoreCourse } from '../firestore/curriculumService';
import { coursesData } from '../../data/generatedCourses';

function sortUnits(units = []) {
  return units
    .filter((unit) => unit.status !== 'draft')
    .map((unit) => ({
      ...unit,
      lessons: [...(unit.lessons || [])]
        .filter((lesson) => lesson.status !== 'draft')
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function normalizeCourse(courseId, course) {
  const fallbackId = courseId || course?.id || 'patois';
  return {
    ...course,
    id: fallbackId,
    units: sortUnits(course?.units),
  };
}

function createSyntheticSection(course) {
  return {
    id: `${course.id}-section-1`,
    order: 1,
    title: 'Section 1',
    description: course.title,
    units: course.units,
  };
}

export function getLocalCourse(courseId = 'patois') {
  return normalizeCourse(courseId, coursesData[courseId] || coursesData.patois);
}

export function getPublishedUnits(courseId = 'patois') {
  return getLocalCourse(courseId).units;
}

export async function loadCourse(courseId = 'patois') {
  const localCourse = getLocalCourse(courseId);

  try {
    const firestoreCourse = await getFirestoreCourse(courseId);
    if (!firestoreCourse?.units?.length) return localCourse;

    return normalizeCourse(courseId, {
      ...localCourse,
      ...firestoreCourse,
    });
  } catch {
    return localCourse;
  }
}

export function buildCourseTree(course) {
  const normalizedCourse = normalizeCourse(course?.id, course);
  const sections = Array.isArray(normalizedCourse.sections) && normalizedCourse.sections.length
    ? normalizedCourse.sections
    : [createSyntheticSection(normalizedCourse)];
  const units = normalizedCourse.units;
  const lessonsByUnit = Object.fromEntries(
    units.map((unit) => [unit.id, unit.lessons || []])
  );
  const flatLessons = units.flatMap((unit) =>
    (unit.lessons || []).map((lesson) => ({
      ...lesson,
      unitId: unit.id,
      unitTitle: unit.description || unit.title,
    }))
  );

  return {
    course: normalizedCourse,
    sections,
    units,
    lessonsByUnit,
    flatLessons,
  };
}

export async function loadCourseTree(courseId = 'patois') {
  const course = await loadCourse(courseId);
  return buildCourseTree(course);
}
