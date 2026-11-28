'use strict';

// Preview alignments pending native review.
// Kreyòl pale, chs. 1, 4 and 10, gives the rele naming formulas, noun–possessor
// order and ki kote questions. https://ufdcimages.uflib.ufl.edu/AA/00/11/49/40/00001/KreyolPale_9781944455323_UA.pdf
// For li, short m and progressive ap, see the pronoun and verb tables at
// https://web.mit.edu/D-Lab/Website%20Redo/haiti/creole_grammar.pdf
module.exports = {
  'good-afternoon': ['Bon|apremidi', 'good|afternoon'],
  'nice-to-meet-you': ['Mwen kontan|rankontre|ou', 'nice|to meet|you', [null, 1, 2]],
  'long-time-no-see': ['Sa fè|lontan|nou|pa|wè', 'long time|no|see', [null, 0, null, 1, 2]],
  'how-is-your-day': ['Kijan|jounen|ou|ye?', 'how|is|your|day', [0, 3, 2, 1]],
  'have-a-good-day': ['Pase|yon|bon|jounen', 'have|a|good|day'],

  // The naming formulas use rele with the person as subject. English uses a possessed noun.
  'i-am-a-student': ['Mwen|se|yon|etidyan', 'I|am|a|student'],
  'i-am-learning': ['M|ap aprann...', 'I|am learning...'],
  'i-speak': ['Mwen|pale...', 'I|speak...'],
  'where-are-you-from': ['Ki kote|ou soti?', 'where|are you from'],
  'i-am-from': ['Mwen|soti...', 'I|am from...'],
  'where-do-you-live': ['Ki kote|ou|rete?', 'where|do|you|live', [0, 2, 3]],
  'i-live-in': ['Mwen|rete...', 'I|live|in...', [0, 1]],
  'which-language-do-you-speak': ['Ki|lang|ou|pale?', 'which|language|do|you|speak', [0, 1, 3, 4]],

  'no-problem': ['Pa gen|pwoblèm', 'no|problem'],
  'excuse-me': ['Eskize|m', 'excuse|me'],
  'this-is-my-family': ['Sa a|se|fanmi|mwen', 'this|is|my|family', [0, 1, 3, 2]],
  'this-is-my-husband': ['Sa a|se|mari|mwen', 'this|is|my|husband', [0, 1, 3, 2]],
  'this-is-my-wife': ['Sa a|se|madanm|mwen', 'this|is|my|wife', [0, 1, 3, 2]],
  'he-lives-here': ['Li|rete|isit la', 'he|lives|here'],
  'she-works-here': ['Li|travay|isit la', 'she|works|here'],
  'we-speak': ['Nou|pale...', 'we|speak...'],
  'they-are-from': ['Yo|soti...', 'they|are from...'],
};
