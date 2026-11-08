# inzulolwazi

African history, told by Africans, with the evidence shown.

This proof of concept serves a curated local claim set, searchable evidence cards, an explicit abstention state, and an English/isiZulu presentation. The current search is ranked by a local TF-IDF retrieval module and uses only the local content files. It does not call a model. Draft claims stay visibly marked until content reviewers approve their sources, grades, and translations.

The visual palette is Arid Mirage: twilight blue `#1A365D`, desert sand `#E2D4C9`, arid clay `#7A6F62`, and terracotta `#E67E22`.

## Run

Requires Node.js 20 or newer. There are no third-party dependencies.

```sh
npm run dev
```

Then open http://localhost:3000.

## Current commands

- Install: no dependencies
- Run dev server: `npm run dev`
- Lint: not configured
- Type check: not configured
- Tests: not configured
- Validate content: `npm run validate:content`
- Run evaluation: not configured

## Content status

The five starter topics in `content/claims.json` follow the supplied design brief. They are drafts, not publishable historical claims. Source records are research leads for editorial review; the app will not present draft topics as answers. Add only reviewed, open-access or permissioned sources, and record reviewer sign-off before changing a draft to `published`.

## Architecture

- `backend/server.mjs`: HTTP routes and static file serving
- `backend/pipeline.mjs`: retrieval, grounding checks, cited answer formatting, and abstention
- `backend/validate/content.mjs`: content metadata validation
- `frontend/`: mobile-first interface and client-side interactions
- `ml/tfidf.mjs`: local TF-IDF model for claim ranking
- `content/`: reviewable JSON claim and source records

The backend exposes `GET /api/claims`, `GET /api/sources`, and `POST /api/search` with `{ "question": "..." }`.

All factual answers come from local claim statements with their linked source records. When a query does not match the curated corpus, the app abstains.
