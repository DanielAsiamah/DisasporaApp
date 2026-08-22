const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const policyPath = path.join(__dirname, '../src/lessonEngine/userProgressPolicy.cjs');

test('generic profile progress updates cannot bypass the XP reward ledger', () => {
  assert.equal(fs.existsSync(policyPath), true, 'the generic progress policy must exist');
  const { filterUserProgressFields } = require(policyPath);
  assert.deepEqual(
    filterUserProgressFields({
      dailyGoalMinutes: 10,
      emailVerified: true,
      preferredName: 'Daniel',
      xp: 999999,
    }),
    {
      dailyGoalMinutes: 10,
      emailVerified: true,
      preferredName: 'Daniel',
    }
  );
});
