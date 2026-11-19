# ML retrieval layer

The prototype uses a corpus-fitted TF-IDF vectorizer with cosine similarity to rank claim records. It runs locally in JavaScript and uses the same reviewed JSON corpus as the backend. No external service, hosted model, training data export, or API key is required.

This is a transparent lexical baseline, not a generative model or semantic embedding model. The answer stage still abstains unless it finds a published claim with two evidence entries and reviewer sign-off. Track ranking quality in `eval/` before replacing this baseline or publishing answers.

The ML boundary is `rankDocuments(query, documents)` in `tfidf.mjs`. A future embedding or reranking provider can replace that boundary while keeping retrieval, grounding, answer validation, translation, and rendering as separate pipeline stages.

## Knowledge model

The learner-facing model lives in `frontend/js/knowledge-model.mjs` so it ships with the static frontend and runs in the browser. It is a Bayesian item-response model with partial pooling across topics, and it estimates a score, a confidence label and a study plan from quiz answers. It is not trained on data yet, and nothing it computes leaves the browser. See `docs/discovery-and-audience.md` for the method, limits and privacy, and `tests/knowledge-model.test.mjs` for its checks.
