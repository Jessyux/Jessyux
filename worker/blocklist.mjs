/* Word filter for typed sand messages and names. It blocks a post rather than
   holding it for review. Matching is on whole words or stems at a word start,
   so "classic", "Scunthorpe" and "Fukushima" pass. Drawings can't be filtered:
   that's known and accepted, and the removal page covers it. */
const STEMS = ['fuck', 'shit', 'bullshit', 'cunt', 'bastard', 'bitch', 'wank', 'twat', 'arsehole', 'asshole', 'whore', 'slut', 'pussy'];
const WORDS = ['ass', 'arse', 'cock', 'fuk', 'fuks', 'fuker', 'fuked', 'fuking', 'fag', 'fags', 'faggot', 'faggots', 'nigger', 'niggers', 'nigga', 'niggas', 'retard', 'retards', 'retarded', 'kike', 'spic', 'chink', 'coon', 'tranny', 'rape', 'rapist', 'nazi'];
const SAFE = ['shitake', 'pussycat', 'pussycats'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };
const STEM_RE = new RegExp('\\b(?:' + STEMS.join('|') + ')[a-z]*', 'g');
const WORD_RE = new RegExp('\\b(?:' + WORDS.join('|') + ')\\b');

function normalise(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c])
    /* sh!t, but a closing ! stays punctuation */
    .replace(/!(?=[a-z])/g, 'i')
    .replace(/\bf[v*]ck/g, 'fuck')
    .replace(/\bspic and span\b/g, '')
    /* f u c k, F.U.C.K */
    .replace(/\b[a-z](?:[\s._*-]+[a-z]\b)+/g, (m) => m.replace(/[\s._*-]+/g, ''))
    /* fuuuck */
    .replace(/([a-z])\1{2,}/g, '$1');
}

export function isBlocked(s) {
  const n = normalise(s);
  const stems = n.match(STEM_RE) || [];
  return stems.some((w) => !SAFE.includes(w)) || WORD_RE.test(n);
}
