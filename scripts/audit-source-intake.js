const fs = require('node:fs');
const path = require('node:path');

const { auditSourceIntake } = require('./lib/source-intake-audit.cjs');

const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'content', 'source-intake', 'quizlet', 'manifest.json');

function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = auditSourceIntake({ manifest, projectRoot });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
