const path = require('node:path');

const {
  auditCourseImageSet,
  formatCourseImageAuditReport,
} = require('./lib/audit-course-image-set.cjs');

const projectRoot = path.resolve(__dirname, '..');
const courseFlagIndex = process.argv.indexOf('--course');
const courseId = courseFlagIndex === -1
  ? 'jamaican-patois'
  : process.argv[courseFlagIndex + 1];

if (!courseId || courseId.startsWith('--')) {
  console.error('Usage: node scripts/audit-images.js [--course <course-id>]');
  process.exitCode = 2;
  return;
}

const result = auditCourseImageSet(projectRoot, courseId);

console.log(formatCourseImageAuditReport(result));
process.exitCode = result.ok ? 0 : 1;
