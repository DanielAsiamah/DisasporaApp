const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const { auditMp3Buffer } = require('../scripts/lib/audit-mp3.cjs');
const {
  validateTargetAudioFiles,
} = require('../scripts/lib/course-candidate-staging.cjs');

function syntheticMp3(frameCount = 12) {
  const frameLength = 417;
  const frame = Buffer.alloc(frameLength);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x00;
  return Buffer.concat(Array.from({ length: frameCount }, () => frame));
}

test('MP3 audit accepts a multi-frame MPEG stream and rejects arbitrary or truncated bytes', () => {
  const valid = auditMp3Buffer(syntheticMp3());
  assert.deepEqual(valid.failures, []);
  assert.ok(valid.frameCount >= 10);
  assert.ok(valid.durationSeconds > 0.2);

  assert.match(
    auditMp3Buffer(Buffer.from('not really an mp3')).failures.join('\n'),
    /MP3|frame|small/i
  );
  assert.match(
    auditMp3Buffer(syntheticMp3(1)).failures.join('\n'),
    /duration|frames|truncated/i
  );
});

test('candidate staging validates both the manifest hash and decodable MP3 structure', () => {
  const validBytes = syntheticMp3();
  const validEntry = {
    conceptId: 'yes',
    filename: 'assets/audio/swahili/yes.mp3',
    fileSha256: crypto.createHash('sha256').update(validBytes).digest('hex'),
  };
  assert.deepEqual(validateTargetAudioFiles([validEntry], {
    projectRoot: '.',
    existsSync: () => true,
    readFileSync: () => validBytes,
  }), []);

  const invalidBytes = Buffer.from('plain text with a matching hash');
  const invalidEntry = {
    ...validEntry,
    fileSha256: crypto.createHash('sha256').update(invalidBytes).digest('hex'),
  };
  assert.match(validateTargetAudioFiles([invalidEntry], {
    projectRoot: '.',
    existsSync: () => true,
    readFileSync: () => invalidBytes,
  }).join('\n'), /MP3|frame|small/i);
});
