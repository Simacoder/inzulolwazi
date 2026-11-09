import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { parse } from 'yaml';
import { answer, loadCorpus, RETRIEVAL_THRESHOLD } from '../backend/pipeline.mjs';

/** @typedef {import('../backend/types.js').Corpus} Corpus */
/** @typedef {import('../backend/types.js').AnswerResult} AnswerResult */
/**
 * @typedef {object} Question
 * @property {string} id
 * @property {string | null} claim
 * @property {string} language
 * @property {string} question
 * @property {string} expected
 * @property {string} [known_issue]
 */
/**
 * @typedef {object} QuestionResult
 * @property {string} id
 * @property {string} language
 * @property {string | null} claim
 * @property {string} expected
 * @property {boolean} abstained
 * @property {boolean} retrieved
 * @property {boolean} leaked
 * @property {{ sentences: number, grounded: number } | null} groundedness
 * @property {'pass' | 'fail' | 'known_issue' | 'stale_known_issue'} status
 * @property {string} reason
 * @property {string | null} knownIssue
 */

const here = path.dirname(fileURLToPath(import.meta.url));
export const EXPECTATIONS = ['abstain_until_claim_reviewed', 'abstain_no_matching_source', 'answer'];
export const LANGUAGES = ['en', 'zu'];

/**
 * @param {string} text YAML text
 * @returns {Question[]}
 */
export function parseQuestions(text) {
  const parsed = parse(text);
  if (!Array.isArray(parsed)) throw new Error('questions.yaml must be a list');
  return parsed;
}

/**
 * Check the evaluation set itself, so a typo cannot silently weaken the evaluation.
 * @param {Question[]} questions
 * @param {Corpus} corpus
 * @returns {string[]}
 */
export function checkQuestions(questions, corpus) {
  /** @type {string[]} */
  const errors = [];
  const claimIds = new Set(corpus.claims.map((claim) => claim.id));
  const seen = new Set();
  for (const [index, q] of questions.entries()) {
    const label = q?.id ? `question ${q.id}` : `questions[${index}]`;
    if (!q?.id || typeof q.question !== 'string' || !q.question.trim()) errors.push(`${label} needs an id and a question`);
    if (q?.id) {
      if (seen.has(q.id)) errors.push(`${label} has a duplicated id`);
      seen.add(q.id);
    }
    if (!LANGUAGES.includes(q?.language)) errors.push(`${label} has an invalid language "${q?.language}"`);
    if (!EXPECTATIONS.includes(q?.expected)) errors.push(`${label} has an invalid expected value "${q?.expected}"`);
    if (q?.claim !== null && q?.claim !== undefined && !claimIds.has(q.claim)) errors.push(`${label} references unknown claim ${q.claim}`);
    if (q?.expected && q.expected !== 'abstain_no_matching_source' && !q.claim) errors.push(`${label} expects "${q.expected}" but names no claim`);
  }
  return errors;
}

/**
 * Check that every sentence in an answer carries a citation that resolves to a real source.
 * Returns null for an abstention, which is not scored for groundedness.
 * @param {AnswerResult} result
 * @param {Corpus} corpus
 * @returns {{ sentences: number, grounded: number } | null}
 */
export function groundedness(result, corpus) {
  if (result.abstained) return null;
  const sourceIds = new Set(corpus.sources.map((source) => source.id));
  const sentences = result.answer.split(/(?<=\])\s+/).filter(Boolean);
  let grounded = 0;
  for (const sentence of sentences) {
    const numbers = [...sentence.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
    const ok = numbers.length > 0 && numbers.every((n) => {
      const cited = result.citations.filter((citation) => citation.number === n);
      return cited.length > 0 && cited.every((citation) => sourceIds.has(citation.id));
    });
    if (ok) grounded += 1;
  }
  return { sentences: sentences.length, grounded };
}

/**
 * @param {Question} q
 * @param {Corpus} corpus
 * @returns {QuestionResult}
 */
export function evaluateQuestion(q, corpus) {
  const result = answer(q.question, corpus);
  const statements = corpus.claims.map((claim) => claim.statement.en);
  const leaked = result.abstained && statements.some((statement) => result.answer.includes(statement));
  const retrieved = q.claim ? result.matches.some((match) => match.id === q.claim) : false;
  const grounding = groundedness(result, corpus);

  let reason = '';
  if (q.expected === 'abstain_no_matching_source') {
    if (!result.abstained) reason = 'answered a question the corpus cannot answer';
    else if (result.matches.length) reason = `retrieved unrelated claim(s): ${result.matches.map((m) => m.id).join(', ')}`;
  } else if (q.expected === 'abstain_until_claim_reviewed') {
    if (!result.abstained) reason = 'answered from a claim that is not reviewed';
    else if (leaked) reason = 'draft claim text leaked into the answer';
    else if (result.citations.length) reason = 'abstention carried citations';
    else if (!retrieved) reason = `did not retrieve ${q.claim}`;
  } else if (q.expected === 'answer') {
    const match = result.matches.find((m) => m.id === q.claim);
    if (result.abstained) reason = 'abstained but an answer was expected';
    else if (!match?.answer) reason = 'expected claim was not used in the answer';
    else if (!grounding || grounding.grounded !== grounding.sentences) reason = 'answer has sentences without a valid citation';
  }

  const knownIssue = q.known_issue ?? null;
  /** @type {QuestionResult['status']} */
  let status = 'pass';
  if (reason) status = knownIssue ? 'known_issue' : 'fail';
  else if (knownIssue) status = 'stale_known_issue';

  return {
    id: q.id, language: q.language, claim: q.claim ?? null, expected: q.expected,
    abstained: result.abstained, retrieved, leaked, groundedness: grounding, status, reason, knownIssue,
  };
}

/**
 * Aggregate per language and per claim. Languages are never averaged together.
 * @param {QuestionResult[]} results
 */
export function summarise(results) {
  /** @param {QuestionResult[]} list */
  const counts = (list) => ({
    questions: list.length,
    pass: list.filter((r) => r.status === 'pass' || r.status === 'stale_known_issue').length,
    knownIssue: list.filter((r) => r.status === 'known_issue').length,
    fail: list.filter((r) => r.status === 'fail').length,
  });
  const byLanguage = LANGUAGES.map((language) => {
    const list = results.filter((r) => r.language === language);
    const draftQs = list.filter((r) => r.expected === 'abstain_until_claim_reviewed');
    const unanswerable = list.filter((r) => r.expected === 'abstain_no_matching_source');
    const answered = list.filter((r) => r.groundedness);
    return {
      language,
      ...counts(list),
      draftQuestions: draftQs.length,
      draftRetrieved: draftQs.filter((r) => r.retrieved).length,
      draftWithheld: draftQs.filter((r) => r.abstained && !r.leaked).length,
      unanswerableQuestions: unanswerable.length,
      unanswerableCorrect: unanswerable.filter((r) => r.status === 'pass' || r.status === 'stale_known_issue').length,
      answeredQuestions: answered.length,
      groundedSentences: answered.reduce((sum, r) => sum + (r.groundedness?.grounded ?? 0), 0),
      totalSentences: answered.reduce((sum, r) => sum + (r.groundedness?.sentences ?? 0), 0),
    };
  }).filter((row) => row.questions > 0);

  /** @type {Map<string, QuestionResult[]>} */
  const groups = new Map();
  for (const r of results) {
    const key = `${r.claim ?? '(no matching claim)'}|${r.language}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const byClaim = [...groups].map(([key, list]) => {
    const [claim, language] = key.split('|');
    return { claim, language, ...counts(list) };
  }).sort((a, b) => a.claim.localeCompare(b.claim) || a.language.localeCompare(b.language));

  return { byLanguage, byClaim, total: counts(results) };
}

/** @param {number} n @param {number} d */
const ratio = (n, d) => (d === 0 ? 'n/a' : `${n}/${d}`);

/**
 * @param {{ results: QuestionResult[], summary: ReturnType<typeof summarise>, corpus: Corpus }} report
 * @returns {string}
 */
export function renderMarkdown({ results, summary, corpus }) {
  const published = corpus.claims.filter((c) => c.status === 'published').length;
  const unreviewed = corpus.claims.filter((c) => c.translation?.method !== 'human_reviewed').length;
  const lines = [
    '# Evaluation results',
    '',
    'Generated by `npm run eval`. Content is deterministic, with no timestamps, so a changed file means a changed result.',
    '',
    `- Corpus: ${corpus.claims.length} claims (${published} published, ${corpus.claims.length - published} draft), ${corpus.sources.length} sources`,
    `- Retrieval: local TF-IDF, threshold ${RETRIEVAL_THRESHOLD}, no generative model`,
    `- Questions: ${summary.total.questions} (${summary.total.pass} pass, ${summary.total.knownIssue} known issues, ${summary.total.fail} fail)`,
    '',
    '## By language',
    '',
    'Languages are reported separately and are not averaged together.',
    '',
    '| Language | Questions | Pass | Known issues | Fail | Draft claims retrieved | Draft claims withheld | Unanswerable handled | Answered | Grounded sentences |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...summary.byLanguage.map((r) => `| ${r.language} | ${r.questions} | ${r.pass} | ${r.knownIssue} | ${r.fail} | ${ratio(r.draftRetrieved, r.draftQuestions)} | ${ratio(r.draftWithheld, r.draftQuestions)} | ${ratio(r.unanswerableCorrect, r.unanswerableQuestions)} | ${r.answeredQuestions} | ${ratio(r.groundedSentences, r.totalSentences)} |`),
    '',
    '## By claim and language',
    '',
    '| Claim | Language | Questions | Pass | Known issues | Fail |',
    '|---|---|---|---|---|---|',
    ...summary.byClaim.map((r) => `| ${r.claim} | ${r.language} | ${r.questions} | ${r.pass} | ${r.knownIssue} | ${r.fail} |`),
    '',
    '## Known issues',
    '',
  ];
  const known = results.filter((r) => r.status === 'known_issue');
  if (known.length === 0) lines.push('None.');
  for (const r of known) lines.push(`- \`${r.id}\` (${r.language}): ${r.reason}. ${r.knownIssue}`);
  const stale = results.filter((r) => r.status === 'stale_known_issue');
  if (stale.length) {
    lines.push('', '## Known issues that now pass', '');
    for (const r of stale) lines.push(`- \`${r.id}\` passes now. Remove its \`known_issue\` note.`);
  }
  const failed = results.filter((r) => r.status === 'fail');
  if (failed.length) {
    lines.push('', '## Failures', '');
    for (const r of failed) lines.push(`- \`${r.id}\` (${r.language}): ${r.reason}`);
  }
  lines.push(
    '',
    '## Not measured yet',
    '',
    published === 0
      ? '- Groundedness and citation accuracy: **not measured** (n/a). No claim is published, so no answer has been produced. This is not a score of 100%.'
      : '- Citation accuracy: needs a reviewer spot-check that each cited source supports its sentence.',
    `- Translation quality: needs a fluent isiZulu reviewer. ${unreviewed} of ${corpus.claims.length} claims have a machine translation with no human review. A review sheet is written to \`eval/results/translation-review.csv\`.`,
    '- Grade agreement: needs independent reviewer grades, and none exist yet.',
    '',
  );
  return lines.join('\n');
}

/** @param {string} value */
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

/**
 * Review sheet for a fluent isiZulu reviewer.
 * @param {Corpus} corpus
 * @returns {string}
 */
export function translationReviewCsv(corpus) {
  const header = ['claim_id', 'english_source_text', 'machine_isizulu', 'adequacy_1_to_5', 'naturalness_1_to_5', 'terms_ok_yes_no', 'corrected_isizulu', 'reviewer', 'review_date'];
  const rows = corpus.claims
    .filter((claim) => claim.translation?.method !== 'human_reviewed')
    .map((claim) => [claim.id, claim.statement.en, claim.translation.zu, '', '', '', '', '', '']);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

async function main() {
  const corpus = await loadCorpus();
  const questions = parseQuestions(await readFile(path.join(here, 'questions.yaml'), 'utf8'));
  const problems = checkQuestions(questions, corpus);
  if (problems.length) {
    console.error(`Invalid evaluation set:\n${problems.join('\n')}`);
    process.exitCode = 1;
    return;
  }
  const results = questions.map((q) => evaluateQuestion(q, corpus));
  const summary = summarise(results);

  const outDir = path.join(here, 'results');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'latest.md'), renderMarkdown({ results, summary, corpus }));
  await writeFile(path.join(outDir, 'translation-review.csv'), translationReviewCsv(corpus));
  await writeFile(path.join(outDir, 'latest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version, retrievalThreshold: RETRIEVAL_THRESHOLD, summary, results }, null, 2)}\n`);

  for (const r of results) {
    const mark = { pass: 'PASS ', fail: 'FAIL ', known_issue: 'KNOWN', stale_known_issue: 'FIXED?' }[r.status];
    console.log(`${mark} ${r.id.padEnd(20)} ${r.language}  ${r.reason}`);
  }
  console.log(`\n${summary.total.pass} pass, ${summary.total.knownIssue} known issues, ${summary.total.fail} fail of ${summary.total.questions}. Report: eval/results/latest.md`);
  if (summary.total.fail > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
