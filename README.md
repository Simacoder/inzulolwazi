# inzulolwazi

African history, told by Africans, with the evidence shown.

## Project presentation

[Download the inzulolwazi slide deck](Inzulolwazi%20African%20History%2C%20Evidence%20Shown.pptx)

## Live demo

[Open inzulolwazi](https://inzulolwazi-api.onrender.com/#/)

This proof of concept serves a curated local claim set, searchable evidence cards, an explicit abstention state, and an English/isiZulu presentation. The current search is ranked by a local TF-IDF retrieval module and uses only the local content files. It does not call a model. Draft claims stay visibly marked until content reviewers approve their sources, grades, and translations.

The visual palette is Arid Mirage: twilight blue `#1A365D`, desert sand `#E2D4C9`, arid clay `#7A6F62`, and terracotta `#E67E22`.

## What you can do in the app

- Search as you type (press `/` from anywhere). Results are research leads while every topic is a draft, with matched words highlighted.
- Explore topics and sources with filters and sorting, open a topic to see its translation label, what it still needs before publication, and its evidence.
- Copy or download citations as plain text, BibTeX or RIS. Print a topic. Share a link.
- Use the same data through the open JSON API: see `docs/api.md` and `/api/v1/openapi.json`.

## Deploy

See `docs/deployment.md`: the backend on Render (`render.yaml`) and the frontend on Vercel (`vercel.json`), or Render alone.

## Run

The app has no runtime dependencies. The checks were run on Node.js 22.

```sh
npm install   # dev dependencies only, needed for lint, type check and eval
npm run dev
```

Then open http://localhost:3000.

## Current commands

- Install: `npm install`
- Run dev server: `npm run dev`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Tests: `npm test`
- Validate content: `npm run validate:content`
- Run evaluation: `npm run eval`
- Everything at once: `npm run check`

## Development dependencies

None of these ship with the app. Each was added for one job (AGENTS.md rule 23):

- `eslint`, `@eslint/js`, `globals`: linting.
- `typescript`, `@types/node`: type checking the JavaScript through its JSDoc types (`npm run typecheck`).
- `yaml`: reading `eval/questions.yaml`.

## Evaluation

`npm run eval` runs the questions in `eval/questions.yaml` against the pipeline and writes `eval/results/latest.md`. Results are reported per language and per claim and are never averaged across languages. While no claim is published, groundedness and citation accuracy are reported as "not measured", not as a score. `eval/results/translation-review.csv` is a sheet for a fluent isiZulu reviewer. Three questions are listed as known issues, where retrieval matches generic words such as "history" or "people". Fix these before publishing any claim.

## Content status

The six starter topics in `content/claims.json` follow the supplied design brief. They are drafts, not publishable historical claims. Source records are research leads for editorial review; the app will not present draft topics as answers. Add only reviewed, open-access or permissioned sources, and record reviewer sign-off before changing a draft to `published`.

## Architecture

- `backend/server.mjs`: HTTP routes and static file serving
- `backend/pipeline.mjs`: retrieval, grounding checks, cited answer formatting, and abstention
- `backend/validate/content.mjs`: content metadata validation
- `frontend/`: mobile-first interface and client-side interactions
- `ml/tfidf.mjs`: local TF-IDF model for claim ranking
- `content/`: reviewable JSON claim and source records

The backend exposes `GET /api/claims`, `GET /api/sources`, and `POST /api/search` with `{ "question": "..." }`.

All factual answers come from local claim statements with their linked source records. When a query does not match the curated corpus, the app abstains.
