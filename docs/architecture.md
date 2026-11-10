# Architecture

Status: draft for a hackathon proof of concept. Rewrite sections in your own words, and fill in the decisions marked **DECIDE**.

## 1. Goal and scope

**Goal.** Let people discover African history told by Africans, with the evidence visible, and read it in English or isiZulu.

**Proof-of-concept loop.**
question → retrieve from curated corpus → grounded answer with citations → claim grade and evidence types → isiZulu translation with labels → shareable card.

**In scope.** 5 demo claims, about 15 to 25 sources, English and isiZulu, web app (mobile first), share card, evaluation.

**Out of scope.** Accounts, social features, native apps, speech, auto language detection, other languages, full-book ingestion.

**Expansion path.** Add isiXhosa, Sesotho, Setswana by configuration; add oral-testimony intake with ASR (isiZulu speech to English); add reviewer tooling; add more claims.

## 2. Design principles

1. Cite or abstain. No source, no answer.
2. Show evidence, not verdicts. Grades are explained, and disagreement is shown.
3. Source types are visible, and African-authored scholarship and oral testimony are first-class.
4. Original beside translation, always. Machine translation is labelled.
5. Communities control oral testimony.

## 3. Components

```
 Web app (mobile-first)
   ├─ Search / ask
   ├─ Claim card (grade, evidence, term history, translation)
   └─ Share card generator
        │
        ▼
 API
   ├─ /search        retrieve claims and passages
   ├─ /answer        grounded answer for a question
   ├─ /claims/:id    claim card data
   ├─ /translate     translate a claim card (cached)
   └─ /share/:id     render share image + link
        │
        ▼
 Pipeline (src/pipeline)
   retrieve → ground → answer → grade → translate → render
        │
        ▼
 Data
   ├─ Corpus store (sources, passages, summaries)
   ├─ Claims store (claims, grades, evidence links)
   ├─ Translation store (per-field, with method + reviewer)
   └─ Eval store (test claims, results)
        │
 AI layer (src/ai)  — swappable model providers behind one interface
```

### 3.1 Web app
Mobile-first, lightweight pages, works on a slow connection. Server-rendered claim pages so shared links open quickly and can be previewed on WhatsApp. See `docs/design.md`.

### 3.2 API
Thin HTTP layer. Stateless. Validates every response against the schemas in section 4.

### 3.3 Pipeline stages
Each stage has a typed input and output and can be tested alone.

| Stage | Input | Output | Notes |
|---|---|---|---|
| retrieve | question | ranked passages and claims | Hybrid keyword plus embedding search over the curated corpus only |
| ground | question, passages | selected passages with relevance | Drops weak matches. If none remain, the pipeline abstains |
| answer | question, selected passages | answer text with a citation per sentence | Model is instructed to use only the passages and to cite. Output is validated |
| grade | claim id | grade, evidence summary | Read from the reviewed claims store. Never generated at runtime |
| translate | claim card (English) | isiZulu card with method flags | Machine translation, glossary applied, cached, flagged until reviewed |
| render | card | page, share image | Server-side render |

**Answer validation.** After the answer stage, a checker confirms that every sentence maps to at least one cited passage and that no cited passage is missing from the retrieved set. Failures trigger a retry, then abstention. Do not show an unvalidated answer.

**Abstention.** The "we don't have a source for this" response is a normal, designed outcome and is logged so gaps in the corpus can be seen.

### 3.4 AI layer
One interface per capability (`embed`, `generate`, `translate`). Provider and model names live in config, not code. This keeps the system model-agnostic and lets you compare models in the evaluation.

**DECIDE:** which models to use for embedding, generation, and translation. Choose from what you can run or access, and record versions in the evaluation output.

**Prototype implementation:** the current backend uses an in-process TF-IDF ranker in `ml/tfidf.mjs`. Generation and machine translation providers are not connected; draft content is shown with an explicit unreviewed translation label.

## 4. Data model

Use plain JSON or YAML files in `content/` for the PoC, validated by a schema and loaded into the database at build time. This makes content reviewable in git.

### Source
```yaml
id: src_great_zimbabwe_caton_thompson_1931
title: ...
authors: [...]
year: 1931
venue: ...
source_type: archaeology   # see enum below
licence: ...               # open access / permission / link only
url: ...
doi: null
author_background: ...     # e.g. African-authored: yes/no/unknown, institution
summary: ...               # our own words, short
reviewed_by: [...]
```

**source_type enum:** `scholarship`, `archaeology`, `genetics`, `linguistics`, `colonial_record`, `critical_commentary`, `oral_testimony`.

### Passage
A short, citable chunk of a source (our own summary or a short attributed quote) with `source_id`, `locator` (page or section), and embedding.

### Claim
```yaml
id: claim_pyramids_builders
statement: ...             # careful wording, no loaded terms without a note
topic: egypt
grade: well_established    # see enum below
grade_rationale: ...       # plain language, one to three sentences
evidence:
  - source_id: ...
    role: supports         # supports | complicates | opposes
    passage_ids: [...]
term_notes: [term_bantu]   # optional
what_is_contested: ...     # optional
reviewers: [{name, role, date}]
```

**grade enum:**
- `well_established`
- `broadly_accepted_details_contested`
- `contested`
- `partly_supported` (the popular version overreaches, the core holds)
- `unsupported`
- `insufficient_sources` (we do not yet have enough in the corpus)

A claim cannot be published with fewer than two evidence entries, or without a reviewer entry.

### Glossary entry and dated event
`content/glossary.json` holds defined terms (`id`, `term`, `aliases`, `definition.en`, `framing.en`, `sourceIds`). `content/chronology.json` holds dated events (`id`, `label`, `sortYear`, optional `endYear`, `event.en`, `framing.en`, `sourceIds`). Both are searched next to claims, and both are browsable at `#/glossary` and `#/timeline`.

Rules: every entry needs at least one source, definitions and dates come from a cited source (never memory), and `framing.en` is required. The framing line says how the entry is read from an African-centred standpoint. Outside or colonial material is described as what outsiders claimed, and the timeline is anchored in African events before outsiders' arrival (AGENTS.md rule 25). The validator fails any entry without framing.

### Term note
```yaml
id: term_bantu
term: Bantu
history: ...               # where the word comes from, how it was used and misused
sources: [...]
```

### Translation
```yaml
entity: claim_pyramids_builders
field: statement
lang: zu
text: ...
method: machine            # machine | human_reviewed
model: ...                 # provider and version
reviewed_by: null
reviewed_on: null
confidence: 0.0 to 1.0     # if available; otherwise null
flags: [low_confidence, term_unresolved]
```

### Oral testimony (design only for the PoC)
Fields to reserve: speaker (pseudonymised), language, place, date, transmission chain (who told whom), consent status, rights holder, visibility, and a "do not translate" flag. Not loaded in the PoC unless consent is documented.

## 5. Evaluation

Evaluation is part of the product story. Judges can see that the system behaves honestly.

1. **Claim set.** The 5 demo claims plus 10 to 15 test questions, including questions the corpus cannot answer.
2. **Groundedness.** Share of answer sentences that map to a cited passage (target: all of them, checked automatically and by hand on a sample).
3. **Abstention.** Fraction of unanswerable questions where the system correctly abstains.
4. **Citation accuracy.** Spot check that citations actually support the sentence.
5. **Translation quality.** A fluent isiZulu reviewer rates adequacy, naturalness, and term handling on the demo cards. Record the reviewer's corrections as a before/after table.
6. **Grade agreement.** Reviewers independently grade the claims. Report agreement and unresolved disagreements.

Report results per claim and per language. Do not average across languages.

## 6. Security, privacy, and rights

- Only open access or permissioned sources. Store our own summaries and citations.
- No personal data or real recordings in the repo. Use synthetic fixtures.
- Oral testimony requires recorded consent and a rights holder. Honour private and "do not translate" flags in code.
- Prompt injection: retrieved text is data, not instructions. The answer stage ignores instructions inside passages.
- Rate limit the API and keep logs free of personal data.
- Content provenance: every claim and source is traceable to a reviewer and a date.

## 7. Suggested stack (changeable)

Choose what you can build fastest and test well. A reasonable default:
- Frontend: TypeScript with a server-rendering framework, Tailwind for styling.
- Backend: either the same framework's API routes or a small Python service.
- Storage: SQLite or Postgres. Add a vector index if the corpus grows. For about 25 sources a simple in-process index is enough.
- Validation: schema validation for content files, run in CI.
- Tests: unit tests per pipeline stage, plus the evaluation script.

**DECIDE:** the stack, the hosting for the demo, and the budget for model calls.

## 8. Repo layout

```
history-app/
├─ AGENTS.md
├─ README.md
├─ docs/
│  ├─ architecture.md
│  ├─ design.md
│  ├─ evaluation.md
│  └─ sources.md            # source list with review status
├─ content/
│  ├─ sources/
│  ├─ claims/
│  ├─ term-notes/
│  ├─ glossary/             # approved isiZulu term equivalents
│  └─ translations/
├─ src/
│  ├─ app/                  # web UI
│  ├─ api/
│  ├─ pipeline/
│  ├─ ai/                   # model providers behind interfaces
│  └─ validate/             # content validators
├─ eval/
│  ├─ questions.yaml
│  └─ results/
└─ tests/
```

## 9. Build plan

1. **Content first.** Write the problem statement, pick 5 claims, collect sources, draft cards. Get a reviewer.
2. **Schemas and validators.** Content that fails validation cannot ship.
3. **Pipeline skeleton** with a stub model, then real retrieval.
4. **Grounded answer with abstention**, plus the answer validator.
5. **Claim card UI and share card.**
6. **isiZulu translation**, glossary, labels, reviewer pass.
7. **Evaluation run** and results table.
8. **Docs, README, demo script.**

## 10. Open decisions

- **Decided:** app name is `inzulolwazi`. Promise: “African history, told by Africans, with the evidence shown.”
- **DECIDE:** the 5 claims, their sources, and their grades.
- **DECIDE:** who reviews the content and the isiZulu.
- **DECIDE:** models and hosting.
- **DECIDE:** whether any oral testimony is included in the PoC, and with whose consent.
