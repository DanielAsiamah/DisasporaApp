const fs = require('node:fs');
const path = require('node:path');

const { normalizeRgbaPng, parseRgbaPng } = require('./lib/normalize-png.cjs');

const projectRoot = path.resolve(__dirname, '..');
const courseId = process.argv.includes('--course')
  ? process.argv[process.argv.indexOf('--course') + 1]
  : 'jamaican-patois';
const force = process.argv.includes('--force');
const canvasSize = 1254;
const subjectSpan = 1100;
const directory = path.join(projectRoot, 'assets', 'images', 'vocab', courseId);

if (!/^[a-z0-9-]+$/.test(courseId || '')) throw new Error(`Invalid course ID: ${courseId}`);
if (!fs.existsSync(directory)) throw new Error(`Vocabulary image directory does not exist: ${directory}`);

const files = fs.readdirSync(directory)
  .filter((name) => name.toLowerCase().endsWith('.png'))
  .sort();
let normalized = 0;
let skipped = 0;

for (const filename of files) {
  const filePath = path.join(directory, filename);
  const input = fs.readFileSync(filePath);
  const parsed = parseRgbaPng(input);
  if (!force && parsed.width === canvasSize && parsed.height === canvasSize) {
    skipped += 1;
    continue;
  }
  const output = normalizeRgbaPng(input, { canvasSize, subjectSpan });
  const temporaryPath = `${filePath}.normalizing`;
  fs.writeFileSync(temporaryPath, output);
  fs.renameSync(temporaryPath, filePath);
  normalized += 1;
}

console.log(JSON.stringify({
  courseId,
  canvasSize,
  subjectSpan,
  discovered: files.length,
  normalized,
  skipped,
}, null, 2));
