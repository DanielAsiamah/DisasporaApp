const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { VERIFIED_COURSE_RELEASES } = require('../src/data/verifiedCourseReleases.cjs');
const { buildCourseReleaseReport } = require('./lib/course-release-gate.cjs');
const {
  buildVerifiedReleaseRecord,
  serializeVerifiedCourseReleases,
} = require('./lib/verified-release-registry.cjs');

const projectRoot = path.resolve(__dirname, '..');
const registryPath = path.join(projectRoot, 'src', 'data', 'verifiedCourseReleases.cjs');

function parseOptions(argv) {
  const options = {
    apply: false,
    confirmed: false,
    courseId: '',
    approvalPath: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') options.apply = true;
    else if (token === '--confirm-publication') options.confirmed = true;
    else if (token === '--course') options.courseId = String(argv[++index] || '').trim();
    else if (token === '--approval') options.approvalPath = path.resolve(projectRoot, argv[++index] || '');
    else throw new Error(`Unknown option: ${token}`);
  }
  if (!options.courseId) throw new Error('--course is required.');
  if (!options.approvalPath) throw new Error('--approval is required.');
  if (options.apply && !options.confirmed) {
    throw new Error('--apply also requires --confirm-publication after the user approves the exact phone-tested candidate.');
  }
  return options;
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  const workbookBytes = fs.readFileSync(path.join(projectRoot, 'patois_learn_database_1.xlsx'));
  const sourceWorkbookSha256 = crypto.createHash('sha256').update(workbookBytes).digest('hex');
  const approval = JSON.parse(fs.readFileSync(options.approvalPath, 'utf8'));
  const report = buildCourseReleaseReport({
    projectRoot,
    curriculum: GENERATED_CURRICULUM,
    courseId: options.courseId,
    sourceWorkbookSha256,
    approval,
  });
  if (!report.ready) {
    console.error(JSON.stringify({ status: 'not-ready', mode: 'check-only', ...report }, null, 2));
    process.exitCode = 2;
    return;
  }

  const course = GENERATED_CURRICULUM.courses.find(({ id }) => id === options.courseId);
  const staged = course?.availability === 'published';
  if (!options.apply) {
    console.log(JSON.stringify({
      status: staged ? 'ready' : 'not-staged',
      mode: 'check-only',
      courseId: options.courseId,
      candidateDigest: approval.candidateDigest,
      staged,
    }, null, 2));
    if (!staged) process.exitCode = 2;
    return;
  }
  if (!staged) {
    throw new Error('The approved workbook candidate must be staged as published before the final phone test.');
  }

  const record = buildVerifiedReleaseRecord({
    courseId: options.courseId,
    approval,
    report,
  });
  const nextRegistry = {
    ...VERIFIED_COURSE_RELEASES,
    [options.courseId]: record,
  };
  const source = serializeVerifiedCourseReleases(nextRegistry);
  const tempPath = `${registryPath}.tmp`;
  fs.writeFileSync(tempPath, source, 'utf8');
  fs.renameSync(tempPath, registryPath);
  console.log(JSON.stringify({
    status: 'published',
    courseId: options.courseId,
    candidateDigest: record.candidateDigest,
    registryPath: path.relative(projectRoot, registryPath),
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
