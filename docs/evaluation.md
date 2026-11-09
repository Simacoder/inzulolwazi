# Evaluation

Run `npm run eval`. The runner and the question set exist (`eval/run.mjs`, `eval/questions.yaml`), and the latest output is in `eval/results/latest.md`. No translation-quality or grade-agreement results have been collected, and this prototype has no published claims, so groundedness and citation accuracy are not measured yet.

## Measures

- Groundedness: answer sentences linked to a supporting passage, checked automatically and by reviewers.
- Abstention: unanswerable questions for which the app gives no unsupported answer.
- Citation accuracy: reviewer spot-check that each cited source supports its associated sentence.
- Translation quality: fluent isiZulu review of adequacy, naturalness, and term handling. Keep English beside the translation.
- Grade agreement: independent reviewer grades and any unresolved differences.

Report by language and by claim. Do not combine language scores into an overall average.

## Current limitations

The app uses deterministic TF-IDF retrieval over local JSON. It returns only published claims with at least two distinct sources and reviewer sign-off. All five starter topics are drafts, so the app abstains on them. There is no answer generation, translation model, or reviewer workflow yet.

Retrieval is not yet a relevance gate. Generic words such as "history", "people" and "language" can retrieve an unrelated claim (see the known issues in `eval/questions.yaml`). Once a claim is published, such a question would return a wrong cited answer, so fix retrieval before publishing anything.
