const path = require('node:path');

const { auditProjectImages, formatAuditReport } = require('./lib/audit-vocab-images.cjs');

const projectRoot = path.resolve(__dirname, '..');
const result = auditProjectImages(projectRoot);

console.log(formatAuditReport(result));
process.exitCode = result.ok ? 0 : 1;
