const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COURSE_ID = 'jamaican-patois';
const EXPECTED_VOCAB_SIZE = 768;
const CHAPTER_HERO_PATH = 'assets/images/chapters/jamaican-patois-greetings.png';
const REGISTRY_PATH = 'src/data/jamaicanPatoisImageRegistry.js';
const LEGACY_SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.json']);

let crcTable;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    crcTable[index] = value >>> 0;
  }
  return crcTable;
}

function crc32(buffer) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const value of buffer) crc = table[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function failure(code, target, message, details = {}) {
  return { code, target, message, details };
}

function parsePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('File does not have a valid PNG signature.');
  }

  let offset = 8;
  let header = null;
  let sawEnd = false;
  const imageData = [];
  const text = [];

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw new Error('PNG chunk header is truncated.');
    const length = buffer.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buffer.length) throw new Error('PNG chunk data is truncated.');
    const typeBuffer = buffer.subarray(offset + 4, offset + 8);
    const type = typeBuffer.toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = buffer.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(Buffer.concat([typeBuffer, data]));
    if (expectedCrc !== actualCrc) throw new Error(`PNG ${type} chunk has an invalid CRC.`);

    if (type === 'IHDR') {
      if (length !== 13 || header) throw new Error('PNG must contain exactly one 13-byte IHDR chunk.');
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      text.push(data.toString(type === 'tEXt' ? 'latin1' : 'utf8'));
    } else if (type === 'IEND') {
      sawEnd = true;
      break;
    }
    offset = chunkEnd;
  }

  if (!header) throw new Error('PNG is missing IHDR.');
  if (!imageData.length) throw new Error('PNG is missing IDAT.');
  if (!sawEnd) throw new Error('PNG is missing IEND.');
  if (!header.width || !header.height) throw new Error('PNG dimensions must be positive.');

  return { header, imageData, text };
}

function paethPredictor(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodeRgba(parsed) {
  const { width, height } = parsed.header;
  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(parsed.imageData));
  const expectedLength = height * (rowBytes + 1);
  if (inflated.length !== expectedLength) {
    throw new Error(`Decoded pixel stream is ${inflated.length} bytes; expected ${expectedLength}.`);
  }

  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[rowOffset + x - rowBytes] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[rowOffset + x - rowBytes - bytesPerPixel] : 0;
      let value;
      if (filterType === 0) value = raw;
      else if (filterType === 1) value = raw + left;
      else if (filterType === 2) value = raw + above;
      else if (filterType === 3) value = raw + Math.floor((left + above) / 2);
      else if (filterType === 4) value = raw + paethPredictor(left, above, upperLeft);
      else throw new Error(`Unsupported PNG row filter ${filterType}.`);
      pixels[rowOffset + x] = value & 0xff;
    }
    sourceOffset += rowBytes;
  }
  return pixels;
}

function hasTransparentNeighbor(alpha, width, height, x, y, radius = 2) {
  const minX = Math.max(0, x - radius);
  const maxX = Math.min(width - 1, x + radius);
  const minY = Math.max(0, y - radius);
  const maxY = Math.min(height - 1, y + radius);
  for (let sampleY = minY; sampleY <= maxY; sampleY += 1) {
    for (let sampleX = minX; sampleX <= maxX; sampleX += 1) {
      if (alpha[sampleY * width + sampleX] === 0) return true;
    }
  }
  return false;
}

function isStrictChromaKey(r, g, b) {
  const nearMagentaKey = Math.max(Math.abs(255 - r), g, Math.abs(255 - b)) <= 65;
  const nearGreenKey = Math.max(r, Math.abs(255 - g), b) <= 65;
  return nearMagentaKey || nearGreenKey;
}

function isDarkPurpleKey(r, g, b) {
  return r >= 40 && b >= 30
    && r - g >= 20 && b - g >= 10
    && Math.abs(r - b) <= 55;
}

function inspectRgbaPixels(pixels, width, height) {
  const pixelCount = width * height;
  const alpha = Buffer.alloc(pixelCount);
  let transparentPixels = 0;
  let partialAlphaPixels = 0;
  let opaquePixels = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const value = pixels[index * 4 + 3];
    alpha[index] = value;
    if (value === 0) transparentPixels += 1;
    else if (value === 255) opaquePixels += 1;
    else partialAlphaPixels += 1;
  }

  const cornerSize = Math.max(1, Math.floor(Math.min(width, height) * 0.05));
  const corners = [
    [0, 0],
    [width - cornerSize, 0],
    [0, height - cornerSize],
    [width - cornerSize, height - cornerSize],
  ];
  let opaqueCornerPixels = 0;
  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + cornerSize; y += 1) {
      for (let x = startX; x < startX + cornerSize; x += 1) {
        if (alpha[y * width + x] >= 250) opaqueCornerPixels += 1;
      }
    }
  }
  const cornerPixelCount = cornerSize * cornerSize * 4;

  let opaquePerimeterPixels = 0;
  let perimeterPixelCount = 0;
  for (let x = 0; x < width; x += 1) {
    if (alpha[x] >= 250) opaquePerimeterPixels += 1;
    if (height > 1 && alpha[(height - 1) * width + x] >= 250) opaquePerimeterPixels += 1;
    perimeterPixelCount += height > 1 ? 2 : 1;
  }
  for (let y = 1; y < height - 1; y += 1) {
    if (alpha[y * width] >= 250) opaquePerimeterPixels += 1;
    if (width > 1 && alpha[y * width + width - 1] >= 250) opaquePerimeterPixels += 1;
    perimeterPixelCount += width > 1 ? 2 : 1;
  }

  let strictHaloPixels = 0;
  let purpleHaloPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (alpha[pixelIndex] === 0) continue;
      const byteIndex = pixelIndex * 4;
      if (!hasTransparentNeighbor(alpha, width, height, x, y)) continue;
      if (isStrictChromaKey(pixels[byteIndex], pixels[byteIndex + 1], pixels[byteIndex + 2])) {
        strictHaloPixels += 1;
      } else if (isDarkPurpleKey(pixels[byteIndex], pixels[byteIndex + 1], pixels[byteIndex + 2])) {
        purpleHaloPixels += 1;
      }
    }
  }

  return {
    pixelCount,
    transparentPixels,
    partialAlphaPixels,
    opaquePixels,
    opaqueCornerRatio: cornerPixelCount ? opaqueCornerPixels / cornerPixelCount : 1,
    opaquePerimeterRatio: perimeterPixelCount ? opaquePerimeterPixels / perimeterPixelCount : 1,
    haloPixels: strictHaloPixels + purpleHaloPixels,
    purpleHaloPixels,
    strictHaloPixels,
  };
}

function auditPngBuffer(buffer, options = {}) {
  const target = options.label || 'image.png';
  const failures = [];
  let parsed;
  try {
    parsed = parsePng(buffer);
  } catch (error) {
    return { failures: [failure('INVALID_PNG', target, error.message)], stats: {} };
  }

  const { header } = parsed;
  if ((options.expectedWidth && header.width !== options.expectedWidth)
    || (options.expectedHeight && header.height !== options.expectedHeight)) {
    failures.push(failure(
      'INVALID_DIMENSIONS',
      target,
      `Expected ${options.expectedWidth || '*'}x${options.expectedHeight || '*'}, found ${header.width}x${header.height}.`,
      { width: header.width, height: header.height }
    ));
  }
  if (header.bitDepth !== 8 || header.colorType !== 6 || header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) {
    failures.push(failure(
      'INVALID_PNG_MODE',
      target,
      `Expected non-interlaced 8-bit RGBA PNG (color type 6); found bit depth ${header.bitDepth}, color type ${header.colorType}, interlace ${header.interlace}.`,
      header
    ));
  }

  const metadata = parsed.text.join('\n');
  const suspiciousMetadata = metadata.match(/watermark|copyright|adobe stock|shutterstock|istock|getty|generation prompt|\bprompt\b/i);
  if (suspiciousMetadata) {
    failures.push(failure(
      'SUSPICIOUS_METADATA',
      target,
      `PNG metadata contains the forbidden marker ${JSON.stringify(suspiciousMetadata[0])}; inspect for text or a watermark.`
    ));
  }

  if (header.bitDepth !== 8 || header.colorType !== 6 || header.interlace !== 0) {
    return { failures, stats: { ...header } };
  }

  let stats;
  try {
    stats = { ...header, ...inspectRgbaPixels(decodeRgba(parsed), header.width, header.height) };
  } catch (error) {
    failures.push(failure('INVALID_PIXEL_DATA', target, error.message));
    return { failures, stats: { ...header } };
  }

  if (stats.transparentPixels === 0) {
    failures.push(failure('NO_TRANSPARENCY', target, 'Image has no fully transparent pixels.'));
  }
  if (stats.opaquePixels === 0) {
    failures.push(failure('NO_OPAQUE_SUBJECT', target, 'Image has no fully opaque subject pixels.'));
  }
  if (stats.partialAlphaPixels === 0) {
    failures.push(failure('NO_ANTIALIASED_ALPHA', target, 'Image alpha is binary; soft cutout and hair edges require partial alpha pixels.'));
  }
  if (stats.transparentPixels === 0 || stats.opaqueCornerRatio > 0.2 || stats.opaquePerimeterRatio > 0.35) {
    failures.push(failure(
      'OPAQUE_BACKGROUND',
      target,
      `Opaque canvas/background heuristic failed (corners ${(stats.opaqueCornerRatio * 100).toFixed(1)}%, perimeter ${(stats.opaquePerimeterRatio * 100).toFixed(1)}% opaque).`,
      { opaqueCornerRatio: stats.opaqueCornerRatio, opaquePerimeterRatio: stats.opaquePerimeterRatio }
    ));
  }
  const purpleHaloAllowance = Math.max(1, Math.floor(stats.pixelCount * 0.00005));
  if (stats.strictHaloPixels > 0 || stats.purpleHaloPixels > purpleHaloAllowance) {
    failures.push(failure(
      'CHROMA_KEY_HALO',
      target,
      `Found ${stats.strictHaloPixels} strict-key and ${stats.purpleHaloPixels} dark-purple edge pixel(s) within two pixels of transparency.`,
      {
        pixelCount: stats.strictHaloPixels + stats.purpleHaloPixels,
        purpleHaloAllowance,
        purpleHaloPixels: stats.purpleHaloPixels,
        strictHaloPixels: stats.strictHaloPixels,
      }
    ));
  }

  return { failures, stats };
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function relativeUnix(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function compareConceptImageFiles(expectedIds, actualFiles, directoryPath) {
  const failures = [];
  const expectedFiles = new Set(expectedIds.map((id) => `${id}.png`));
  if (actualFiles.length !== expectedIds.length) {
    failures.push(failure('VOCAB_IMAGE_COUNT_MISMATCH', directoryPath, `Expected ${expectedIds.length} PNGs, found ${actualFiles.length}.`));
  }
  for (const id of expectedIds) {
    if (!actualFiles.includes(`${id}.png`)) {
      failures.push(failure('MISSING_CONCEPT_IMAGE', `${directoryPath}/${id}.png`, `Missing PNG for concept ${id}.`, { conceptId: id }));
    }
  }
  for (const filename of actualFiles) {
    if (!expectedFiles.has(filename)) failures.push(failure('UNEXPECTED_CONCEPT_IMAGE', `${directoryPath}/${filename}`, 'Unexpected PNG filename in canonical course directory.'));
  }
  return failures;
}

function auditRegistry(projectRoot, expectedIds, expectedPaths) {
  const failures = [];
  const absoluteRegistryPath = path.join(projectRoot, REGISTRY_PATH);
  if (!fs.existsSync(absoluteRegistryPath)) {
    return [failure('MISSING_REGISTRY', REGISTRY_PATH, 'Static Jamaican Patois image registry is missing.')];
  }
  const source = fs.readFileSync(absoluteRegistryPath, 'utf8');
  const entryPattern = /['"]([a-z0-9-]+)['"]\s*:\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const entries = [];
  let match;
  while ((match = entryPattern.exec(source))) entries.push({ id: match[1], requirePath: match[2] });

  const registryIds = entries.map((entry) => entry.id);
  if (registryIds.length !== expectedIds.length) {
    failures.push(failure('REGISTRY_COUNT_MISMATCH', REGISTRY_PATH, `Expected ${expectedIds.length} static entries, found ${registryIds.length}.`));
  }
  for (const id of expectedIds) {
    const entriesForId = entries.filter((entry) => entry.id === id);
    if (!entriesForId.length) {
      failures.push(failure('MISSING_REGISTRY_ENTRY', REGISTRY_PATH, `Missing registry entry for ${id}.`, { conceptId: id }));
      continue;
    }
    if (entriesForId.length > 1) failures.push(failure('DUPLICATE_REGISTRY_ENTRY', REGISTRY_PATH, `Duplicate registry entry for ${id}.`, { conceptId: id }));
    const expectedRequire = `../../${expectedPaths.get(id)}`;
    if (entriesForId[0].requirePath !== expectedRequire) {
      failures.push(failure(
        'INVALID_REGISTRY_PATH',
        REGISTRY_PATH,
        `${id} must require ${expectedRequire}; found ${entriesForId[0].requirePath}.`,
        { conceptId: id }
      ));
    }
  }
  for (const id of new Set(registryIds)) {
    if (!expectedIds.includes(id)) failures.push(failure('UNEXPECTED_REGISTRY_ENTRY', REGISTRY_PATH, `Unexpected registry entry ${id}.`, { conceptId: id }));
  }
  return failures;
}

function auditVocabularyRows(projectRoot, expectedIds, expectedPaths) {
  const failures = [];
  const modulePath = path.join(projectRoot, 'src', 'data', 'jamaicanPatoisVocabulary.cjs');
  delete require.cache[require.resolve(modulePath)];
  const { JAMAICAN_PATOIS_VOCABULARY } = require(modulePath);
  const rowIds = JAMAICAN_PATOIS_VOCABULARY.map((row) => row.conceptId);
  if (rowIds.length !== expectedIds.length) {
    failures.push(failure('VOCABULARY_COUNT_MISMATCH', relativeUnix(projectRoot, modulePath), `Expected ${expectedIds.length} vocabulary rows, found ${rowIds.length}.`));
  }
  for (const id of expectedIds) {
    const rows = JAMAICAN_PATOIS_VOCABULARY.filter((row) => row.conceptId === id);
    if (!rows.length) failures.push(failure('MISSING_VOCABULARY_ROW', relativeUnix(projectRoot, modulePath), `Missing vocabulary row for ${id}.`, { conceptId: id }));
    else if (rows[0].image !== expectedPaths.get(id)) {
      failures.push(failure('INVALID_VOCABULARY_IMAGE_PATH', relativeUnix(projectRoot, modulePath), `${id} must use ${expectedPaths.get(id)}; found ${rows[0].image}.`, { conceptId: id }));
    }
    if (rows.length > 1) failures.push(failure('DUPLICATE_VOCABULARY_ROW', relativeUnix(projectRoot, modulePath), `Duplicate vocabulary row for ${id}.`, { conceptId: id }));
  }
  for (const id of new Set(rowIds)) {
    if (!expectedIds.includes(id)) failures.push(failure('UNEXPECTED_VOCABULARY_ROW', relativeUnix(projectRoot, modulePath), `Unexpected vocabulary concept ${id}.`, { conceptId: id }));
  }
  return failures;
}

function isCanonicalVocabularyPath(imagePath, courseIds, conceptIds) {
  const match = String(imagePath || '').match(/^assets\/images\/vocab\/([a-z0-9-]+)\/([a-z0-9-]+)\.png$/);
  return Boolean(match && courseIds.includes(match[1]) && conceptIds.includes(match[2]));
}

function auditLegacyFilesAndReferences(projectRoot, courseIds, conceptIds) {
  const failures = [];
  const imageRoot = path.join(projectRoot, 'assets', 'images', 'vocab');
  for (const filePath of walkFiles(imageRoot)) {
    if (path.extname(filePath).toLowerCase() !== '.png') continue;
    const projectPath = relativeUnix(projectRoot, filePath);
    if (!isCanonicalVocabularyPath(projectPath, courseIds, conceptIds)) {
      failures.push(failure('LEGACY_ASSET', projectPath, 'Vocabulary PNG is outside the canonical Jamaican Patois course/concept set.'));
    }
  }

  const sourceRoot = path.join(projectRoot, 'src');
  for (const filePath of walkFiles(sourceRoot)) {
    if (!LEGACY_SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    const referencePattern = /assets\/images\/vocab\/([a-zA-Z0-9_./-]+\.png)/g;
    let match;
    const seen = new Set();
    while ((match = referencePattern.exec(source))) {
      const referencedPath = `assets/images/vocab/${match[1]}`;
      if (isCanonicalVocabularyPath(referencedPath, courseIds, conceptIds) || seen.has(referencedPath)) continue;
      seen.add(referencedPath);
      failures.push(failure(
        'LEGACY_REFERENCE',
        relativeUnix(projectRoot, filePath),
        `Source still references non-canonical vocabulary asset ${referencedPath}.`,
        { referencedPath }
      ));
    }
  }
  return failures;
}

function auditChapterHero(projectRoot) {
  const failures = [];
  const heroPath = path.join(projectRoot, CHAPTER_HERO_PATH);
  if (!fs.existsSync(heroPath)) {
    failures.push(failure('MISSING_CHAPTER_HERO', CHAPTER_HERO_PATH, 'Workbook chapter hero asset does not exist.'));
  } else {
    let parsed;
    try {
      parsed = parsePng(fs.readFileSync(heroPath));
    } catch (error) {
      failures.push(failure('INVALID_CHAPTER_HERO', CHAPTER_HERO_PATH, error.message));
      return failures;
    }
    const { width, height, bitDepth, colorType } = parsed.header;
    if (bitDepth !== 8 || ![2, 6].includes(colorType) || width < 600 || height < 240 || width <= height) {
      failures.push(failure(
        'INVALID_CHAPTER_HERO',
        CHAPTER_HERO_PATH,
        `Chapter hero must be a landscape 8-bit RGB/RGBA PNG at least 600x240; found ${width}x${height}, color type ${colorType}.`,
        parsed.header
      ));
    }
  }

  const workbookPath = path.join(projectRoot, 'patois_learn_database_1.xlsx');
  if (!fs.existsSync(workbookPath)) {
    failures.push(failure('MISSING_WORKBOOK', 'patois_learn_database_1.xlsx', 'Cannot verify the chapter hero reference without the workbook.'));
    return failures;
  }
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(workbookPath, { cellDates: false });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.chapters || {}, { defval: '' });
    const chapter = rows.find((row) => row.course_id === COURSE_ID);
    if (!chapter) failures.push(failure('MISSING_CHAPTER_ROW', 'patois_learn_database_1.xlsx#chapters', 'Workbook is missing the Jamaican Patois chapter row.'));
    else if (chapter.hero_asset !== CHAPTER_HERO_PATH) {
      failures.push(failure('INVALID_CHAPTER_HERO_REFERENCE', 'patois_learn_database_1.xlsx#chapters', `Expected ${CHAPTER_HERO_PATH}; found ${chapter.hero_asset || '(blank)'}.`));
    }
  } catch (error) {
    failures.push(failure('INVALID_WORKBOOK', 'patois_learn_database_1.xlsx', `Could not verify chapter hero reference: ${error.message}`));
  }
  return failures;
}

function auditProjectImages(projectRoot) {
  const absoluteRoot = path.resolve(projectRoot);
  const contractPath = path.join(absoluteRoot, 'src', 'data', 'curriculumContract.cjs');
  delete require.cache[require.resolve(contractPath)];
  const { CONCEPTS, COURSE_CATALOG } = require(contractPath);
  const expectedIds = CONCEPTS.map((concept) => concept.id);
  const courseIds = COURSE_CATALOG.map((course) => course.id);
  const expectedPaths = new Map(expectedIds.map((id) => [id, `assets/images/vocab/${COURSE_ID}/${id}.png`]));
  const courseDirectory = path.join(absoluteRoot, 'assets', 'images', 'vocab', COURSE_ID);
  const actualFiles = fs.existsSync(courseDirectory)
    ? fs.readdirSync(courseDirectory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png')).map((entry) => entry.name).sort()
    : [];
  const failures = [];

  if (expectedIds.length !== 39) failures.push(failure('CONCEPT_COUNT_MISMATCH', 'src/data/curriculumContract.cjs', `Expected exactly 39 concepts, found ${expectedIds.length}.`));
  const expectedFiles = new Set(expectedIds.map((id) => `${id}.png`));
  failures.push(...compareConceptImageFiles(expectedIds, actualFiles, relativeUnix(absoluteRoot, courseDirectory)));
  for (const id of expectedIds) {
    const filename = `${id}.png`;
    const projectPath = expectedPaths.get(id);
    if (!actualFiles.includes(filename)) continue;
    const imageAudit = auditPngBuffer(fs.readFileSync(path.join(courseDirectory, filename)), {
      label: projectPath,
      expectedWidth: EXPECTED_VOCAB_SIZE,
      expectedHeight: EXPECTED_VOCAB_SIZE,
    });
    failures.push(...imageAudit.failures);
  }

  failures.push(...auditVocabularyRows(absoluteRoot, expectedIds, expectedPaths));
  failures.push(...auditRegistry(absoluteRoot, expectedIds, expectedPaths));
  failures.push(...auditChapterHero(absoluteRoot));
  failures.push(...auditLegacyFilesAndReferences(absoluteRoot, courseIds, expectedIds));

  return {
    ok: failures.length === 0,
    failures,
    summary: {
      courseId: COURSE_ID,
      expectedConceptCount: expectedIds.length,
      vocabPngCount: actualFiles.length,
      auditedPngCount: actualFiles.filter((filename) => expectedFiles.has(filename)).length,
      failureCount: failures.length,
    },
  };
}

function formatAuditReport(result) {
  const status = result.ok ? 'PASSED' : 'FAILED';
  const lines = [
    `Jamaican Patois image audit: ${status}`,
    '===================================',
    `Expected concepts: ${result.summary.expectedConceptCount}`,
    `Canonical PNGs found: ${result.summary.vocabPngCount}`,
    `Canonical PNGs audited: ${result.summary.auditedPngCount}`,
    `Failures: ${result.failures.length}`,
  ];
  if (result.failures.length) {
    lines.push('', 'Failure details:');
    result.failures.forEach((item, index) => {
      lines.push(`${String(index + 1).padStart(3, ' ')}. [${item.code}] ${item.target}: ${item.message}`);
    });
  } else {
    lines.push('', 'All canonical vocabulary PNGs, static references, and the chapter hero passed.');
  }
  return lines.join('\n');
}

module.exports = {
  CHAPTER_HERO_PATH,
  EXPECTED_VOCAB_SIZE,
  auditPngBuffer,
  auditProjectImages,
  auditRegistry,
  compareConceptImageFiles,
  formatAuditReport,
  isCanonicalVocabularyPath,
};
