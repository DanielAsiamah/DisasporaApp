const test = require('node:test');
const assert = require('node:assert/strict');

const {
  decontaminateChromaEdges,
  encodeRgbaPng,
  featherVisibleAlphaEdges,
  normalizeRgbaPng,
  parseRgbaPng,
  visibleBounds,
} = require('../scripts/lib/normalize-png.cjs');

function sourcePixel(x, y) {
  if (x < 1 || x > 2 || y < 2 || y > 5) return [0, 0, 0, 0];
  const edge = x === 1 || x === 2 || y === 2 || y === 5;
  return [180, 90, 40, edge ? 160 : 255];
}

test('normalizes a transparent portrait cutout onto a centered square canvas', () => {
  const source = Buffer.alloc(4 * 8 * 4);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      source.set(sourcePixel(x, y), (y * 4 + x) * 4);
    }
  }

  const normalized = normalizeRgbaPng(encodeRgbaPng({ width: 4, height: 8, pixels: source }), {
    canvasSize: 12,
    subjectSpan: 8,
  });
  const decoded = parseRgbaPng(normalized);
  const bounds = visibleBounds(decoded.pixels, decoded.width, decoded.height);

  assert.equal(decoded.width, 12);
  assert.equal(decoded.height, 12);
  assert.ok(bounds.width <= 5 && bounds.height === 8, JSON.stringify(bounds));
  assert.ok(Math.abs((bounds.left + bounds.right) / 2 - 5.5) <= 1);
  assert.ok(Math.abs((bounds.top + bounds.bottom) / 2 - 5.5) <= 1);
  assert.equal(decoded.pixels[3], 0, 'top-left corner remains fully transparent');
  assert.ok(decoded.pixels.some((value, index) => index % 4 === 3 && value > 0 && value < 255));
});

test('normalization is deterministic and writes a valid non-interlaced RGBA PNG', () => {
  const source = Buffer.alloc(3 * 3 * 4);
  source.set([30, 80, 160, 255], (1 * 3 + 1) * 4);
  const input = encodeRgbaPng({ width: 3, height: 3, pixels: source });
  const first = normalizeRgbaPng(input, { canvasSize: 10, subjectSpan: 6 });
  const second = normalizeRgbaPng(input, { canvasSize: 10, subjectSpan: 6 });

  assert.deepEqual(first, second);
  assert.deepEqual(
    { width: parseRgbaPng(first).width, height: parseRgbaPng(first).height },
    { width: 10, height: 10 }
  );
});

test('edge decontamination replaces key-colored fringe from nearby subject color', () => {
  const width = 7;
  const height = 7;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 2; y <= 4; y += 1) {
    for (let x = 2; x <= 4; x += 1) {
      const edge = x === 2 || x === 4 || y === 2 || y === 4;
      pixels.set(edge ? [245, 5, 235, 180] : [105, 55, 30, 255], (y * width + x) * 4);
    }
  }

  const repaired = decontaminateChromaEdges({ width, height, pixels });
  const edgeOffset = (2 * width + 2) * 4;

  assert.deepEqual([...repaired.pixels.subarray(edgeOffset, edgeOffset + 3)], [105, 55, 30]);
  assert.equal(repaired.pixels[edgeOffset + 3], 180, 'the existing soft alpha is preserved');
  assert.ok(repaired.repairedPixels >= 8);
});

test('edge feathering adds partial alpha while preserving an opaque subject core', () => {
  const width = 9;
  const height = 9;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 2; y <= 6; y += 1) {
    for (let x = 2; x <= 6; x += 1) pixels.set([60, 120, 180, 255], (y * width + x) * 4);
  }

  const feathered = featherVisibleAlphaEdges({ width, height, pixels }, { radius: 2 });
  const edgeAlpha = feathered.pixels[(2 * width + 2) * 4 + 3];
  const coreAlpha = feathered.pixels[(4 * width + 4) * 4 + 3];

  assert.ok(edgeAlpha > 0 && edgeAlpha < 255);
  assert.equal(coreAlpha, 255);
  assert.ok(feathered.featheredPixels > 0);
});
