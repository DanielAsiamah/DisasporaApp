const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const authSource = fs.readFileSync(path.join(root, 'src/context/AuthContext.js'), 'utf8');
const homeSource = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');
const lessonSource = fs.readFileSync(
  path.join(root, 'src/components/mvp/PatoisLessonModal.js'),
  'utf8'
);
const serviceSource = fs.readFileSync(
  path.join(root, 'src/services/firestore/userService.js'),
  'utf8'
);

test('Firestore awards a fixed reward once inside a transaction', () => {
  assert.match(serviceSource, /runTransaction/);
  assert.match(serviceSource, /export async function awardCorrectAnswerXpOnce\(uid, rewardFields\)/);
  assert.match(serviceSource, /transaction\.get\(rewardRef\)/);
  assert.match(serviceSource, /rewardExists: rewardSnapshot\.exists\(\)/);
  assert.match(serviceSource, /if \(!rewardPlan\.awarded\)[\s\S]*?return \{ \.\.\.rewardPlan, rewardId \}/s);
  assert.match(serviceSource, /transaction\.set\(rewardRef,[\s\S]*?createdAt: serverTimestamp\(\)/s);
  assert.match(serviceSource, /transaction\.update\(userRef,[\s\S]*?xp: rewardPlan\.xp/s);
});

test('AuthContext keeps reward results account-bound without blocking auth-state delivery', () => {
  const awardBlock = authSource.slice(
    authSource.indexOf('const awardCorrectAnswerXp = useCallback'),
    authSource.indexOf('const value = useMemo')
  );

  assert.match(authSource, /awardCorrectAnswerXpOnce/);
  assert.match(authSource, /const awardCorrectAnswerXp = useCallback/);
  assert.match(awardBlock, /runAuthBoundXpAward/);
  assert.match(awardBlock, /getCurrentUserId: \(\) => authenticatedUserRef\.current\?\.uid \|\| null/);
  assert.doesNotMatch(awardBlock, /beginExclusive/);
  assert.match(authSource, /applyLoadedProfileWithoutXpRegression/);
  assert.match(authSource, /awardCorrectAnswerXp,/);
});

test('AuthContext sanitizes every generic progress path before persistence or local display', () => {
  const syncBlock = authSource.slice(
    authSource.indexOf('const syncProgress = useCallback'),
    authSource.indexOf('const loadLanguageProgress = useCallback')
  );

  assert.match(syncBlock, /const safeFields = filterUserProgressFields\(fields\)/);
  assert.match(syncBlock, /const userId = user\.uid/);
  assert.match(syncBlock, /updateUserProgress\(userId, safeFields\)/);
  assert.match(syncBlock, /\{ \.\.\.current, \.\.\.safeFields \}/);
  assert.match(syncBlock, /\.\.\.safeFields/);
  assert.doesNotMatch(syncBlock, /updateUserProgress\(user\.uid, fields\)/);
  assert.doesNotMatch(syncBlock, /\{ \.\.\.current, \.\.\.fields \}/);
  assert.doesNotMatch(serviceSource, /export async function updateUserDocument/);
  assert.match(serviceSource, /xp: DEFAULT_USER_PROFILE\.xp,[\s\S]*?\.\.\.safeProfileFields[\s\S]*?xp: DEFAULT_USER_PROFILE\.xp/s);
  assert.match(syncBlock, /runAuthBoundProfileTask/);
  assert.match(syncBlock, /const getCurrentUserId = \(\) => authenticatedUserRef\.current\?\.uid \|\| null/);
});

test('every explicit authentication handoff rejects a superseded account result', () => {
  const signUpBlock = authSource.slice(
    authSource.indexOf('const signUp = useCallback'),
    authSource.indexOf('const signIn = useCallback')
  );
  const signInBlock = authSource.slice(
    authSource.indexOf('const signIn = useCallback'),
    authSource.indexOf('const finishSocialSignIn = useCallback')
  );
  const socialBlock = authSource.slice(
    authSource.indexOf('const finishSocialSignIn = useCallback'),
    authSource.indexOf('const signInWithGoogle = useCallback')
  );

  for (const block of [signUpBlock, signInBlock, socialBlock]) {
    assert.match(block, /assertCurrentAuthHandoff/);
  }
  assert.match(authSource, /const checkEmailVerification = useCallback[\s\S]*?runAuthBoundProfileTask/s);
});

test('the lesson uses a stable per-attempt reward and never claims XP before persistence succeeds', () => {
  assert.match(lessonSource, /Crypto\.randomUUID\(\)/);
  assert.match(lessonSource, /buildCorrectAnswerRewardId/);
  assert.match(lessonSource, /onAwardCorrectAnswerXp/);
  assert.match(lessonSource, /setXpAwardStatus\(['"]pending['"]\)/);
  assert.match(lessonSource, /result\?\.awarded \? ['"]awarded['"] : ['"]already-awarded['"]/);
  assert.match(lessonSource, /result\?\.currentAccount === false/);
  assert.doesNotMatch(lessonSource, /return correct[\s\S]*?Correct\. \+10 XP\./s);
  assert.match(lessonSource, /xpAwardStatus === ['"]awarded['"][\s\S]*?Correct! \+10 XP/s);
  assert.match(lessonSource, /XP could not be saved/);
  assert.match(lessonSource, /isRetryableXpAwardError\(error\)/);
  assert.match(lessonSource, /setXpAwardStatus\(retryable \? ['"]error['"] : ['"]unavailable['"]\)/);
  assert.match(lessonSource, /function retryXpAward\(\)[\s\S]*?saveCorrectAnswerXp\(pendingXpReward\.current\)/s);
  assert.match(lessonSource, /const footerReady = ready && !xpAwardPending/);
  assert.match(lessonSource, /disabled=\{!footerReady\}/);
});

test('the authenticated shell passes the real award operation into every lesson', () => {
  assert.match(homeSource, /awardCorrectAnswerXp/);
  assert.match(homeSource, /onAwardCorrectAnswerXp=\{awardCorrectAnswerXp\}/);
  assert.match(homeSource, /useEffect\(\(\) => \{\s*setActiveTopic\(null\);\s*\}, \[user\?\.uid\]\)/s);
  assert.match(homeSource, /key=\{user\?\.uid \|\| ['"]signed-out['"]\}/);
});
