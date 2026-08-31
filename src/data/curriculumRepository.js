import {
  getLocalCourse,
  getPublishedUnits as getRepositoryPublishedUnits,
  loadCourse,
} from '../services/content/contentRepository';

export function getCourseById(courseId) {
  return getLocalCourse(courseId);
}

export function getPublishedUnits(courseId) {
  return getRepositoryPublishedUnits(courseId);
}

export async function loadCourseById(courseId) {
  return loadCourse(courseId);
}
