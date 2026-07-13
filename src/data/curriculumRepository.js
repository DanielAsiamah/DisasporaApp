import { getFirestoreCourse } from '../services/firestore/curriculumService';
import { coursesData } from './generatedCourses';

function sortUnits(units = []) {
  return units
    .filter((unit) => unit.status !== 'draft')
    .map((unit) => {
      const vocabularyById = new Map(
        (unit.vocabulary || []).map((item) => [item.id, item])
      );

      return {
        ...unit,
        lessons: [...(unit.lessons || [])]
          .filter((lesson) => lesson.status !== 'draft')
          .map((lesson) => ({
            ...lesson,
            items: lesson.items?.length
              ? lesson.items
              : (lesson.itemIds || []).map((id) => vocabularyById.get(id)).filter(Boolean),
          }))
          .sort((a, b) => (a.order || 0) - (b.order || 0)),
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getCourseById(courseId) {
  const course = coursesData[courseId] || coursesData.patois;
  return {
    ...course,
    id: courseId || 'patois',
    units: sortUnits(course.units),
  };
}

export function getPublishedUnits(courseId) {
  return getCourseById(courseId).units;
}

export async function loadCourseById(courseId) {
  const localCourse = getCourseById(courseId);

  try {
    const firestoreCourse = await getFirestoreCourse(courseId);
    if (!firestoreCourse?.units?.length) return localCourse;

    return {
      ...localCourse,
      ...firestoreCourse,
      id: courseId || firestoreCourse.id || localCourse.id,
      units: sortUnits(firestoreCourse.units),
    };
  } catch {
    return localCourse;
  }
}
