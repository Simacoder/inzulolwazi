# API

Read-only JSON API, versioned under `/api/v1`. Open to any website (CORS `*`). The route table in `backend/routes.mjs` drives both the server and the OpenAPI 3.1 document at `GET /api/v1/openapi.json`, so the docs cannot drift from the code (a test checks this).

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service status and counts |
| GET | `/meta` | Counts, grade and source-type definitions, languages, example questions, limits |
| GET, POST | `/search?q=` or `{"question": ""}` | Search. Drafts come back as research leads, never as answers |
| GET | `/claims` | List topics. Filters: `status`, `sourceType`, `q`, `sort` (`topic`, `sources`, `year`), `limit` (1–50), `offset` |
| GET | `/claims/{id}` | One topic with sources, labelled translation and publication checklist |
| GET | `/claims/{id}/cite` | Citations for every source behind a topic |
| GET | `/sources` | List sources. Filters: `type`, `claim`, `q`, `sort`, `limit`, `offset` |
| GET | `/sources/{id}` | One source and the topics that cite it |
| GET | `/sources/{id}/cite` | One citation |

| GET | `/glossary` | Defined terms. Filter: `q`, `limit`, `offset` |
| GET | `/glossary/{id}` | One term with sources and its African-centred framing |
| GET | `/chronology` | Dated events in order. Filters: `q`, `from`, `to` (years, negative for BC), `limit`, `offset` |

Search responses also carry `terms` and `timeline` arrays: terms whose name, alias or definition match the question, and events matching its words or a year it names.

Citation endpoints take `format=text|bibtex|ris` and `download=true` for a file download.

## Behaviour

- **Errors** use `{"error": {"code", "message"}}` with 400 `invalid_parameter` / `invalid_json`, 404 `not_found`, 405 `method_not_allowed` (with `Allow`), 413 `payload_too_large`, 429 `rate_limited` (with `Retry-After`).
- **Rate limit:** 120 requests a minute per address by default (`RATE_LIMIT_PER_MINUTE`). Headers `X-RateLimit-Limit` and `X-RateLimit-Remaining` are sent.
- **Search results** carry `strength` (`close`, `partial`, `loose`). This is how alike the words are. It does not say a topic answers the question or is true.
- **Logging:** a search logs retrieved ids, scores and the question length, never the question text (AGENTS.md rule 21).
- The first three unversioned routes (`/api/claims`, `/api/sources`, `POST /api/search`) are kept unchanged for compatibility.
