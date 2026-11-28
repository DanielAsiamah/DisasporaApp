'use strict';

// Draft preview alignments pending native review.
module.exports = {
  // KIKO's unit 1 glossary gives habari as “news” and mchana as “afternoon”.
  // https://africa.uga.edu/Kiswahili/doe/unit_01/glossary.html
  'good-afternoon': ['Habari ya|mchana', 'good|afternoon', [null, 1]],
  'nice-to-meet-you': ['Nimefurahi|kukutana|nawe', 'nice|to meet|you', [null, 1, 2]],
  'long-time-no-see': ['Hatujaonana|kwa|muda|mrefu', 'long|time|no see', [2, null, 1, 0]],

  // Almasi, Fallon & Wared, Swahili Grammar for Introductory and Intermediate
  // Levels, pp. 162–163, 175–176. The verb carries -je “how”. Uwe na expresses a wish.
  'how-is-your-day': ['Siku|yako|inaendeleaje?', 'how is|your|day', [2, 1, 0]],
  'have-a-good-day': ['Uwe na|siku|njema', 'have|a|good|day', [0, 3, 2]],

  // KIKO gives this name question and its answer. Keep ni nani together here.
  // https://africa.uga.edu/Kiswahili/doe/unit_01/expressionsunit1.htm
  'what-is-your-name': ['Jina|lako|ni nani?', 'what is|your|name', [2, 1, 0]],
  'my-name-is': ['Jina|langu|ni...', 'my|name|is...', [1, 0, 2]],
  'i-am-a-student': ['Mimi|ni|mwanafunzi', 'I|am|a student'],
  'where-are-you-from': ['Unatoka|wapi?', 'where|are you from', [1, 0]],
  'where-do-you-live': ['Unaishi|wapi?', 'where|do you live', [1, 0]],
  'which-language-do-you-speak': ['Unazungumza|lugha|gani?', 'which|language|do you speak', [2, 1, 0]],
  'no-problem': ['Hakuna|shida', 'no|problem'],
  'this-is-my-family': ['Hii|ni|familia|yangu', 'this|is|my|family', [0, 1, 3, 2]],
  'this-is-my-husband': ['Huyu|ni|mume|wangu', 'this|is|my|husband', [0, 1, 3, 2]],
  'this-is-my-wife': ['Huyu|ni|mke|wangu', 'this|is|my|wife', [0, 1, 3, 2]],

  // The workbook supplies the gender in English. Both verbs have the same subject prefix.
  'he-lives-here': ['Anaishi|hapa', 'he lives|here'],
  'she-works-here': ['Anafanya kazi|hapa', 'she works|here'],
};
