'use strict';

// Preview alignments pending native review.
// Dickins, Khartoum Arabic, pp. 4–6, documents possessive suffixes, da/di and question words.
// https://ahc.leeds.ac.uk/download/downloads/id/387/prof_j_dickins_khartoum_arabic_article.pdf
// The AFCLC Sudan field guide, “Useful Translations”, gives the name question
// and lists minu separately as “who”. It gives the masā greeting for the evening.
// https://www.airuniversity.af.edu/Portals/10/AFCLC/04.%20Ready%20Airman/Field%20Guides/AFRICOM/ECFG%20Sudan_South%20Sudan%202025-1r.pdf?timestamp=1741797477816&ver=QfFLaQIlqbWa8u4LEFTJYg%3D%3D
module.exports = {
  'long-time-no-see': ['زمن|ما شفناك', 'long|time|no see', [1, 2]],
  'how-is-your-day': ['يومك|كيف؟', 'how|is|your day', [2, 0]],
  // يومك includes the addressee as possessor. Only the adjective has a close English match.
  'have-a-good-day': ['يومك|سعيد', 'have|a|good|day', [null, 2]],
  'what-is-your-name': ['اسمك|منو؟', 'what is|your name', [1, null]],

  'i-am-a-student': ['أنا|طالب', 'I|am|a student', [0, 2]],
  'i-am-learning': ['أنا|بتعلم...', 'I|am learning...'],
  'i-speak': ['أنا|بتكلم...', 'I|speak...'],
  'where-are-you-from': ['إنت|من|وين؟', 'where|are|you|from', [2, 3, 0]],
  'i-am-from': ['أنا|من...', 'I|am|from...', [0, 2]],
  // The participle ساكن can describe the speaker or the addressee in these two rows.
  'where-do-you-live': ['ساكن|وين؟', 'where|do|you|live', [3, 0]],
  'i-live-in': ['ساكن|في...', 'I|live|in...', [1, 2]],
  'which-language-do-you-speak': ['بتتكلم|ياتو|لغة؟', 'which|language|do|you speak', [3, 0, 1]],

  'no-problem': ['ما في|مشكلة', 'no|problem'],
  'this-is-my-family': ['دي|أسرتي', 'this|is|my family', [0, 2]],
  'this-is-my-husband': ['دا|زوجي', 'this|is|my husband', [0, 2]],
  'this-is-my-wife': ['دي|زوجتي', 'this|is|my wife', [0, 2]],
  'he-lives-here': ['هو|ساكن|هنا', 'he|lives|here'],
  'she-works-here': ['هي|شغالة|هنا', 'she|works|here'],
  'we-speak': ['نحن|بنتكلم...', 'we|speak...'],
  'they-are-from': ['هم|من...', 'they|are|from...', [0, 2]],
};
