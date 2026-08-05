const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const COURSE_BUDGET_BYTES = 32 * 1024 * 1024;

for (const courseId of ['jamaican-patois', 'swahili', 'wolof', 'haitian-creole']) {
  test(`${courseId} transparent vocabulary artwork stays within the mobile asset budget`, () => {
    const directory = path.join(ROOT, 'assets', 'images', 'vocab', courseId);
    const files = fs.readdirSync(directory).filter((name) => name.endsWith('.png'));
    const totalBytes = files.reduce((sum, filename) => (
      sum + fs.statSync(path.join(directory, filename)).size
    ), 0);

    assert.equal(files.length, 39);
    assert.ok(
      totalBytes <= COURSE_BUDGET_BYTES,
      `${courseId} uses ${(totalBytes / 1024 / 1024).toFixed(1)} MB; budget is 32 MB`
    );
  });
}
