const fs = require('node:fs');
const path = require('node:path');

const {
  decontaminateChromaEdges,
  encodeRgbaPng,
  featherVisibleAlphaEdges,
  normalizeRgbaPng,
  parseRgbaPng,
} = require('./lib/normalize-png.cjs');

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const projectRoot = path.resolve(__dirname, '..');
const courseId = argument('--course', 'jamaican-patois');
const keyMode = argument('--key-mode', 'magenta');
const conceptIds = argument('--concepts').split(',').map((value) => value.trim()).filter(Boolean);
if (!/^[a-z0-9-]+$/.test(courseId)) throw new Error(`Invalid course ID: ${courseId}`);
if (!['magenta', 'green', 'both'].includes(keyMode)) throw new Error(`Invalid key mode: ${keyMode}`);
if (!conceptIds.length || conceptIds.some((id) => !/^[a-z0-9-]+$/.test(id))) {
  throw new Error('Provide one or more canonical IDs with --concepts id-one,id-two.');
}

const results = [];
for (const conceptId of conceptIds) {
  const filePath = path.join(projectRoot, 'assets', 'images', 'vocab', courseId, `${conceptId}.png`);
  if (!fs.existsSync(filePath)) throw new Error(`Missing vocabulary image: ${filePath}`);
  const parsed = parseRgbaPng(fs.readFileSync(filePath));
  const decontaminated = decontaminateChromaEdges(parsed, {
    edgeRadius: 8,
    searchRadius: 18,
    keyMode,
  });
  const hasPartialAlpha = decontaminated.pixels.some((value, index) => (
    index % 4 === 3 && value > 0 && value < 255
  ));
  const feathered = hasPartialAlpha
    ? { ...decontaminated, featheredPixels: 0 }
    : featherVisibleAlphaEdges(decontaminated, { radius: 2 });
  const cleaned = encodeRgbaPng(feathered);
  const normalized = normalizeRgbaPng(cleaned, { canvasSize: 1254, subjectSpan: 1100 });
  const temporaryPath = `${filePath}.repairing`;
  fs.writeFileSync(temporaryPath, normalized);
  fs.renameSync(temporaryPath, filePath);
  results.push({
    conceptId,
    repairedPixels: decontaminated.repairedPixels,
    featheredPixels: feathered.featheredPixels,
  });
}

console.log(JSON.stringify({ courseId, keyMode, results }, null, 2));
