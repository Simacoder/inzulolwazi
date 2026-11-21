/**
 * Finds the corpus terms in a piece of text. Pure functions with no DOM, so Node can test them.
 * Loaded as a plain script in the browser (it sets globalThis.InzMatcher) and with require() in tests.
 */
(function (/** @type {any} */ root) {
  'use strict';

  const escapeRegExp = (/** @type {string} */ text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalise = (/** @type {string} */ text) => text.toLowerCase().replace(/\s+/g, ' ').trim();

  /**
   * Build one pattern for every phrase. Longer phrases come first, so "Bantu peoples" wins over "Bantu".
   * A phrase only matches as a whole word, and a space in a phrase matches any run of whitespace.
   * @param {{ id: string, matchers: string[] }[]} entries
   */
  function compile(entries) {
    /** @type {Map<string, string>} */
    const owners = new Map();
    for (const entry of entries) {
      for (const phrase of entry.matchers) {
        const key = normalise(phrase);
        if (key && !owners.has(key)) owners.set(key, entry.id);
      }
    }
    const phrases = [...owners.keys()].sort((a, b) => b.length - a.length);
    if (!phrases.length) return { pattern: null, owners };
    const body = phrases.map((phrase) => escapeRegExp(phrase).replace(/ /g, '\\s+')).join('|');
    return { pattern: new RegExp(`(?<![\\p{L}\\p{N}])(${body})(?![\\p{L}\\p{N}])`, 'giu'), owners };
  }

  /**
   * @param {string} text
   * @param {{ pattern: RegExp | null, owners: Map<string, string> }} compiled
   * @returns {{ start: number, end: number, text: string, id: string }[]}
   */
  function findMatches(text, compiled) {
    if (!compiled.pattern || !text) return [];
    compiled.pattern.lastIndex = 0;
    const found = [];
    for (const match of text.matchAll(compiled.pattern)) {
      const id = compiled.owners.get(normalise(match[0]));
      if (id) found.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, text: match[0], id });
    }
    return found;
  }

  /**
   * Count matches per entry, in the order each entry first appears.
   * @param {{ id: string }[]} matches
   */
  function summarise(matches) {
    /** @type {Map<string, number>} */
    const counts = new Map();
    for (const match of matches) counts.set(match.id, (counts.get(match.id) ?? 0) + 1);
    return [...counts].map(([id, count]) => ({ id, count }));
  }

  const api = { compile, findMatches, summarise, normalise };
  root.InzMatcher = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
