/**
 * Reading notes: a short extract from a page and a wording check. Pure functions with no DOM, so Node can test them.
 *
 * What the wording check is. It counts phrases from a short, reviewed-in-draft word list (extension/framing-cues.json)
 * that outsiders have often used about African peoples and places. It reports the phrases it found, why each is
 * flagged, and a band: few, some or many. It cannot read tone, cannot judge a whole book from a page, and cannot
 * tell who wrote a page, so it never says so. A page with no matches may still carry outside framing.
 *
 * What the summary is. An extract: the three sentences that carry the page's most repeated words, in their original
 * order. They are the page's words, not ours, and nothing is generated.
 */
(function (/** @type {any} */ root) {
  'use strict';

  const STOP = new Set(('a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just may me might more most my no nor not now of off on once only or other our out over own same she should so some such than that the their theirs them then there these they this those through to too under until up us very was we were what when where which while who whom why will with would you your').split(' '));

  /** Weighted score at or above which a page has some, then many, signals. */
  const SOME = 2;
  const MANY = 6;
  /** One repeated word should not drown out everything else. */
  const MAX_COUNT_PER_CUE = 5;
  const MIN_WORDS = 120;

  const wordsOf = (/** @type {string} */ text) => text.toLowerCase().match(/[\p{L}\p{N}’'-]+/gu) ?? [];

  /** @param {string} text */
  function splitSentences(text) {
    return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=["“‘'(]?[A-Z])/).map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 50 && sentence.length <= 320);
  }

  /**
   * Pick the sentences that carry the page's most repeated content words. Original order is kept.
   * @param {string} text
   * @param {number} count
   */
  function summarise(text, count = 3) {
    const sentences = splitSentences(text);
    if (sentences.length <= count) return sentences;
    /** @type {Map<string, number>} */
    const frequency = new Map();
    for (const word of wordsOf(text)) if (word.length > 2 && !STOP.has(word)) frequency.set(word, (frequency.get(word) ?? 0) + 1);
    const scored = sentences.map((sentence, index) => {
      const words = wordsOf(sentence).filter((word) => word.length > 2 && !STOP.has(word));
      const total = words.reduce((sum, word) => sum + (frequency.get(word) ?? 0), 0);
      return { sentence, index, score: total / Math.pow(Math.max(words.length, 1), 0.6) + (index < 4 ? 0.5 : 0) };
    });
    /** @type {typeof scored} */
    const chosen = [];
    for (const item of scored.sort((a, b) => b.score - a.score)) {
      if (chosen.length >= count) break;
      const duplicate = chosen.some((other) => {
        const left = new Set(wordsOf(other.sentence));
        const shared = wordsOf(item.sentence).filter((word) => left.has(word)).length;
        return shared / Math.max(1, wordsOf(item.sentence).length) > 0.7;
      });
      if (!duplicate) chosen.push(item);
    }
    return chosen.sort((a, b) => a.index - b.index).map((item) => item.sentence);
  }

  /** @param {number} score @returns {'few' | 'some' | 'many'} */
  function bandFor(score) {
    if (score >= MANY) return 'many';
    return score >= SOME ? 'some' : 'few';
  }

  /** @typedef {{ id: string, category: string, weight: number, label: string, phrases: string[], reason: string }} Cue */

  /**
   * Compile the word list for the matcher.
   * @param {{ cues: Cue[] }} framing
   * @param {{ compile: Function }} matcher
   */
  function prepare(framing, matcher) {
    return { framing, compiled: matcher.compile(framing.cues.map((cue) => ({ id: cue.id, matchers: cue.phrases }))) };
  }

  /**
   * Check the wording of a page's text.
   * @param {string} text
   * @param {ReturnType<typeof prepare>} prepared
   * @param {{ findMatches: Function }} matcher
   */
  function checkFraming(text, prepared, matcher) {
    const words = wordsOf(text).length;
    const byId = new Map(prepared.framing.cues.map((cue) => [cue.id, cue]));
    /** @type {Map<string, { count: number, examples: string[] }>} */
    const found = new Map();
    for (const match of matcher.findMatches(text, prepared.compiled)) {
      const entry = found.get(match.id) ?? { count: 0, examples: [] };
      entry.count += 1;
      if (entry.examples.length < 2) {
        const from = Math.max(0, match.start - 50);
        entry.examples.push(`${from > 0 ? '…' : ''}${text.slice(from, match.end + 50).replace(/\s+/g, ' ').trim()}${match.end + 50 < text.length ? '…' : ''}`);
      }
      found.set(match.id, entry);
    }
    let weighted = 0;
    for (const [id, entry] of found) weighted += (byId.get(id)?.weight ?? 0) * Math.min(entry.count, MAX_COUNT_PER_CUE);
    const score = words > 2000 ? weighted / (words / 2000) : weighted;
    const cues = [...found].map(([id, entry]) => {
      const cue = byId.get(id);
      return { id, category: cue?.category ?? '', label: cue?.label ?? id, reason: cue?.reason ?? '', count: entry.count, examples: entry.examples };
    }).sort((a, b) => b.count - a.count);
    return {
      words,
      enough: words >= MIN_WORDS,
      band: /** @type {'few' | 'some' | 'many'} */ (words >= MIN_WORDS ? bandFor(score) : 'few'),
      score: Math.round(score * 10) / 10,
      cues,
      confidence: /** @type {'low' | 'medium'} */ (words < 400 ? 'low' : 'medium'),
    };
  }

  /** Plain, respectful wording for each band. It describes the page's words. It does not judge the writer or tell the reader what to think. */
  const MESSAGES = {
    few: 'We found few of the wording patterns we look for. That does not mean a page has no outside framing.',
    some: 'This page uses some wording that outsiders have often used about African peoples and places. Reading it alongside sources from African institutions can help.',
    many: 'This page uses a lot of wording that outsiders have often used about African peoples and places. You may want to read it with care and compare it with the sources below.',
    short: 'There is not enough text on this page for a wording check.',
  };

  const api = { summarise, splitSentences, checkFraming, prepare, bandFor, wordsOf, MESSAGES, SOME, MANY, MIN_WORDS };
  root.InzReading = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
