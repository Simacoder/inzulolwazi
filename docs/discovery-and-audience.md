# Discovery & Audience feature

## Purpose

The `/discover` page helps audiences compare how knowledge was developed, funded, circulated and applied in selected historical cases. It starts with African histories and connects them to examples from the medieval Islamic world, East Asia, Europe and Russia.

The comparison is organized around mechanisms: local knowledge and questions, translation and exchange, patronage, institutions, tools, audiences, access and political power. The cases cover different centuries and are not a statistical sample or a ranking of civilizations. A relationship between national power and a period of discovery is not evidence that cultural self-focus caused that power.

Each case has a source link next to its summary. The quiz includes citations in its answer feedback. The Protagoras passage is presented as an argument attributed to him in Plato's *Theaetetus* (152a); it is not described as the beginning of a single Western mindset or as a sufficient explanation for later European scientific institutions.

## Quiz, knowledge score and study plan

The quiz has two parts:

- **Evidence check (12 questions).** Each question is tied to one case study, carries a difficulty (foundation, core or stretch), and cites its source. Every African history case has two questions and every other case has one. The correct answer is not always in the same position.
- **Lens check (3 questions).** A short preference check records which historical cases the visitor wants to explore. It is a transparent tally, not a model, and it never classifies a person's race, ethnicity, identity, ideology or worldview.

### Knowledge model

`frontend/js/knowledge-model.mjs` scores the evidence check with a Bayesian item-response model (three-parameter logistic):

- Each question has a difficulty, a shared discrimination (1.2) and a guessing floor of one in three.
- The learner's ability is a probability distribution on a grid, updated with Bayes' rule from every answer.
- Each topic's ability is pulled toward the learner's overall ability (partial pooling), so one answer cannot swing a topic wildly and a short quiz can still say something about every topic.
- Mastery is the chance of answering a typical core-level question on that topic correctly beyond guessing. The score is overall mastery from 0 to 100.
- The result shows a level (Starting out, Building foundations, Growing strong, Strong grasp of the evidence, Mastering the evidence) and a confidence label (low, medium, high) that depends on how many answers back the estimate.

The study plan is rule-based on the model's output: **Focus here first** lists up to three topics with a missed answer, weakest first; **Double down** lists up to two topics answered correctly every time, strongest first. Each item links to its cited reading. Topics with no answers are never called weak.

### Limits

- The model is not trained on learner data. Question settings are set by hand from the difficulty tag. Recalibrate them (for example by fitting difficulty from anonymous, consented response counts) before calling the score validated.
- A history educator should review the questions and answer key. The five newest questions were written only from the text and sources of the existing case summaries and are drafts until reviewed.
- The score describes understanding of these cited readings. It is not an exam grade.

### Privacy

Nothing is sent to a server. The browser keeps up to 20 attempts in local storage under `inzulolwazi-knowledge-history-v2`: a score from 0 to 100, a date, and a mastery number per topic. It keeps no name, no account and no answers. The "Clear my saved progress" button removes it. The earlier v1 score list is no longer read.

## Evidence limits and next review

The page is a curated set of sourced examples, not a comprehensive history of each region. The selected cases include institutional and archaeological evidence, and their limits are stated where relevant. The colonial-legacies panel summarizes the cited economic-history review: it reports both extractive institutions and colonial investments, while emphasizing variation, continuity, rupture and open questions. It does not claim that colonization alone explains every later African outcome.

Before presenting the quiz as formal educational assessment, a history educator should review the questions and answer key. Any isiZulu translation should be reviewed by a fluent speaker before being labelled human-reviewed.
