# Evaluation

Evaluation is pending. No performance or translation-quality results have been collected, and this prototype has no published claims.

## Measures

- Groundedness: answer sentences linked to a supporting passage, checked automatically and by reviewers.
- Abstention: unanswerable questions for which the app gives no unsupported answer.
- Citation accuracy: reviewer spot-check that each cited source supports its associated sentence.
- Translation quality: fluent isiZulu review of adequacy, naturalness, and term handling. Keep English beside the translation.
- Grade agreement: independent reviewer grades and any unresolved differences.

Report by language and by claim. Do not combine language scores into an overall average.

## Current limitations

The app uses deterministic keyword retrieval over local JSON. It returns only published claims with at least two sources and reviewer sign-off. All five starter topics are drafts, so the app abstains on them. There is no answer generation, translation model, evaluation runner, or reviewer workflow yet.
