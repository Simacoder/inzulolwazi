# ML retrieval layer

The prototype uses a corpus-fitted TF-IDF vectorizer with cosine similarity to rank claim records. It runs locally in JavaScript and uses the same reviewed JSON corpus as the backend. No external service, hosted model, training data export, or API key is required.

This is a transparent lexical baseline, not a generative model or semantic embedding model. The answer stage still abstains unless it finds a published claim with two evidence entries and reviewer sign-off. Track ranking quality in `eval/` before replacing this baseline or publishing answers.

The ML boundary is `rankDocuments(query, documents)` in `tfidf.mjs`. A future embedding or reranking provider can replace that boundary while keeping retrieval, grounding, answer validation, translation, and rendering as separate pipeline stages.
