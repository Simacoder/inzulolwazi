# Design

Status: draft. App name: `inzulolwazi`.

## 1. Who it is for
- **The curious reader**, often a student or young adult, who saw a claim about African history on WhatsApp, TikTok, or in class and wants to know what the evidence says.
- **The teacher**, who needs a citable source to bring to a class.
- **The family elder or community member**, who may later contribute oral testimony (expansion).

**DECIDE:** pick one primary persona for the demo and write one sentence about her or him.

## 2. Promise and tone
**Promise (draft):** "African history, told by Africans, with the evidence shown."

Tone: calm, specific, respectful. Confident where the evidence is strong, plain about uncertainty. No slogans like "the real history" or "the truth they hid", because they claim authority the app does not need and invite attack on the brand instead of the method.

## 3. Principles
1. **Evidence before verdict.** Show what supports a claim and what complicates it, then the grade.
2. **Uncertainty is not weakness.** "Contested" is a designed state with its own clear layout, not an error.
3. **African voices are visible.** Author, institution, and source type appear on every source card.
4. **Language is a bridge.** Original and translation sit side by side. Machine translation is labelled.
5. **Built for the phone and the share.** Small pages, readable on a cheap device, and designed to be sent on WhatsApp.

## 4. Screens

### 4.1 Home
- Search box ("Ask about African history").
- A few featured claims (the 5 demo claims) as cards with their grade chips.
- Language switch (English / isiZulu) at the top.
- A short "How we work" link that explains grading and source types.

### 4.2 Answer page
Shown after a question.
- Answer text in short paragraphs. Each sentence carries a numbered citation.
- A source list below, each with type chip, author, year, and link.
- Link to the matching claim card where one exists.
- **Abstention state:** "We don't have a source for this yet." Offers related claims and a "suggest a source" link. No invented answer.

### 4.3 Claim card (the core screen)
Top to bottom:
1. **Claim statement**, in careful wording.
2. **Grade chip** with one-sentence rationale.
3. **Evidence panel.** Sources grouped by type (archaeology, linguistics, genetics, scholarship, colonial record, critical commentary, oral testimony). Each shows its role: supports, complicates, or opposes.
4. **What is contested** (when applicable).
5. **Term history note** (when a loaded term appears), collapsed by default and expandable.
6. **Language panel.** English and isiZulu side by side, with a "machine translated" or "reviewed by" label. Low-confidence passages are marked.
7. **Share** button and **cite this page** (copyable reference).
8. **Reviewed by** line with names, roles, and date.

### 4.4 Source card
Title, author, institution, year, licence, type, our short summary, link out. A line on how the source is used in the corpus and a note if it is commentary rather than primary evidence.

### 4.5 Share card
A single image and link, built for WhatsApp.
- Claim statement, grade chip, and two or three key evidence lines.
- Language version matches the sender's current language.
- Footer: app name, URL, "evidence shown".
- The link opens the claim card, with the preview image and title set for messaging apps.

### 4.6 About and method
How claims are chosen, how grades work (definitions), who reviews, how translation is handled, what the app does not claim. Short and plain.

## 5. Grade chips
Use text labels, not colour alone, and keep the set small and neutral.

| Grade | Label | Meaning shown to the user |
|---|---|---|
| well_established | Well established | Multiple independent lines of evidence agree |
| broadly_accepted_details_contested | Broadly accepted, details debated | The core is accepted, specifics are disputed |
| contested | Contested | Scholars disagree, and we show both sides |
| partly_supported | Partly supported | The popular version overreaches, the core holds |
| unsupported | Unsupported | No credible evidence in our sources |
| insufficient_sources | Not enough sources yet | We cannot say, and we are not guessing |

Avoid red and green for "true" and "false". The categories are not a binary.

## 6. Visual direction
**DECIDE:** the visual identity. Guidance:
- Typography that renders isiZulu characters and long words cleanly, with generous line height.
- A restrained palette, strong contrast, and a distinct accent for the grade chips.
- Pattern or imagery drawn from African design is welcome, but it should be chosen by you, credited if from others, and never used as decoration over the evidence.
- Light and dark mode.
- Photographs of artefacts and sites only when licensed. Credit every image.

## 7. Accessibility and performance
- Mobile first. Touch targets of at least 44 px.
- Works on slow connections and low-end devices. Keep the initial page small, avoid heavy scripts, and server-render claim pages.
- Sufficient colour contrast and keyboard navigation. Chips and labels are readable by screen readers.
- Set the correct language attribute on translated text so assistive technology pronounces it properly.
- No autoplay audio or video.
- Data-light mode: no images except the share card.

## 8. Language and translation UX
- Default to the language of the browser, and let the user switch at any time.
- Show a label on translated content: "Machine translated, not yet reviewed by a speaker" or "Reviewed by [name]".
- Keep names, places, and loaded terms unchanged unless the glossary provides an approved equivalent. Show the English term in brackets the first time.
- Flag low-confidence passages with a small marker and a tooltip.
- Offer "Report a translation problem" on every translated card. Feed these into the review queue.
- Write for natural spoken isiZulu where possible. A reviewer should check naturalness, not only correctness.

## 9. Content design rules
- One idea per sentence, plain words, no jargon without a short explanation.
- Always say who says what: "Archaeologists at X found…", "Oral accounts held by Y community describe…".
- Never describe ancient peoples with modern racial labels unless the sources do, and then attribute.
- Use "built by Egyptians, in Africa" style statements that the evidence supports, not claims about skin colour.
- Describe contested points as contested, and name the disagreement.

## 10. Demo claims
Starter set. Each needs sources, a grade, and reviewer sign-off before it is used.

| # | Topic | Intended angle | Likely grade | Watch out for |
|---|---|---|---|---|
| 1 | Khoisan | The term is a 20th-century construct that flattens distinct peoples | Well established | Keep the claim about the term, not about people who claim the identity |
| 2 | Pyramids | Built by ancient Egyptians, workers' town and tombs at Giza | Well established | Avoid modern racial labels for ancient Egyptians |
| 3 | Counting bones (Lebombo, Ishango) | Among the oldest known counting artefacts | Established as artefacts, contested as mathematics | Never say "the oldest maths" |
| 4 | Language history and the term "Bantu" | Related languages, with a term-history note and a debated migration model | Broadly accepted, details debated | Do not assert the relationship is fake, and do not present the migration model as settled |
| 5 | Trade and Great Zimbabwe | Large African trade networks, and colonial misattribution of the ruins | Well established | Great Zimbabwe is in Zimbabwe, related sites are elsewhere |

All dates, names, and attributions come from the sources, not from this table. Verify each one before it appears in the app.

## 11. Demo script (about 2 minutes)
1. **The problem (15 s).** A claim circulating on WhatsApp. One sentence on why it matters.
2. **Search (20 s).** Ask a question. Show the grounded answer with citations.
3. **Claim card (40 s).** Walk through the grade, the evidence by type, and the term-history note.
4. **Abstention (15 s).** Ask something the corpus cannot answer. Show the honest "no source yet".
5. **isiZulu (20 s).** Switch language. Show side-by-side text and the machine-translated label.
6. **Share (10 s).** Generate the share card and open it on a phone.
7. **Evidence of rigour (10 s).** Show the evaluation table (groundedness, abstention, translation review).

## 12. Open decisions
- **Decided:** name is `inzulolwazi`; promise is “African history, told by Africans, with the evidence shown.” Visual identity remains to be reviewed.
- **DECIDE:** primary persona.
- **DECIDE:** the 5 claims and their grades, after source review.
- **DECIDE:** who reviews English content and who reviews isiZulu.
- **DECIDE:** how reports and corrections from the public are handled in the expansion.
