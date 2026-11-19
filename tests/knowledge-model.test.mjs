import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISCRIMINATION, GUESS, estimateKnowledge, levelFor, LEVELS, posterior, probabilityCorrect, progressSince, studyPlan } from '../frontend/js/knowledge-model.mjs';
import { DISCOVERY_CASES, KNOWLEDGE_AREAS, QUIZ_QUESTIONS, addAttempt, scoreQuiz, topScores } from '../frontend/js/discovery.mjs';
import { discoveryResultView } from '../frontend/js/render.mjs';

/** @param {(area: string, difficulty: string, index: number) => boolean} correct */
function respond(correct) {
  return QUIZ_QUESTIONS.map((question, index) => ({ area: question.area, difficulty: /** @type {any} */ (question.difficulty), correct: correct(question.area, question.difficulty, index) }));
}

test('the chance of a correct answer never drops below the guessing floor and rises with ability', () => {
  assert.ok(probabilityCorrect(-4, 'stretch') >= GUESS);
  assert.ok(probabilityCorrect(-4, 'stretch') < GUESS + 0.01);
  assert.ok(probabilityCorrect(4, 'foundation') > 0.99);
  assert.ok(probabilityCorrect(0.5, 'core') > probabilityCorrect(-0.5, 'core'));
  assert.ok(probabilityCorrect(0, 'foundation') > probabilityCorrect(0, 'core'));
  assert.ok(probabilityCorrect(0, 'core') > probabilityCorrect(0, 'stretch'));
  assert.ok(DISCRIMINATION > 0);
});

test('with no answers the posterior is the prior, and every answer moves it the right way', () => {
  const none = posterior([], 0, 1);
  assert.ok(Math.abs(none.mean) < 0.01);
  assert.ok(Math.abs(none.sd - 1) < 0.05);
  const right = posterior([{ area: 'a', difficulty: 'core', correct: true }], 0, 1);
  const wrong = posterior([{ area: 'a', difficulty: 'core', correct: false }], 0, 1);
  assert.ok(right.mean > none.mean && wrong.mean < none.mean);
  assert.ok(right.sd < none.sd, 'an answer reduces uncertainty');
});

test('all right scores far above all wrong, and the score stays between 0 and 100', () => {
  const high = estimateKnowledge(respond(() => true), KNOWLEDGE_AREAS);
  const low = estimateKnowledge(respond(() => false), KNOWLEDGE_AREAS);
  assert.ok(high.score >= 80, `all right scored ${high.score}`);
  assert.ok(low.score <= 20, `all wrong scored ${low.score}`);
  for (const result of [high, low]) assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(high.level.key, 'mastering');
  assert.equal(low.level.key, 'starting');
});

test('each extra correct answer never lowers the score', () => {
  let last = -1;
  for (let right = 0; right <= QUIZ_QUESTIONS.length; right += 1) {
    const result = estimateKnowledge(respond((_, __, index) => index < right), KNOWLEDGE_AREAS);
    assert.ok(result.score >= last, `${right} right scored ${result.score}, below ${last}`);
    last = result.score;
  }
});

test('a correct stretch answer counts for more than a correct foundation answer', () => {
  const base = [{ area: 'x', difficulty: /** @type {const} */ ('core'), correct: false }];
  const stretch = posterior([...base, { area: 'x', difficulty: 'stretch', correct: true }], 0, 1);
  const foundation = posterior([...base, { area: 'x', difficulty: 'foundation', correct: true }], 0, 1);
  assert.ok(stretch.mean > foundation.mean);
});

test('missing a topic puts it first in the focus list, and strong topics are offered to double down', () => {
  const result = estimateKnowledge(respond((area) => area !== 'great-zimbabwe'), KNOWLEDGE_AREAS);
  assert.equal(result.plan.focus[0].id, 'great-zimbabwe');
  assert.ok(result.plan.strengths.length > 0);
  assert.ok(result.plan.strengths.every((topic) => topic.correct === topic.answered));
  assert.ok(result.plan.focus.every((topic) => topic.correct < topic.answered), 'a topic answered correctly is never a focus topic');
  assert.ok(!result.plan.strengths.some((topic) => topic.id === 'great-zimbabwe'));
  const topic = result.topics.find((item) => item.id === 'great-zimbabwe');
  assert.ok(topic && topic.mastery < 0.5);
});

test('topics are pulled toward overall ability, so one miss cannot zero a topic', () => {
  const result = estimateKnowledge(respond((_, __, index) => index !== 4 ), KNOWLEDGE_AREAS);
  const missed = result.topics.find((item) => item.id === QUIZ_QUESTIONS[4].area);
  assert.ok(missed && missed.mastery > 0.15, `a single miss gave ${missed?.mastery}`);
});

test('unanswered questions are skipped, and unseen topics are listed as unsure instead of weak', () => {
  const partial = estimateKnowledge(respond(() => true).filter((item) => item.area === 'great-zimbabwe'), KNOWLEDGE_AREAS);
  assert.equal(partial.answered, 2);
  assert.equal(partial.plan.unsure.length, KNOWLEDGE_AREAS.length - 1);
  assert.ok(!partial.plan.focus.some((topic) => topic.answered === 0));
  assert.equal(partial.confidence, 'low');
});

test('confidence grows with the number of answers', () => {
  const few = estimateKnowledge(respond(() => true).slice(0, 2), KNOWLEDGE_AREAS);
  const many = estimateKnowledge(respond((_, __, index) => index % 3 !== 0), KNOWLEDGE_AREAS);
  const rank = { low: 0, medium: 1, high: 2 };
  assert.ok(rank[many.confidence] >= rank[few.confidence]);
  assert.notEqual(many.confidence, 'low');
});

test('levels cover every score from 0 to 100 in order', () => {
  assert.equal(LEVELS[0].min, 0);
  for (let score = 0; score <= 100; score += 1) assert.ok(levelFor(score).label);
  assert.equal(levelFor(0).key, 'starting');
  assert.equal(levelFor(100).key, 'mastering');
  for (let i = 1; i < LEVELS.length; i += 1) assert.ok(LEVELS[i].min > LEVELS[i - 1].min);
});

test('studyPlan handles no answers and does not overlap focus with strengths', () => {
  assert.deepEqual(studyPlan([]), { focus: [], strengths: [], unsure: [] });
  const result = estimateKnowledge(respond((_, __, index) => index % 2 === 0), KNOWLEDGE_AREAS);
  for (const topic of result.plan.focus) assert.ok(!result.plan.strengths.includes(topic));
  assert.ok(result.plan.focus.length <= 3 && result.plan.strengths.length <= 2);
});

test('progress is the change since the last attempt, or null the first time', () => {
  assert.equal(progressSince(70, []), null);
  assert.equal(progressSince(70, [{ score: 50, date: 'a' }, { score: 64, date: 'b' }]), 6);
});

test('every question names a real topic, a difficulty, three options and exactly one correct answer, with a source', () => {
  const ids = new Set(DISCOVERY_CASES.map((item) => item.id));
  for (const question of QUIZ_QUESTIONS) {
    assert.ok(ids.has(question.area), `${question.prompt} has unknown topic ${question.area}`);
    assert.ok(['foundation', 'core', 'stretch'].includes(question.difficulty));
    assert.equal(question.options.length, 3);
    assert.equal(question.options.filter((option) => option.correct).length, 1);
    assert.match(question.source.url, /^https:\/\//);
    for (const option of question.options) assert.ok(option.why.length > 10);
  }
});

test('the right answer is not always in the same place, so the first option cannot be gamed', () => {
  const positions = new Set(QUIZ_QUESTIONS.map((question) => question.options.findIndex((option) => option.correct)));
  assert.equal(positions.size, 3);
});

test('every African history topic has at least two questions, and every topic has one', () => {
  for (const area of KNOWLEDGE_AREAS) {
    const count = QUIZ_QUESTIONS.filter((question) => question.area === area.id).length;
    assert.ok(count >= (area.african ? 2 : 1), `${area.id} has ${count}`);
  }
});

test('scoreQuiz scores picked answers with the model and tallies lenses', () => {
  const rights = QUIZ_QUESTIONS.map((question) => question.options.findIndex((option) => option.correct));
  const result = scoreQuiz(rights, [0, 0, 1]);
  assert.equal(result.correct, QUIZ_QUESTIONS.length);
  assert.equal(result.knowledge.answered, QUIZ_QUESTIONS.length);
  assert.ok(result.knowledge.score >= 80);
  assert.equal(result.lensMix[0].count, 2);
  const skipped = scoreQuiz([NaN, ...rights.slice(1)], [NaN, NaN, NaN]);
  assert.equal(skipped.knowledge.answered, QUIZ_QUESTIONS.length - 1);
  assert.deepEqual(skipped.lensMix, []);
});

test('saved attempts keep only numbers and a date, and the best scores come first', () => {
  const rights = QUIZ_QUESTIONS.map((question) => question.options.findIndex((option) => option.correct));
  const wrongs = QUIZ_QUESTIONS.map((question) => question.options.findIndex((option) => !option.correct));
  let history = addAttempt([], scoreQuiz(wrongs, []).knowledge);
  history = addAttempt(history, scoreQuiz(rights, []).knowledge);
  assert.deepEqual(Object.keys(history[0]).sort(), ['date', 'score', 'topics']);
  assert.ok(Object.values(history[1].topics).every((value) => Number.isInteger(value)));
  assert.ok(topScores(history)[0].score > topScores(history)[1].score);
  /** @type {ReturnType<typeof addAttempt>} */
  let many = [];
  for (let i = 0; i < 30; i += 1) many = addAttempt(many, scoreQuiz(rights, []).knowledge);
  assert.equal(many.length, 20);
});

test('the result page shows the score, level, plan, confidence and method, escapes text, and uses no inline style', () => {
  const answers = QUIZ_QUESTIONS.map((question) => question.options.findIndex((option) => !option.correct));
  const result = scoreQuiz(answers, [0, 1, 2]);
  const html = discoveryResultView('en', { ...result, answers, previous: -4, leaderboard: [{ score: result.knowledge.score, date: '2026-11-19T06:00:00Z' }] });
  assert.match(html, /Your knowledge score/);
  assert.match(html, /Focus here first/);
  assert.match(html, /Double down/);
  assert.match(html, /Bayesian item-response model/);
  assert.match(html, /−4 since your last attempt/);
  assert.match(html, /<meter /);
  assert.match(html, /Better answer/);
  assert.match(html, /Clear my saved progress/);
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /\bthe (real history|truth)\b/i);
  const first = discoveryResultView('zu', { ...result, answers, previous: null, leaderboard: [] });
  assert.match(first, /First attempt on this device/);
});
