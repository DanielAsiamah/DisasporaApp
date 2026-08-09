const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const projectRoot = path.join(__dirname, '..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('legacy entry surfaces keep the approved light Diaspora shell instead of the retired dark splash shell', () => {
  const splashSource = readProjectFile('src/screens/SplashScreen.js');
  const languageSource = readProjectFile('src/screens/LanguageSelectScreen.js');
  const courseSource = readProjectFile('src/screens/CourseSelectScreen.js');
  const appSource = readProjectFile('App.js');

  assert.match(
    splashSource,
    /Languages carry us home/,
    'SplashScreen should tell the current Diaspora story'
  );
  assert.doesNotMatch(
    splashSource,
    /coming soon|The Americas|more coming soon/,
    'SplashScreen should not advertise the retired coming-soon regions'
  );
  assert.doesNotMatch(
    splashSource,
    /colors\.splash|colors\.splashGreen|colors\.splashWarm/,
    'SplashScreen should not use the retired dark splash palette'
  );

  [languageSource, courseSource].forEach((source, index) => {
    const screenName = index === 0 ? 'LanguageSelectScreen' : 'CourseSelectScreen';
    assert.match(
      source,
      /AUTH_PALETTE/,
      `${screenName} should use the shared light onboarding palette`
    );
    assert.doesNotMatch(
      source,
      /colors\.splashGreen|colors\.skyTop|colors\.skyBottom/,
      `${screenName} should not use the retired dark gradient`
    );
  });

  assert.doesNotMatch(
    languageSource,
    /disabled:\s*true/,
    'LanguageSelectScreen should not keep Arabic disabled now that Arabic is part of the approved onboarding flow'
  );

  assert.doesNotMatch(
    appSource,
    /backgroundColor:\s*colors\.splash/,
    'App loading and profile-error surfaces should not fall back to the retired dark splash background'
  );
});
