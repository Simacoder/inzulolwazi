/**
 * Interface text. English is the source. isiZulu strings are machine translated and not yet reviewed
 * by a fluent speaker, and the interface says so while isiZulu is on. Missing isiZulu strings fall back to English.
 */
export const STRINGS = {
  en: {
    navSearch: 'Search', navExplore: 'Explore', navTimeline: 'Timeline', navGlossary: 'Terms', navSources: 'Sources', navMethod: 'Method', navApi: 'API',
    skip: 'Skip to content', brandHome: 'inzulolwazi home',
    eyebrow: 'African-centred history, grounded in African scholarship',
    heroTitle: 'Africa is the starting point.', heroEm: 'African people shape the story.',
    heroText: 'Explore African societies, knowledge, makers and thinkers through African scholarship and cited evidence. Each account names its sources, shows what they support, and makes room for disagreement and gaps in the record.',
    searchLabel: 'Ask a question or name a topic', searchPlaceholder: 'Try “pyramids”, “Khoisan” or “Great Zimbabwe”', searchButton: 'Search', clear: 'Clear search',
    tryThese: 'Try', shortcut: 'Press / to search from anywhere',
    statClaims: 'topics', statSources: 'sources', statReviewed: 'reviewed', statTypes: 'source types',
    honestTitle: 'African history, in focus.', honestText: 'This collection documents African history through focused topics on African societies, knowledge, language and heritage. Each topic shows its sources and current evidence; reviewed answers appear when the evidence and review are in place.',
    topics: 'Topics', browseAll: 'Browse all topics',
    searching: 'Searching…', resultsFor: 'Research leads for', noResultsTitle: 'We don’t have a source for this yet.',
    noResultsText: 'The collection has no topic with these words. Try different words, or look through the topics below.',
    leadsNote: 'These African history topics share words with your question. They are research leads from the collection; a wording match does not by itself establish an answer.',
    answerHeading: 'What the collection can say', abstainHeading: 'No reviewed answer yet',
    matchClose: 'Close wording match', matchPartial: 'Partial wording match', matchLoose: 'Loose wording match',
    matchedWords: 'Matched words', openTopic: 'Open research notes',
    draft: 'Research topic', published: 'Published', notReviewed: 'Review in progress',
    sourcesN: (/** @type {number} */ n) => `${n} source${n === 1 ? '' : 's'}`,
    exploreTitle: 'Explore the topics', exploreIntro: 'Filter by status or by the kind of evidence behind a topic.',
    filterWords: 'Words', filterStatus: 'Status', filterType: 'Evidence type', sortBy: 'Sort', any: 'Any',
    sortTopic: 'A to Z', sortSources: 'Most sources', sortYear: 'Newest source',
    showing: (/** @type {number} */ n, /** @type {number} */ total) => `Showing ${n} of ${total}`,
    nothingMatches: 'No topic matches these filters.', resetFilters: 'Reset filters',
    back: 'Back', backToSearch: 'Back to results', topicNotes: 'Research notes',
    statement: 'Framing in English', original: 'English (source text)', translationIsiZulu: 'isiZulu',
    machineTranslated: 'Machine translated, not yet reviewed by a fluent speaker',
    whyFramed: 'Why it is framed this way', checklist: 'What this topic needs before it can be published',
    checklistDone: 'Done', checklistOpen: 'Still needed', gradeHeading: 'Grade',
    termHeading: 'Term history', termPending: 'This topic uses a contested label. Its term-history note has not been written yet, so treat the label with care.',
    evidence: 'Evidence behind this topic', oneSourceNote: 'Only one source is linked so far. Two distinct sources are needed before this can be published.',
    cite: 'Cite', copyCitations: 'Copy', downloadCitations: 'Download', copied: 'Copied', formatText: 'Plain text', formatBibtex: 'BibTeX', formatRis: 'RIS',
    print: 'Print', share: 'Copy link', linkCopied: 'Link copied', reviewers: 'Reviewers', noReviewers: 'None yet',
    feedbackHeading: 'Help improve this topic', feedbackSource: 'Suggest a source', feedbackTranslation: 'Report a translation problem', feedbackCorrection: 'Suggest a correction',
    feedbackNote: 'These open a public GitHub issue. We store nothing about you here.',
    sourcesTitle: 'Sources', sourcesIntro: 'Every source behind a topic, with its type and licence. We show our own short summaries and link to the original.',
    openOriginal: 'Open the original', usedIn: 'Used in', authors: 'Authors', venue: 'Published in', year: 'Year', licence: 'Licence', authorBackground: 'About the author', summary: 'Summary (ours)',
    sourceTypesHeading: 'Kinds of evidence', methodTitle: 'How this works',
    methodIntro: 'This project begins with African histories and the people who shaped them. African scholarship guides the frame; every source is named, situated and weighed for what it can support.',
    m1t: 'Cite or abstain', m1: 'Answers come only from the collection. If it has nothing, we say so instead of guessing.',
    m2t: 'Evidence supports each answer', m2: 'A topic becomes an answer when at least two distinct sources and a reviewer support it. Until then, it remains visible as a research topic and lead for further reading.',
    m3t: 'Evidence types stay visible', m3: 'Archaeology, linguistics, scholarship and commentary count differently, so each source shows its type.',
    m4t: 'Translations are labelled', m4: 'The English text is the source text. isiZulu appears beside it and says when it is machine translated.',
    m5t: 'Contested words get a note', m5: 'Labels such as Khoisan and Bantu have their own history. They need a term-history note before a topic can be published.',
    m6t: 'No tracking of what you ask', m6: 'Searches are not stored with your words. Feedback goes to a public issue you choose to open.',
    gradesHeading: 'Grades',
    m7t: 'African-centred by design', m7: 'African people, societies and knowledge shape the frame of every topic. We start from African histories and scholarship, name each source and show its limits. Outside and colonial records appear in their own context, as evidence of what their makers recorded or claimed. Reviewers check this framing before publication.',
    glossaryTitle: 'Terms and definitions', glossaryIntro: 'What a word means, where it came from, and who is saying so. Each term says how to read it from an African-centred standpoint.',
    timelineTitle: 'Timeline', timelineIntro: 'Dated events, each from a cited source. Events are placed from African history outward, not from the arrival of outsiders.',
    termsHeading: 'Terms and definitions', timelineHeading: 'On the timeline', framingHeading: 'Read from an African-centred standpoint', alsoCalled: 'Also written',
    fromYear: 'From year', toYear: 'To year', yearHint: 'Use negative numbers for BC', browseTimeline: 'Browse the timeline', browseTerms: 'Browse the terms',
    sourcesFor: 'Sources', noEntries: 'Nothing matches these filters.',
    apiTitle: 'Open API', apiIntro: 'The same data this app uses is available as JSON, read-only and open to any website. The full description is in OpenAPI 3.1.',
    apiTry: 'Try it', apiRun: 'Run', apiSpec: 'OpenAPI document', apiEndpoints: 'Endpoints', apiExample: 'Example',
    errorTitle: 'Something went wrong', retry: 'Try again', notFoundTitle: 'Page not found', notFoundText: 'That page does not exist.', goHome: 'Go to the start',
    loading: 'Loading…', footerLine: 'African history, told by Africans, with the evidence shown.', zuNote: 'isiZulu interface text is machine translated and has not been reviewed yet.',
    langSwitch: 'Switch to isiZulu',
  },
  zu: {
    navSearch: 'Cinga', navExplore: 'Hlola', navSources: 'Imithombo', navMethod: 'Indlela',
    eyebrow: 'Umlando ogxile e-Afrika, usekelwe ezifundweni zase-Afrika',
    heroTitle: 'I-Afrika iyisiqalo.', heroEm: 'Abantu base-Afrika balolonga indaba.',
    heroText: 'Hlola imiphakathi, ulwazi, abakhi nabacabangi base-Afrika ngezifundo zase-Afrika nobufakazi obucashuniwe. I-akhawunti ngayinye iveza imithombo yayo, lokho eyisekelayo, nokungavumelani noma izikhala emlandweni.',
    searchLabel: 'Buza umbuzo noma ubize isihloko', searchButton: 'Cinga', tryThese: 'Zama',
    topics: 'Izihlokwana', draft: 'Isihloko socwaningo', published: 'Okushicilelwe', notReviewed: 'Sisabuyekezwa',
    noResultsTitle: 'Asinawo umthombo walokhu okwamanje.',
    exploreTitle: 'Hlola izihloko', sourcesTitle: 'Imithombo', methodTitle: 'Indlela esisebenza ngayo',
    original: 'IsiNgisi (umbhalo wangempela)', translationIsiZulu: 'isiZulu',
    machineTranslated: 'Kuhunyushwe ngomshini, akukabuyekezwa isikhulumi esifundile',
    back: 'Emuva', loading: 'Iyalayisha…', footerLine: 'Umlando wase-Afrika, oxoxwa ngabantu base-Afrika, nobufakazi obubonakalayo.',
    langSwitch: 'Shintshela esiNgisini',
  },
};

/**
 * @param {'en' | 'zu'} lang
 * @param {keyof typeof STRINGS.en} key
 * @returns {any}
 */
export function t(lang, key) {
  const table = /** @type {Record<string, unknown>} */ (STRINGS[lang]);
  return key in table ? table[key] : /** @type {Record<string, unknown>} */ (STRINGS.en)[key];
}
