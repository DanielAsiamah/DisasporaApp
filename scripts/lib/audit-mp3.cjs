const MPEG1_LAYER3_BITRATES = Object.freeze([
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
]);
const MPEG2_LAYER3_BITRATES = Object.freeze([
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
]);
const SAMPLE_RATES = Object.freeze({
  3: Object.freeze([44100, 48000, 32000]),
  2: Object.freeze([22050, 24000, 16000]),
  0: Object.freeze([11025, 12000, 8000]),
});

function parseFrameHeader(buffer, offset) {
  if (offset < 0 || offset + 4 > buffer.length) return null;
  const byte1 = buffer[offset];
  const byte2 = buffer[offset + 1];
  const byte3 = buffer[offset + 2];
  if (byte1 !== 0xff || (byte2 & 0xe0) !== 0xe0) return null;

  const versionBits = (byte2 >> 3) & 0x03;
  const layerBits = (byte2 >> 1) & 0x03;
  if (versionBits === 1 || layerBits !== 1) return null;
  const bitrateIndex = (byte3 >> 4) & 0x0f;
  const sampleRateIndex = (byte3 >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const sampleRate = SAMPLE_RATES[versionBits]?.[sampleRateIndex];
  const bitrateKbps = (
    versionBits === 3 ? MPEG1_LAYER3_BITRATES : MPEG2_LAYER3_BITRATES
  )[bitrateIndex];
  if (!sampleRate || !bitrateKbps) return null;
  const padding = (byte3 >> 1) & 0x01;
  const frameLength = Math.floor(
    ((versionBits === 3 ? 144 : 72) * bitrateKbps * 1000) / sampleRate
  ) + padding;
  if (frameLength < 24 || offset + frameLength > buffer.length) return null;
  return Object.freeze({
    bitrateKbps,
    frameLength,
    sampleRate,
    samplesPerFrame: versionBits === 3 ? 1152 : 576,
  });
}

function id3v2Length(buffer) {
  if (
    buffer.length < 10
    || buffer.subarray(0, 3).toString('ascii') !== 'ID3'
  ) return 0;
  const sizeBytes = [...buffer.subarray(6, 10)];
  if (sizeBytes.some((value) => value & 0x80)) return 0;
  const payloadSize = sizeBytes.reduce((size, value) => (size << 7) | value, 0);
  return 10 + payloadSize;
}

function auditMp3Buffer(value, {
  label = 'Audio file',
  minDurationSeconds = 0.1,
  maxDurationSeconds = 30,
} = {}) {
  const failures = [];
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value || []);
  if (buffer.length < 256) {
    failures.push(`${label} is too small to contain a valid lesson MP3.`);
    return Object.freeze({ failures: Object.freeze(failures), frameCount: 0, durationSeconds: 0 });
  }

  const scanStart = id3v2Length(buffer);
  const scanEnd = Math.min(buffer.length - 4, scanStart + 65536);
  let firstFrameOffset = -1;
  for (let offset = scanStart; offset <= scanEnd; offset += 1) {
    if (parseFrameHeader(buffer, offset)) {
      firstFrameOffset = offset;
      break;
    }
  }
  if (firstFrameOffset < 0) {
    failures.push(`${label} has no valid MPEG Layer III audio frame.`);
    return Object.freeze({ failures: Object.freeze(failures), frameCount: 0, durationSeconds: 0 });
  }

  let offset = firstFrameOffset;
  let frameCount = 0;
  let durationSeconds = 0;
  while (offset + 4 <= buffer.length) {
    const frame = parseFrameHeader(buffer, offset);
    if (!frame) break;
    frameCount += 1;
    durationSeconds += frame.samplesPerFrame / frame.sampleRate;
    offset += frame.frameLength;
  }
  if (frameCount < 3) failures.push(`${label} has too few complete MP3 frames.`);
  if (durationSeconds < minDurationSeconds) {
    failures.push(`${label} MP3 duration is too short (${durationSeconds.toFixed(3)}s).`);
  }
  if (durationSeconds > maxDurationSeconds) {
    failures.push(`${label} MP3 duration is unexpectedly long (${durationSeconds.toFixed(3)}s).`);
  }
  return Object.freeze({
    failures: Object.freeze(failures),
    frameCount,
    durationSeconds,
  });
}

module.exports = {
  auditMp3Buffer,
  parseFrameHeader,
};
