const zlib = require('node:zlib');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let crcTable;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
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

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function paeth(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function parseRgbaPng(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Expected a PNG buffer.');
  }

  let offset = 8;
  let header;
  const imageData = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (!header || !imageData.length) throw new Error('PNG is missing required image chunks.');
  if (header.bitDepth !== 8 || header.colorType !== 6 || header.interlace !== 0) {
    throw new Error('Only non-interlaced 8-bit RGBA PNGs are supported.');
  }

  const bytesPerPixel = 4;
  const rowBytes = header.width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(imageData));
  if (inflated.length !== header.height * (rowBytes + 1)) {
    throw new Error('PNG pixel stream has an unexpected length.');
  }

  const pixels = Buffer.alloc(header.width * header.height * bytesPerPixel);
  let sourceOffset = 0;
  for (let y = 0; y < header.height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * rowBytes;
    for (let byte = 0; byte < rowBytes; byte += 1) {
      const raw = inflated[sourceOffset + byte];
      const left = byte >= bytesPerPixel ? pixels[rowOffset + byte - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[rowOffset + byte - rowBytes] : 0;
      const upperLeft = y > 0 && byte >= bytesPerPixel
        ? pixels[rowOffset + byte - rowBytes - bytesPerPixel]
        : 0;
      let value;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + above;
      else if (filter === 3) value = raw + Math.floor((left + above) / 2);
      else if (filter === 4) value = raw + paeth(left, above, upperLeft);
      else throw new Error(`Unsupported PNG filter ${filter}.`);
      pixels[rowOffset + byte] = value & 0xff;
    }
    sourceOffset += rowBytes;
  }

  return { width: header.width, height: header.height, pixels };
}

function encodeRgbaPng({ width, height, pixels }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('PNG dimensions must be positive integers.');
  }
  const source = Buffer.from(pixels);
  if (source.length !== width * height * 4) throw new Error('RGBA pixel buffer has an invalid length.');

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    scanlines[rowOffset] = 0;
    source.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function visibleBounds(pixels, width, height, alphaThreshold = 0) {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] <= alphaThreshold) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;
  return { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function isLooseChromaKey(red, green, blue, keyMode = 'both') {
  const magenta = red >= 40 && blue >= 30 && red - green >= 20 && blue - green >= 10;
  const greenKey = green >= 160 && red <= 145 && blue <= 145
    && green - red >= 55 && green - blue >= 55;
  if (keyMode === 'magenta') return magenta;
  if (keyMode === 'green') return greenKey;
  return magenta || greenKey;
}

function hasTransparentPixelNearby(pixels, width, height, x, y, radius) {
  for (let sampleY = Math.max(0, y - radius); sampleY <= Math.min(height - 1, y + radius); sampleY += 1) {
    for (let sampleX = Math.max(0, x - radius); sampleX <= Math.min(width - 1, x + radius); sampleX += 1) {
      if (pixels[(sampleY * width + sampleX) * 4 + 3] === 0) return true;
    }
  }
  return false;
}

function nearestCleanSubjectPixel(pixels, width, height, x, y, radius, keyMode) {
  let best = null;
  for (let sampleY = Math.max(0, y - radius); sampleY <= Math.min(height - 1, y + radius); sampleY += 1) {
    for (let sampleX = Math.max(0, x - radius); sampleX <= Math.min(width - 1, x + radius); sampleX += 1) {
      const offset = (sampleY * width + sampleX) * 4;
      const alpha = pixels[offset + 3];
      if (alpha === 0 || isLooseChromaKey(pixels[offset], pixels[offset + 1], pixels[offset + 2], keyMode)) continue;
      const distance = (sampleX - x) ** 2 + (sampleY - y) ** 2;
      const score = distance * 256 - alpha;
      if (!best || score < best.score) best = { offset, score };
    }
  }
  return best?.offset ?? null;
}

function decontaminateChromaEdges({ width, height, pixels }, options = {}) {
  const edgeRadius = options.edgeRadius || 4;
  const searchRadius = options.searchRadius || 10;
  const keyMode = options.keyMode || 'both';
  const source = Buffer.from(pixels);
  const output = Buffer.from(pixels);
  let repairedPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (source[offset + 3] === 0) continue;
      if (!isLooseChromaKey(source[offset], source[offset + 1], source[offset + 2], keyMode)) continue;
      if (!hasTransparentPixelNearby(source, width, height, x, y, edgeRadius)) continue;
      const replacementOffset = nearestCleanSubjectPixel(source, width, height, x, y, searchRadius, keyMode);
      if (replacementOffset === null) continue;
      output[offset] = source[replacementOffset];
      output[offset + 1] = source[replacementOffset + 1];
      output[offset + 2] = source[replacementOffset + 2];
      repairedPixels += 1;
    }
  }

  return { width, height, pixels: output, repairedPixels };
}

function featherVisibleAlphaEdges({ width, height, pixels }, options = {}) {
  const radius = options.radius || 2;
  const source = Buffer.from(pixels);
  const output = Buffer.from(pixels);
  let featheredPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alphaOffset = (y * width + x) * 4 + 3;
      if (source[alphaOffset] === 0) continue;
      let minimumDistanceSquared = Number.POSITIVE_INFINITY;
      for (let sampleY = Math.max(0, y - radius); sampleY <= Math.min(height - 1, y + radius); sampleY += 1) {
        for (let sampleX = Math.max(0, x - radius); sampleX <= Math.min(width - 1, x + radius); sampleX += 1) {
          if (source[(sampleY * width + sampleX) * 4 + 3] !== 0) continue;
          const distanceSquared = (sampleX - x) ** 2 + (sampleY - y) ** 2;
          minimumDistanceSquared = Math.min(minimumDistanceSquared, distanceSquared);
        }
      }
      if (!Number.isFinite(minimumDistanceSquared)) continue;
      const distance = Math.sqrt(minimumDistanceSquared);
      const featheredAlpha = Math.round(255 * Math.min(1, distance / (radius + 0.5)));
      const nextAlpha = Math.min(source[alphaOffset], featheredAlpha);
      if (nextAlpha !== source[alphaOffset]) {
        output[alphaOffset] = nextAlpha;
        featheredPixels += 1;
      }
    }
  }

  return { width, height, pixels: output, featheredPixels };
}

function samplePremultiplied(pixels, width, height, x, y) {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  const offset = (clampedY * width + clampedX) * 4;
  const alpha = pixels[offset + 3] / 255;
  return [pixels[offset] * alpha, pixels[offset + 1] * alpha, pixels[offset + 2] * alpha, alpha];
}

function bilinearPixel(pixels, width, height, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const samples = [
    [samplePremultiplied(pixels, width, height, x0, y0), (1 - fx) * (1 - fy)],
    [samplePremultiplied(pixels, width, height, x1, y0), fx * (1 - fy)],
    [samplePremultiplied(pixels, width, height, x0, y1), (1 - fx) * fy],
    [samplePremultiplied(pixels, width, height, x1, y1), fx * fy],
  ];
  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  for (const [sample, weight] of samples) {
    red += sample[0] * weight;
    green += sample[1] * weight;
    blue += sample[2] * weight;
    alpha += sample[3] * weight;
  }
  if (alpha <= 0) return [0, 0, 0, 0];
  return [
    Math.max(0, Math.min(255, Math.round(red / alpha))),
    Math.max(0, Math.min(255, Math.round(green / alpha))),
    Math.max(0, Math.min(255, Math.round(blue / alpha))),
    Math.max(0, Math.min(255, Math.round(alpha * 255))),
  ];
}

function normalizeRgbaPng(buffer, options = {}) {
  const canvasSize = options.canvasSize || 1254;
  const subjectSpan = options.subjectSpan || 1100;
  if (!Number.isInteger(canvasSize) || !Number.isInteger(subjectSpan)
    || canvasSize <= 0 || subjectSpan <= 0 || subjectSpan > canvasSize) {
    throw new Error('canvasSize and subjectSpan must be positive integers with subjectSpan <= canvasSize.');
  }

  const source = parseRgbaPng(buffer);
  const bounds = visibleBounds(source.pixels, source.width, source.height);
  if (!bounds) throw new Error('Cannot normalize a fully transparent image.');

  const scale = Math.min(subjectSpan / bounds.width, subjectSpan / bounds.height);
  const targetWidth = Math.max(1, Math.round(bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(bounds.height * scale));
  const left = Math.floor((canvasSize - targetWidth) / 2);
  const top = Math.floor((canvasSize - targetHeight) / 2);
  const output = Buffer.alloc(canvasSize * canvasSize * 4);

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = bounds.top + ((y + 0.5) / targetHeight) * bounds.height - 0.5;
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = bounds.left + ((x + 0.5) / targetWidth) * bounds.width - 0.5;
      output.set(
        bilinearPixel(source.pixels, source.width, source.height, sourceX, sourceY),
        ((top + y) * canvasSize + left + x) * 4
      );
    }
  }

  return encodeRgbaPng({ width: canvasSize, height: canvasSize, pixels: output });
}

module.exports = {
  decontaminateChromaEdges,
  encodeRgbaPng,
  featherVisibleAlphaEdges,
  normalizeRgbaPng,
  parseRgbaPng,
  visibleBounds,
};
