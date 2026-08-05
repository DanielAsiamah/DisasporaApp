const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { buildCourseReleaseReport } = require('./lib/course-release-gate.cjs');

const projectRoot = path.resolve(__dirname, '..');

function parseOptions(argv) {
  const options = { courseId: '', approvalPath: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--course') options.courseId = String(argv[++index] || '').trim();
    else if (token === '--approval') options.approvalPath = path.resolve(projectRoot, argv[++index] || '');
    else throw new Error(`Unknown option: ${token}`);
  }
  if (!options.courseId) throw new Error('--course is required.');
  if (!options.approvalPath) throw new Error('--approval is required.');
  return options;
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  const workbookPath = path.join(projectRoot, 'patois_learn_database_1.xlsx');
  const workbookBytes = fs.readFileSync(workbookPath);
  const sourceWorkbookSha256 = crypto.createHash('sha256').update(workbookBytes).digest('hex');
  const approval = fs.existsSync(options.approvalPath)
    ? JSON.parse(fs.readFileSync(options.approvalPath, 'utf8'))
    : null;
  const report = buildCourseReleaseReport({
    projectRoot,
    curriculum: GENERATED_CURRICULUM,
    courseId: options.courseId,
    sourceWorkbookSha256,
    approval,
  });

  const status = report.ready ? 'ready' : 'not-ready';
  const payload = { status, ...report, approvalPath: path.relative(projectRoot, options.approvalPath) };
  const output = JSON.stringify(payload, null, 2);
  if (report.ready) console.log(output);
  else {
    console.error(output);
    process.exitCode = 2;
  }
}

try {
  main();
} catch (error) {
  console.error(`Course release check failed: ${error.message}`);
  process.exitCode = 1;
}
