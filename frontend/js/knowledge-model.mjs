/**
 * Knowledge model: turns a learner's quiz answers into a score, a level and a study plan.
 *
 * What it is. A Bayesian item-response model (three-parameter logistic, "3PL") with partial pooling.
 *  - Every question has a difficulty, a discrimination and a guessing floor (1 in 3 for a three-option question).
 *  - A learner's ability is a probability distribution, updated answer by answer with Bayes' rule on a grid.
 *  - Each topic's ability is pulled toward the learner's overall ability, so one answer cannot swing a topic wildly.
 *    This partial pooling is what lets a short quiz say something about every topic.
 *
 * What it is not. It is not trained on learner data, because none has been collected. Question parameters are set
 * by hand from the difficulty tag on each question, and the estimates carry an honest confidence label. It does not
 * classify a person's identity, ethnicity or worldview: it estimates only how well the cited readings were understood.
 * Everything runs in the browser and nothing is sent to a server.
 *
 * Mastery is the chance of answering a typical (core-level) question on a topic correctly beyond guessing.
 */

/** Guessing floor for a three-option question. */
export const GUESS = 1 / 3;
/** How sharply a question separates stronger from weaker learners. */
export const DISCRIMINATION = 1.2;
/** Question difficulty on the ability scale. A learner at ability 0 has even odds on a core question, beyond guessing. */
export const DIFFICULTY = { foundation: -1, core: 0, stretch: 1 };
/** Spread of ability across learners before any answer is seen. */
export const OVERALL_PRIOR_SD = 1;
/** How far one topic's ability may drift from the learner's overall ability. */
export const TOPIC_PRIOR_SD = 0.8;

const GRID = Array.from({ length: 81 }, (_, index) => -4 + index * 0.1);

/** @typedef {'foundation' | 'core' | 'stretch'} Difficulty */
/** @typedef {{ area: string, difficulty: Difficulty, correct: boolean }} Response */
/** @typedef {{ id: string, label: string }} Area */
/** @typedef {'low' | 'medium' | 'high'} Confidence */
/** @typedef {{ id: string, label: string, mastery: number, spread: number, answered: number, correct: number, confidence: Confidence }} AreaEstimate */

/**
 * Chance of a correct answer for a learner of the given ability on a question of the given difficulty.
 * @param {number} ability
 * @param {Difficulty} difficulty
 */
export function probabilityCorrect(ability, difficulty) {
  return GUESS + (1 - GUESS) * logistic(DISCRIMINATION * (ability - DIFFICULTY[difficulty]));
}

/** @param {number} x */
function logistic(x) { return 1 / (1 + Math.exp(-x)); }

/**
 * Posterior over ability on the grid, given responses and a normal prior.
 * @param {Response[]} responses
 * @param {number} priorMean
 * @param {number} priorSd
 * @returns {{ mean: number, sd: number, mastery: number, spread: number }}
 */
export function posterior(responses, priorMean, priorSd) {
  const logWeights = GRID.map((ability) => {
    let logWeight = -0.5 * ((ability - priorMean) / priorSd) ** 2;
    for (const response of responses) {
      const chance = probabilityCorrect(ability, response.difficulty);
      logWeight += Math.log(response.correct ? chance : 1 - chance);
    }
    return logWeight;
  });
  const top = Math.max(...logWeights);
  const weights = logWeights.map((value) => Math.exp(value - top));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = weights.map((weight) => weight / total);
  const mean = probabilities.reduce((sum, p, index) => sum + p * GRID[index], 0);
  const variance = probabilities.reduce((sum, p, index) => sum + p * (GRID[index] - mean) ** 2, 0);
  const masteries = GRID.map((ability) => logistic(DISCRIMINATION * ability));
  const mastery = probabilities.reduce((sum, p, index) => sum + p * masteries[index], 0);
  const masteryVariance = probabilities.reduce((sum, p, index) => sum + p * (masteries[index] - mastery) ** 2, 0);
  return { mean, sd: Math.sqrt(variance), mastery, spread: Math.sqrt(masteryVariance) };
}

/**
 * @param {number} sd posterior spread of ability
 * @param {number} answered answers behind the estimate
 * @returns {Confidence}
 */
function confidenceFor(sd, answered) {
  if (answered < 2 || sd > 0.75) return 'low';
  return sd > 0.55 ? 'medium' : 'high';
}

/**
 * Estimate overall and per-topic knowledge from the answers given.
 * @param {Response[]} responses answered questions only
 * @param {Area[]} areas every topic to report, answered or not
 */
export function estimateKnowledge(responses, areas) {
  const overall = posterior(responses, 0, OVERALL_PRIOR_SD);
  /** @type {AreaEstimate[]} */
  const topics = areas.map((area) => {
    const own = responses.filter((response) => response.area === area.id);
    const estimate = posterior(own, overall.mean, TOPIC_PRIOR_SD);
    return {
      id: area.id,
      label: area.label,
      mastery: estimate.mastery,
      spread: estimate.spread,
      answered: own.length,
      correct: own.filter((response) => response.correct).length,
      confidence: confidenceFor(estimate.sd, own.length),
    };
  });
  return {
    score: Math.round(overall.mastery * 100),
    level: levelFor(Math.round(overall.mastery * 100)),
    confidence: confidenceFor(overall.sd, responses.length),
    answered: responses.length,
    correct: responses.filter((response) => response.correct).length,
    topics,
    plan: studyPlan(topics),
  };
}

/** Level bands, lowest first. The label names where a learner is now, not a fixed trait. */
export const LEVELS = [
  { min: 0, key: 'starting', label: 'Starting out', next: 'Read the cited sources for each topic, then try again.' },
  { min: 25, key: 'building', label: 'Building foundations', next: 'Work through the focus topics below, one source at a time.' },
  { min: 50, key: 'growing', label: 'Growing strong', next: 'Close the gaps in your focus topics, then stretch into the harder questions.' },
  { min: 70, key: 'strong', label: 'Strong grasp of the evidence', next: 'Go deeper on your strongest topics and share what you read.' },
  { min: 85, key: 'mastering', label: 'Mastering the evidence', next: 'Teach a topic to someone else, and read the sources that disagree.' },
];

/** @param {number} score 0 to 100 */
export function levelFor(score) {
  let found = LEVELS[0];
  for (const level of LEVELS) if (score >= level.min) found = level;
  return found;
}

/**
 * Where to focus and where to double down.
 *  - Focus: topics with at least one missed answer, weakest first.
 *  - Double down: topics answered correctly every time, strongest first, where going deeper pays off.
 *  - Unsure: topics with no answers yet. They are never called weak.
 * @param {AreaEstimate[]} topics
 */
export function studyPlan(topics) {
  const answered = topics.filter((topic) => topic.answered > 0);
  const focus = answered.filter((topic) => topic.correct < topic.answered)
    .sort((a, b) => a.mastery - b.mastery || b.answered - a.answered).slice(0, 3);
  const strengths = answered.filter((topic) => topic.correct === topic.answered)
    .sort((a, b) => b.mastery - a.mastery || b.answered - a.answered).slice(0, 2);
  const unsure = topics.filter((topic) => topic.answered === 0);
  return { focus, strengths, unsure };
}

/**
 * Change since the learner's last attempt on this device, in score points.
 * @param {number} score
 * @param {{ score: number, date: string }[]} previous attempts, newest last
 * @returns {number | null}
 */
export function progressSince(score, previous) {
  const last = previous.at(-1);
  return last ? score - last.score : null;
}
