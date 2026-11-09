# Adding oral testimony

Oral accounts from elders and community historians are first-class in this project. They are also the one source type we cannot write for people, so every entry comes from the speaker or the community that holds the right to share it.

## Before anything goes in `content/sources.json`

1. **Consent first.** The speaker (or the community's recognised rights holder) agrees to be recorded, to this use, and to a public, searchable summary. Record the date. Anything without `consent.status: "granted"` fails validation and is not loaded (AGENTS.md rule 17).
2. **Rights holder.** Name who holds the right to share (a person, family or community body). Do not store names of private individuals without their written agreement. Use a community or role label if they prefer.
3. **No recordings or transcripts in the repo.** Store our own short summary only, and keep the audio with the community (AGENTS.md rule 16).
4. **Say who says what.** "Elders of X community describe…", never "oral history proves…".
5. **Honour flags.** Respect any "private" or "do not translate" request in code and in the summary.

## Entry template

```json
{
  "id": "src_oral_<community>_<year>_<n>",
  "title": "Short descriptive title of the account",
  "authors": ["Speaker or community label, as agreed"],
  "year": 2026,
  "venue": "Where and how it was shared (e.g. community gathering, place)",
  "sourceType": "oral_testimony",
  "licence": "Shared with permission",
  "url": "Link to the community's own page, or the project record",
  "doi": null,
  "authorBackground": "Role in the community, as the speaker wishes it stated",
  "summary": "Our own short summary of what was said.",
  "consent": { "status": "granted", "recordedOn": "YYYY-MM-DD" },
  "language": "isiZulu",
  "place": "Place of the account",
  "date": "YYYY-MM-DD",
  "rightsHolder": "Who holds the right to share it"
}
```

Check the exact required field names in `ORAL_TESTIMONY_FIELDS` in `backend/schema.mjs`, then run `npm run validate:content`. Link the entry from the claims it speaks to, and set its role in the review notes (supports, complicates or opposes) so disagreement stays visible.
