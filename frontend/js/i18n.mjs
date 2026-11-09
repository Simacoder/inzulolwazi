/**
 * Interface text. English is the source. isiZulu strings are machine translated and not yet reviewed
 * by a fluent speaker, and the interface says so while isiZulu is on. Missing isiZulu strings fall back to English.
 */
export const STRINGS = {
  en: {
    navSearch: 'Search', navExplore: 'Explore', navSources: 'Sources', navMethod: 'Method', navApi: 'API',
    skip: 'Skip to content', brandHome: 'inzulolwazi home',
    eyebrow: 'A living library of African history',
    heroTitle: 'History has a story.', heroEm: 'Evidence gives it depth.',
    heroText: 'Search African scholarship, archaeology and other cited sources. See what supports an idea, what complicates it, and where the record is still quiet.',
    searchLabel: 'Ask a question or name a topic', searchPlaceholder: 'Try “pyramids”, “Khoisan” or “Great Zimbabwe”', searchButton: 'Search', clear: 'Clear search',
    tryThese: 'Try', shortcut: 'Press / to search from anywhere',
    statClaims: 'topics', statSources: 'sources', statReviewed: 'reviewed', statTypes: 'source types',
    honestTitle: 'An honest beginning.', honestText: 'Every topic here is still a draft. Nothing is presented as a settled answer until at least two sources and a reviewer back it. You can see exactly what each one still needs.',
    topics: 'Topics', browseAll: 'Browse all topics',
    searching: 'Searching…', resultsFor: 'Research leads for', noResultsTitle: 'We don’t have a source for this yet.',
    noResultsText: 'The collection has no topic with these words. Try different words, or look through the topics below.',
    leadsNote: 'These topics share words with your question. They are drafts, so they are leads for your own reading, not answers. A match shows how alike the words are, not that the topic answers the question.',
    answerHeading: 'What the collection can say', abstainHeading: 'No reviewed answer yet',
    matchClose: 'Close wording match', matchPartial: 'Partial wording match', matchLoose: 'Loose wording match',
    matchedWords: 'Matched words', openTopic: 'Open research notes',
    draft: 'Draft', published: 'Published', notReviewed: 'Not yet reviewed',
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
    methodIntro: 'The aim is history told by Africans, with the evidence shown. These are the rules the app follows.',
    m1t: 'Cite or abstain', m1: 'Answers come only from the collection. If it has nothing, we say so instead of guessing.',
    m2t: 'Drafts are not answers', m2: 'A topic is only offered as an answer once two distinct sources and a reviewer back it. Until then it appears as a research lead.',
    m3t: 'Evidence types stay visible', m3: 'Archaeology, linguistics, scholarship and commentary count differently, so each source shows its type.',
    m4t: 'Translations are labelled', m4: 'The English text is the source text. isiZulu appears beside it and says when it is machine translated.',
    m5t: 'Contested words get a note', m5: 'Labels such as Khoisan and Bantu have their own history. They need a term-history note before a topic can be published.',
    m6t: 'No tracking of what you ask', m6: 'Searches are not stored with your words. Feedback goes to a public issue you choose to open.',
    gradesHeading: 'Grades',
    apiTitle: 'Open API', apiIntro: 'The same data this app uses is available as JSON, read-only and open to any website. The full description is in OpenAPI 3.1.',
    apiTry: 'Try it', apiRun: 'Run', apiSpec: 'OpenAPI document', apiEndpoints: 'Endpoints', apiExample: 'Example',
    errorTitle: 'Something went wrong', retry: 'Try again', notFoundTitle: 'Page not found', notFoundText: 'That page does not exist.', goHome: 'Go to the start',
    loading: 'Loading…', footerLine: 'African history, told by Africans, with the evidence shown.', zuNote: 'isiZulu interface text is machine translated and has not been reviewed yet.',
    langSwitch: 'Switch to isiZulu',
  },
  zu: {
    navSearch: 'Cinga', navExplore: 'Hlola', navSources: 'Imithombo', navMethod: 'Indlela',
    eyebrow: 'Umtapo wolwazi ophilayo womlando wase-Afrika',
    heroTitle: 'Umlando unendaba yawo.', heroEm: 'Ubufakazi buyayijulisa.',
    heroText: 'Cinga ezifundisweni zase-Afrika, ekuvubukuleni nakweminye imithombo ecashuniwe. Bona ukuthi yini esekela umbono, yini ewuxakayo, nokuthi ulwazi luthule kuphi.',
    searchLabel: 'Buza umbuzo noma ubize isihloko', searchButton: 'Cinga', tryThese: 'Zama',
    topics: 'Izihlokwana', draft: 'Okusalungiswa', published: 'Okushicilelwe', notReviewed: 'Akukabuyekezwa',
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
