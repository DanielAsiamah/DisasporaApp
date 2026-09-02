const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPhoneVerificationReport,
  createPhoneVerificationReportPath,
} = require('../scripts/lib/phone-verification-report.cjs');

test('phone verification report scaffolds run metadata without copying secrets', () => {
  const report = buildPhoneVerificationReport({
    template: [
      '# Diaspora Phone Verification Template',
      '',
      '- Date:',
      '- Device:',
      '- iOS version:',
      '- App runtime:',
      '- Expo command:',
      '- Local URL:',
      '- Branch:',
      '- Commit:',
      '- Tester:',
      '- [ ] `npm run env:check` passes.',
      '- [ ] `npx expo export --platform ios --output-dir outputs/verify-transfer` produces `outputs/verify-transfer/metadata.json`.',
    ].join('\n'),
    metadata: {
      date: '2026-09-02 10:42:12 BST',
      device: 'iPhone 15',
      iosVersion: 'iOS 26.0',
      appRuntime: 'development build',
      expoCommand: 'npx expo start --lan --clear',
      localUrl: 'http://192.168.1.10:8081',
      branch: 'codex/implementation-plan',
      commit: 'b31b3e8c0333535f1b7c38579ca136d981d9d4f2',
      tester: 'Daniel',
      exportMetadata: 'outputs/verify-transfer/metadata.json (16458 bytes, 2026-09-02 10:42:12 BST)',
    },
    envValues: {
      EXPO_PUBLIC_FIREBASE_API_KEY: 'AIza-secret-value',
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'secret-client.apps.googleusercontent.com',
    },
  });

  assert.match(report, /- Date: 2026-09-02 10:42:12 BST/);
  assert.match(report, /- Device: iPhone 15/);
  assert.match(report, /- Branch: codex\/implementation-plan/);
  assert.match(report, /- Commit: b31b3e8c0333535f1b7c38579ca136d981d9d4f2/);
  assert.match(report, /- Export metadata: outputs\/verify-transfer\/metadata\.json \(16458 bytes, 2026-09-02 10:42:12 BST\)/);
  assert.doesNotMatch(report, /AIza-secret-value/);
  assert.doesNotMatch(report, /secret-client\.apps\.googleusercontent\.com/);
});

test('phone verification report path is deterministic for a commit and date', () => {
  assert.equal(
    createPhoneVerificationReportPath({
      commit: 'b31b3e8c0333535f1b7c38579ca136d981d9d4f2',
      date: '2026-09-02 10:42:12 BST',
      outputDir: 'outputs/phone-verification',
    }),
    'outputs/phone-verification/phone-verification-2026-09-02-b31b3e8.md'
  );
});
