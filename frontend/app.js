const state = { language: 'en', claims: [], sources: [] };
const copy = {
  en: {
    navExplore: 'Explore', navMethod: 'Our method', eyebrow: 'A living library of African history',
    heroTitle: 'History has a story.<br /><em>Evidence gives it depth.</em>',
    heroText: 'Explore questions about the past through African scholarship, archaeology, and other cited sources. See what supports an idea, what complicates it, and where the record is still quiet.',
    searchKicker: 'START WITH A QUESTION', searchTitle: 'What would you like to know?', searchText: 'Every answer comes from the sources in this collection.',
    inputLabel: 'Ask a question about African history', searchPlaceholder: 'Ask about African history…', searchButton: 'Explore', try: 'TRY',
    collectionKicker: 'THE COLLECTION', collectionTitle: 'A few paths into the past', starterTopics: 'STARTER TOPICS',
    draftTitle: 'An honest beginning.', draftText: 'These starter cards are being prepared for review. Their framing is not a published historical answer.',
    methodKicker: 'HOW WE WORK', methodTitle: 'The evidence stays<br /><em>in the conversation.</em>',
    stepOneTitle: 'Start with sources', stepOneText: 'Answers are drawn from a reviewed collection, not from what a model happens to remember.',
    stepTwoTitle: 'Show the texture', stepTwoText: 'Source types, evidence, and scholarly disagreement are visible alongside each claim.',
    stepThreeTitle: 'Say when we don’t know', stepThreeText: 'When the collection has no reviewed answer, we say so. Gaps are a reason to keep learning.',
    footerLine: 'African history, told by Africans, with the evidence shown.', draft: 'DRAFT', exploreCard: 'View research notes', inReview: 'NOT YET REVIEWED',
    result: 'FROM THE COLLECTION', sources: 'SOURCE NOTES', notReviewed: 'This topic is still in research. The collection does not yet have a reviewed answer, so this card is shown as a draft rather than a historical verdict.',
    noSource: 'We don’t have a source for this yet.', noSourceDetail: 'Try a topic in the starter collection, or suggest a source for a future review.',
    answerTitle: 'What the collection can say', close: 'Close', copyCitation: 'Copy citation', copied: 'Copied', sourceType: 'Source type',
  },
  zu: {
    navExplore: 'Hlola', navMethod: 'Indlela yethu', eyebrow: 'Umtapo wolwazi ophilayo womlando wase-Afrika',
    heroTitle: 'Umlando unendaba yawo.<br /><em>Ubufakazi buyayijulisa.</em>',
    heroText: 'Hlola imibuzo yesikhathi esedlule ngemisebenzi yezifundiswa zase-Afrika, ukuvubukula, neminye imithombo ecashuniwe. Bona ukuthi yini esekela umbono, yini ewuxakayo, nokuthi ulwazi luthule kuphi.',
    searchKicker: 'QALA NGOMBuzo', searchTitle: 'Yini ongathanda ukuyazi?', searchText: 'Zonke izimpendulo zivela emithonjeni ekuleli qoqo.',
    inputLabel: 'Buza umbuzo ngomlando wase-Afrika', searchPlaceholder: 'Buza ngomlando wase-Afrika…', searchButton: 'Hlola', try: 'ZAMA',
    collectionKicker: 'IQOQO', collectionTitle: 'Izindlela ezimbalwa eziya esikhathini esedlule', starterTopics: 'IZIHLOKO ZOKUQALA',
    draftTitle: 'Isiqalo esithembekile.', draftText: 'Lawa makhadi alungiselelwa ukubuyekezwa. Awakabi yizimpendulo zomlando ezishicilelwe.',
    methodKicker: 'INDLELA ESISEBENZA NGAYO', methodTitle: 'Ubufakazi buhlala<br /><em>bukhona engxoxweni.</em>',
    stepOneTitle: 'Qala ngemithombo', stepOneText: 'Izimpendulo zithathwa eqoqweni elibuyekeziwe, hhayi kulokho imodeli ekukhumbulayo.',
    stepTwoTitle: 'Veza imininingwane', stepTwoText: 'Izinhlobo zemithombo, ubufakazi, nokungavumelani kwezifundiswa kubonakala eduze kwesimangalo ngasinye.',
    stepThreeTitle: 'Sisho uma singazi', stepThreeText: 'Uma iqoqo lingenayo impendulo ebuyekeziwe, siyakusho. Izikhala zisikhuthaza ukuba siqhubeke sifunde.',
    footerLine: 'Umlando wase-Afrika, oxoxwa ngabantu base-Afrika, nobufakazi obubonakalayo.', draft: 'OKUSALUNGISWA', exploreCard: 'Buka amanothi ocwaningo', inReview: 'AKUKABUYEKEZWA',
    result: 'OKUSEQOQWENI', sources: 'AMANOTHI OMTHOMBO', notReviewed: 'Lesi sihloko sisacwaningwa. Iqoqo alikabi nayo impendulo ebuyekeziwe, ngakho leli khadi liboniswa njengombhalo osalungiswa, hhayi njengesinqumo somlando.',
    noSource: 'Asinawo umthombo walokhu okwamanje.', noSourceDetail: 'Zama isihloko esiseqoqweni lokuqala noma uphakamise umthombo ozobuyekezwa kamuva.',
    answerTitle: 'Lokho okungashiwo iqoqo', close: 'Vala', copyCitation: 'Kopisha umthombo', copied: 'Ikopishiwe', sourceType: 'Uhlobo lomthombo',
  },
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const localized = (field) => field?.[state.language] || field?.en || '';

function applyLanguage() {
  document.documentElement.lang = state.language === 'zu' ? 'zu' : 'en';
  document.querySelectorAll('[data-copy]').forEach((element) => {
    const value = copy[state.language][element.dataset.copy];
    if (value) element.innerHTML = value;
  });
  document.querySelectorAll('[data-placeholder]').forEach((element) => element.placeholder = copy[state.language][element.dataset.placeholder]);
  document.querySelector('.lang-current').textContent = state.language === 'en' ? 'EN' : 'ZU';
  document.querySelector('#languageSwitch').setAttribute('aria-label', state.language === 'en' ? 'Switch to isiZulu' : 'Shintshela esiNgisini');
  renderClaims();
}

function renderClaims() {
  document.querySelector('#claimGrid').innerHTML = state.claims.map((claim, index) => `
    <article class="claim-card" tabindex="0" role="button" data-claim="${escapeHtml(claim.id)}" aria-label="${escapeHtml(claim.topic)}">
      <div class="card-top"><span class="topic-no">0${index + 1} / 05</span><span class="draft-chip">${copy[state.language].draft}</span></div>
      <h3>${escapeHtml(claim.topic)}</h3>
      <p>${escapeHtml(localized(claim.rationale))}</p>
      <div class="card-bottom"><span>${copy[state.language].exploreCard}</span><span class="card-arrow" aria-hidden="true">↗</span></div>
    </article>`).join('');
  document.querySelectorAll('.claim-card').forEach((card) => {
    card.addEventListener('click', () => showClaim(card.dataset.claim));
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showClaim(card.dataset.claim); } });
  });
}

function sourceMarkup(source) {
  const authors = source.authors?.length ? `${source.authors.join(', ')} · ` : '';
  const year = source.year ? `${source.year} · ` : '';
  return `<div class="source-row"><strong>${escapeHtml(source.title)}</strong><p>${escapeHtml(authors + year + source.venue)} · ${escapeHtml(source.sourceType || 'research lead')}</p><p>${escapeHtml(source.summary)}</p><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open source ↗</a></div>`;
}

function showClaim(id) {
  const claim = state.claims.find((item) => item.id === id);
  if (!claim) return;
  const sources = claim.sourceIds.map((sourceId) => state.sources.find((item) => item.id === sourceId)).filter(Boolean);
  const dialog = document.querySelector('#claimDialog');
  document.querySelector('#dialogContent').innerHTML = `<div class="dialog-body"><div class="section-kicker">${copy[state.language].inReview}</div><h2>${escapeHtml(claim.topic)}</h2><div class="language-pair"><div><span>ENGLISH · SOURCE TEXT</span><p class="dialog-statement">${escapeHtml(claim.statement.en)}</p></div><div><span>ISIZULU · MACHINE TRANSLATED, NOT YET REVIEWED</span><p class="dialog-statement" lang="zu">${escapeHtml(claim.translation.zu)}</p></div></div><div class="status-note">${escapeHtml(copy[state.language].notReviewed)}</div><h3>${copy[state.language].sources}</h3>${sources.length ? sources.map(sourceMarkup).join('') : '<p class="dialog-statement">No verified sources are attached to this draft.</p>'}<div class="dialog-actions"><button type="button" data-copy-citation="${escapeHtml(claim.id)}">${copy[state.language].copyCitation}</button><button type="button" data-share-card="${escapeHtml(claim.id)}">Download share card ↗</button></div></div>`;
  dialog.showModal();
  dialog.querySelector('[data-copy-citation]').addEventListener('click', async () => {
    const citations = sources.map((source) => `${source.authors?.join(', ') || 'Research record'}. (${source.year || 'n.d.'}). ${source.title}. ${source.venue}. ${source.url}`).join('\n');
    await navigator.clipboard?.writeText(citations || `inzulolwazi research draft: ${claim.topic}`);
    dialog.querySelector('[data-copy-citation]').textContent = copy[state.language].copied;
  });
  dialog.querySelector('[data-share-card]').addEventListener('click', () => downloadShareCard(claim));
}

function downloadShareCard(claim) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1A365D'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#E67E22'; ctx.font = '600 20px Arial'; ctx.fillText('INZULOLWAZI  ·  AFRICAN HISTORY, WITH THE EVIDENCE SHOWN', 70, 75);
  ctx.fillStyle = '#E2D4C9'; ctx.font = '700 48px Georgia';
  wrapCanvasText(ctx, claim.topic, 70, 175, 1000, 61, 3);
  ctx.fillStyle = '#E2D4C9'; ctx.font = '26px Arial';
  wrapCanvasText(ctx, claim.statement.en, 70, 365, 1000, 38, 3);
  ctx.fillStyle = '#E67E22'; ctx.font = '700 17px Arial'; ctx.fillText('DRAFT  ·  RESEARCH IN PROGRESS', 70, 550);
  ctx.fillStyle = '#E2D4C9'; ctx.font = '18px Arial'; ctx.fillText(`${window.location.host}${window.location.pathname}#${claim.id}`, 70, 590);
  const link = document.createElement('a');
  link.download = `inzulolwazi-${claim.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = word; lines += 1;
      if (lines >= maxLines) break;
    } else line = next;
  }
  if (lines < maxLines && line) ctx.fillText(line, x, y + lines * lineHeight);
}

function renderAnswer(result, question) {
  const wrap = document.querySelector('#answerWrap');
  wrap.hidden = false;
  const items = result.citations?.length ? result.citations.map((source) => `<div class="citation-item">[${source.number}] <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a> · ${escapeHtml(source.venue)}</div>`).join('') : '';
  const matchingDrafts = result.matches?.map((claim) => `<button type="button" class="draft-chip" data-open-claim="${escapeHtml(claim.id)}">${escapeHtml(claim.topic)} ↗</button>`).join('') || '';
  wrap.innerHTML = `<div class="answer-panel"><div class="answer-heading"><div class="section-kicker">${copy[state.language].result}</div><span class="draft-chip">${escapeHtml(copy[state.language].inReview)}</span></div><h2 class="sr-only">${copy[state.language].answerTitle}</h2><p class="answer-text ${result.abstained ? 'abstain' : ''}">${escapeHtml(result.abstained ? copy[state.language].noSource : result.answer)}</p>${result.abstained ? `<div class="status-note">${escapeHtml(result.matches?.length ? copy[state.language].notReviewed : copy[state.language].noSourceDetail)}</div>` : ''}${items ? `<div class="answer-citations"><div class="citation-title">${copy[state.language].sources}</div>${items}</div>` : ''}${matchingDrafts ? `<div class="dialog-actions">${matchingDrafts}</div>` : ''}<p class="question-echo">${escapeHtml(question)}</p></div>`;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  wrap.querySelectorAll('[data-open-claim]').forEach((button) => button.addEventListener('click', () => showClaim(button.dataset.openClaim)));
}

async function search(question) {
  if (!question.trim()) return;
  const response = await fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
  const result = await response.json();
  renderAnswer(result, question);
}

document.querySelector('#languageSwitch').addEventListener('click', () => { state.language = state.language === 'en' ? 'zu' : 'en'; applyLanguage(); });
document.querySelector('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); search(new FormData(event.currentTarget).get('question')); });
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#question').value = button.dataset.query; search(button.dataset.query); }));
document.querySelector('#claimDialog').addEventListener('click', (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });

try {
  const response = await fetch('/api/claims');
  state.claims = await response.json();
  const sourceResponse = await fetch('/api/sources');
  state.sources = await sourceResponse.json();
  applyLanguage();
} catch {
  document.querySelector('#claimGrid').innerHTML = '<p>Could not load the collection. Start the local server and refresh.</p>';
}
