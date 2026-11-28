'use strict';

// Preview alignments pending native review.
module.exports = {
  igbo_u01_02_good_morning: ['Ụtụtụ|ọma', 'good|morning', [1, 0]],
  igbo_u01_03_good_afternoon: ['Ehihie|ọma', 'good|afternoon', [1, 0]],
  igbo_u01_04_good_evening: ['Mgbede|ọma', 'good|evening', [1, 0]],

  // The intake gloss is “Later we will see”. English supplies the object “you”.
  // Harvard ELIAS, Igbo unit 15, “Making Plans for the Future”, gives ga-ahu and Anyi ga-ata.
  igbo_u01_07_see_you_later: ['Emesia|anyi|gā|ahu', 'see|you|later', [2, null, null, 0]],

  // Nwosu & Lawal, “A Speech Act Study of Salutation in Igbo and English Languages”, p. 27.
  // In this reply m is the first-person subject and follows the verb.
  igbo_u01_10_i_am_fine: ['adị|m|mma', 'I|am|fine', [1, 0, 2]],

  // Nkọwa okwu (https://nkowaokwu.com/word?word=zute) gives the verb “meet”.
  // The English greeting compresses the whole opening Ọ dị mma into “nice”.
  igbo_u01_12_nice_to_meet_you: ['Ọ dị mma|izute|gị', 'nice|to meet|you'],
};

// Nkọwa okwu (https://nkowaokwu.com/word?word=gi%CC%A3ni%CC%A3) glosses Gịnị na-eme
// as “What is happening?”. The preview’s “what's up” works as a whole greeting.
