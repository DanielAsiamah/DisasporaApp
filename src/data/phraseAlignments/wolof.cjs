'use strict';

// Draft preview alignments pending native review.
// Peace Corps Senegal, Aay Naa Ci Wolof!, chs. 1–5 (greetings, questions, pronouns).
// https://publish.illinois.edu/wolof201fall14/files/2014/08/NEW_WOLOF_BOOK.pdf
module.exports = {
  'long-time-no-see': ['Yàgg nañu|gisul', 'long time|no see'],
  'how-is-your-day': ['Naka|sa|bés|bi?', 'how|is|your|day', [0, 2, 3, null]],
  'i-am-a-student': ['Damaa di|jàngkat', 'I am|a student'],
  'i-am-learning': ['Maa ngi|jàng...', 'I am|learning...'],
  'i-speak': ['Maa ngi|wax...', 'I|speak...'],
  'where-are-you-from': ['Fan|nga jógé?', 'where|are you from'],
  'i-am-from': ['Maa ngi|jógé...', 'I|am from...'],
  'where-do-you-live': ['Fan|nga|dëkk?', 'where|do|you|live', [0, 2, 3]],
  'i-live-in': ['Maa ngi|dëkk...', 'I|live in...'],
  'which-language-do-you-speak': ['Ban|làkk|nga|wax?', 'which|language|do|you|speak', [0, 1, 3, 4]],

  // Amul carries the negation. Solo means “importance” (Bondéelle & Kahane, ex. 20c).
  // https://kahane.fr/wp-content/uploads/2021/02/wolof-bsl_ob-sk.pdf
  'no-problem': ['Amul|solo', 'no|problem', [0, null]],
  'excuse-me': ['Baal|ma', 'excuse|me'],

  // Final la links a person or thing to a noun predicate in these introductions.
  // Wolof treebank grammar, “Copular constructions”. https://universaldependencies.org/wo/
  'this-is-my-family': ['Lii|sama|njaboot|la', 'this|is|my|family', [0, 2, 3, 1]],
  'this-is-my-husband': ['Kii|sama|jekker|la', 'this|is|my|husband', [0, 2, 3, 1]],
  'this-is-my-wife': ['Kii|sama|jabar|la', 'this|is|my|wife', [0, 2, 3, 1]],

  // Kii points to a person of either gender. Here la marks focus on fii.
  'he-lives-here': ['Kii|fii|la|dekk', 'he|lives|here', [null, 2, null, 1]],
  'she-works-here': ['Kii|fii|la|liggéey', 'she|works|here', [null, 2, null, 1]],
  'we-speak': ['Nun|danuy|wax...', 'we|speak...', [0, null, 1]],
  'they-are-from': ['Ñoom|dañu|jógé...', 'they|are from...', [0, null, 1]],
};
