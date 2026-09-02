'use strict';

const path = require('node:path');

function fillLine(template, label, value) {
  const safeValue = typeof value === 'string' && value.trim() ? value.trim() : '';
  if (!safeValue) return template;
  const pattern = new RegExp(`^- ${label}:.*$`, 'm');
  return template.replace(pattern, `- ${label}: ${safeValue}`);
}

function insertExportMetadata(template, exportMetadata) {
  if (typeof exportMetadata !== 'string' || !exportMetadata.trim()) return template;
  if (/^- Export metadata:/m.test(template)) {
    return fillLine(template, 'Export metadata', exportMetadata);
  }
  return template.replace(/^- Commit:.*$/m, (line) => `${line}\n- Export metadata: ${exportMetadata.trim()}`);
}

function buildPhoneVerificationReport({ template, metadata = {} } = {}) {
  if (typeof template !== 'string' || !template.trim()) {
    throw new Error('Phone verification template content is required.');
  }

  let report = template;
  report = fillLine(report, 'Date', metadata.date);
  report = fillLine(report, 'Device', metadata.device);
  report = fillLine(report, 'iOS version', metadata.iosVersion);
  report = fillLine(report, 'App runtime', metadata.appRuntime);
  report = fillLine(report, 'Expo command', metadata.expoCommand);
  report = fillLine(report, 'Local URL', metadata.localUrl);
  report = fillLine(report, 'Branch', metadata.branch);
  report = fillLine(report, 'Commit', metadata.commit);
  report = fillLine(report, 'Tester', metadata.tester);
  report = insertExportMetadata(report, metadata.exportMetadata);
  return report.endsWith('\n') ? report : `${report}\n`;
}

function createPhoneVerificationReportPath({ commit, date, outputDir = 'outputs/phone-verification' } = {}) {
  const dateSlug = String(date || new Date().toISOString()).slice(0, 10);
  const commitSlug = String(commit || 'unknown').trim().slice(0, 7) || 'unknown';
  return path.join(outputDir, `phone-verification-${dateSlug}-${commitSlug}.md`);
}

module.exports = {
  buildPhoneVerificationReport,
  createPhoneVerificationReportPath,
};
