const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const projectRoot = path.join(__dirname, '..');
const authScreens = [
  'LoginScreen.js',
  'SignUpScreen.js',
  'AccountChoiceScreen.js',
  'ForgotPasswordScreen.js',
  'EmailVerificationScreen.js',
];

test('the auth handoff screens share the light onboarding shell instead of the retired regional dark shell', () => {
  authScreens.forEach((screenName) => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'src', 'screens', screenName),
      'utf8'
    );

    assert.match(
      source,
      /AuthScreenFrame/,
      `${screenName} should render inside the shared auth shell`
    );
    assert.doesNotMatch(
      source,
      /RegionalGuide/,
      `${screenName} should not depend on the retired RegionalGuide artwork`
    );
    assert.doesNotMatch(
      source,
      /colors\.skyTop|colors\.skyBottom/,
      `${screenName} should not pull the auth background from the old dark sky gradient`
    );
  });
});
