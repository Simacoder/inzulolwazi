# AGENTS.md

Rules for any coding agent working in this repo. Read this first. App name: `inzulolwazi`.

## What this project is
`inzulolwazi` helps people discover African history told by Africans, with the evidence shown. Users ask a question or search a topic and get an answer drawn only from a curated, citable corpus. Every claim carries a grade and its evidence types. Answers can be read in English or machine-translated into isiZulu. The hackathon track is Discovery & Audience, with Truth, Authorship & Ownership as a secondary angle.

This is a proof of concept for 5 claims, not a production system. Do not build features that are not in `docs/architecture.md`.

## Commands
Keep these current. Node.js 22 was used to run the checks.
- Install: `npm install` (dev dependencies only, the app has no runtime dependencies)
- Run dev server: `npm run dev`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Tests: `npm test`
- Validate content (corpus, claims, translations): `npm run validate:content`
- Run evaluation: `npm run eval` (writes `eval/results/latest.md` and `eval/results/translation-review.csv`)
- Everything at once: `npm run check`

Run `npm run check` before declaring any task done.

## Non-negotiable rules

### Evidence and answers
1. **Cite or abstain.** Every factual sentence in an answer must be traceable to one or more source passages in the corpus. If retrieval finds nothing relevant, the answer is "we don't have a source for this" and nothing else. Never fill gaps from model memory.
2. **No verdicts without grades.** Every claim has a grade from the fixed set in `docs/architecture.md` and at least two evidence entries. Never invent a grade at runtime.
3. **Show disagreement.** If sources disagree, show both sides with their types. Do not average or pick one silently.
4. **Do not use the words "the real history" or "the truth" in UI copy.** The promise is "history told by Africans, with the evidence shown."
5. **Source types are labelled.** Peer-reviewed scholarship, archaeology, genetics, linguistics, colonial record, critical or interpretive commentary, and oral testimony are different types. Never present commentary or a news opinion piece as primary evidence.
6. **Loaded terms get a term-history note** (for example "Bantu", "Khoisan"). Do not repeat a contested label in a claim sentence without that note.

### Translation
7. **The English text is the source of truth** for the PoC. Translations never overwrite it.
8. **Every translated string** carries `lang`, `method` (`machine` or `human_reviewed`), and a `reviewed_by` field when reviewed. The UI must show "machine translated" unless a fluent reviewer has signed off.
9. **Always show original beside translation** on the claim card.
10. **Low-confidence or unreviewed passages are flagged**, not hidden.
11. **Keep proper names, place names, and loaded terms unchanged** unless the glossary in `content/glossary/` provides an approved equivalent.

### Content and copyright
12. Only add sources that are open access or used with permission. Store **our own short summaries** plus a citation and link. Do not store or display long passages of a copyrighted work.
13. Direct quotes are short, attributed, and used sparingly.
14. Never add a source or a claim without the metadata in the schema: author, year, publisher or venue, licence, source type, and a URL or DOI.
15. Do not paste facts into content files from memory or model output. Content files are written from sources and reviewed by a person. If you do not have a source, leave a `TODO(source)` marker. The content validator must fail on any `TODO(source)`.

### Oral testimony and personal data
16. **No real recordings, names of private individuals, or personal data in the repo.** Use synthetic fixtures only.
17. Oral testimony entries must record the speaker's consent status, language, place, date, and who holds the right to share. Anything without recorded consent is not loaded.
18. Respect "private" and "do not translate" flags. Both are enforced in code, not only in the UI.

### Engineering
19. Keep the pipeline as separate stages with typed inputs and outputs: retrieve, ground, answer, grade, translate, render. Do not merge stages.
20. All AI calls go through `src/ai/` so models can be swapped. No direct model calls elsewhere.
21. Log every answer with its retrieved passages and model version. Logs must not contain personal data.
22. Report evaluation results per language and per claim. Never average across languages.
23. Do not add dependencies without noting the reason in the PR or commit message.
24. Do not claim something works until you have run it.

## Definition of done
- Lint, type check, tests, and content validation pass.
- New or changed claims have sources, grades, and at least one reviewer entry.
- The evaluation script runs and the results file is updated.
- `docs/` is updated when behaviour or schema changes.

## Out of scope for the PoC
Accounts, social features, native apps, automatic language detection, speech input or output, and translation into languages other than isiZulu. These are on the expansion list in `docs/architecture.md`.
