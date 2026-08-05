const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const {
  buildVerifiedReleaseRecord,
  serializeVerifiedCourseReleases,
} = require('../scripts/lib/verified-release-registry.cjs');

const root = path.resolve(__dirname, '..');
const CANDIDATE_DIGEST = 'c'.repeat(64);
const COURSE_CONTENT_SHA256 = 'b'.repeat(64);

test('verified release records can be built only from the fully approved candidate', () => {
  const approval = {
    candidateDigest: CANDIDATE_DIGEST,
    sourceWorkbookSha256: 'a'.repeat(64),
    publicationApproval: {
      status: 'approved',
      candidateDigest: CANDIDATE_DIGEST,
      approvedBy: 'Daniel',
      approvedAt: '2026-07-21T12:30:00Z',
    },
  };
  const record = buildVerifiedReleaseRecord({
    courseId: 'swahili',
    approval,
    report: {
      ready: true,
      courseId: 'swahili',
      courseContentSha256: COURSE_CONTENT_SHA256,
    },
  });

  assert.deepEqual(record, {
    candidateDigest: CANDIDATE_DIGEST,
    sourceWorkbookSha256: 'a'.repeat(64),
    courseContentSha256: COURSE_CONTENT_SHA256,
    approvedBy: 'Daniel',
    approvedAt: '2026-07-21T12:30:00Z',
  });
  assert.equal(Object.isFrozen(record), true);
  assert.throws(
    () => buildVerifiedReleaseRecord({
      courseId: 'swahili',
      approval,
      report: {
        ready: false,
        courseId: 'swahili',
        courseContentSha256: COURSE_CONTENT_SHA256,
      },
    }),
    /complete release gate/i
  );
});

test('verified release registry serialization is deterministic and contains no fallback release', () => {
  const source = serializeVerifiedCourseReleases({
    swahili: {
      candidateDigest: CANDIDATE_DIGEST,
      sourceWorkbookSha256: 'a'.repeat(64),
      courseContentSha256: COURSE_CONTENT_SHA256,
      approvedBy: 'Daniel',
      approvedAt: '2026-07-21T12:30:00Z',
    },
  });

  assert.match(source, /const VERIFIED_COURSE_RELEASES = Object\.freeze\(/);
  assert.match(source, /"swahili"/);
  assert.match(source, new RegExp(CANDIDATE_DIGEST));
  assert.match(source, new RegExp(COURSE_CONTENT_SHA256));
  assert.match(source, /hasVerifiedCourseRelease/);
  assert.doesNotMatch(source, /jamaican-patois/);
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(source, sandbox);
  assert.equal(
    sandbox.module.exports.hasVerifiedCourseRelease('swahili', COURSE_CONTENT_SHA256),
    true
  );
  assert.equal(
    sandbox.module.exports.hasVerifiedCourseRelease('swahili', 'd'.repeat(64)),
    false
  );
  assert.equal(sandbox.module.exports.hasVerifiedCourseRelease('swahili'), false);
  assert.equal(sandbox.module.exports.hasVerifiedCourseRelease('jamaican-patois'), false);
  assert.equal(
    sandbox.module.exports.VERIFIED_COURSE_RELEASES.swahili.candidateDigest,
    CANDIDATE_DIGEST
  );
  assert.equal(source, serializeVerifiedCourseReleases({
    swahili: {
      approvedAt: '2026-07-21T12:30:00Z',
      approvedBy: 'Daniel',
      courseContentSha256: COURSE_CONTENT_SHA256,
      sourceWorkbookSha256: 'a'.repeat(64),
      candidateDigest: CANDIDATE_DIGEST,
    },
  }));
});

test('verified release records reject malformed digests and missing per-course content identity', () => {
  const approval = {
    candidateDigest: 'not-a-sha',
    sourceWorkbookSha256: 'a'.repeat(64),
    publicationApproval: {
      status: 'approved',
      candidateDigest: 'not-a-sha',
      approvedBy: 'Daniel',
      approvedAt: '2026-07-21T12:30:00Z',
    },
  };

  assert.throws(() => buildVerifiedReleaseRecord({
    courseId: 'swahili',
    approval,
    report: { ready: true, courseId: 'swahili', courseContentSha256: '' },
  }), /SHA-256|content identity/i);
});

test('publication command is check-only by default and needs two explicit apply flags', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const source = fs.readFileSync(path.join(root, 'scripts', 'publish-course.js'), 'utf8');

  assert.equal(
    pkg.scripts['release:swahili:publish-check'],
    'node scripts/publish-course.js --course swahili --approval content/release-approvals/swahili.json'
  );
  assert.doesNotMatch(pkg.scripts['release:swahili:publish-check'], /--apply|--confirm-publication/);
  assert.match(source, /--apply/);
  assert.match(source, /--confirm-publication/);
  assert.match(source, /buildCourseReleaseReport/);
  assert.match(source, /report\.ready/);
  assert.match(source, /serializeVerifiedCourseReleases/);
  assert.match(
    source,
    /if\s*\(\s*!staged\s*\)\s*process\.exitCode\s*=\s*2/,
    'check-only publication must fail CI when the approved candidate is not staged'
  );
});
