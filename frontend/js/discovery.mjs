/**
 * Comparative discovery learning material. Each historical summary is paired with its source.
 * The lens quiz is a transparent scoring activity, not a demographic or identity classifier.
 */
export const DISCOVERY_CASES = [
  {
    id: 'deep-time-africa', region: 'African histories', title: 'Deep-time invention in southern Africa',
    period: 'c. 44,000–42,000 years ago',
    finding: 'Border Cave research describes changing tool-making, worked bone, ornaments and symbolic markings. The authors interpret the change as developing through internal regional processes; scholars still debate parts of the chronology and interpretation.',
    lens: 'Start with African makers and material evidence. The archaeological record supports technological skill; it does not by itself prove a formal number system.',
    factors: ['Material knowledge', 'Local continuity and change', 'Interpretation stays open'],
    sources: [{ label: 'd’Errico et al., PNAS (2012)', url: 'https://doi.org/10.1073/pnas.1202629109' }],
    quizLens: 'africanAgency',
  },
  {
    id: 'african-counting-evidence', region: 'African histories', title: 'Notched bones and early counting questions',
    period: 'Deep time · interpretation debated',
    finding: 'A study of organic artefacts from Border Cave re-examines notched bones and interprets some as possible notation. The marks are material evidence; their exact use and whether they represent mathematical counting remain interpretive questions.',
    lens: 'African artefacts belong in the history of knowledge and mathematics. Strong framing recognizes the evidence while distinguishing an interpretation of marks from a proven number system.',
    factors: ['African archaeological record', 'Evidence and interpretation kept distinct', 'Mathematical history beyond written texts'],
    sources: [{ label: 'd’Errico et al., PNAS (2012)', url: 'https://doi.org/10.1073/pnas.1204213109' }],
    quizLens: 'africanAgency',
  },
  {
    id: 'great-zimbabwe', region: 'African histories', title: 'Great Zimbabwe and Indian Ocean exchange',
    period: 'c. 11th–15th centuries',
    finding: 'Archaeological research links Great Zimbabwe to regional and Indian Ocean exchange and studies local gold production. Imported objects show connection; local production and African decision-making remain central to the account.',
    lens: 'Trade is not a one-way story of outside arrival. Read the city through its African makers, regional relationships and the material evidence of exchange.',
    factors: ['Local production', 'Regional and oceanic networks', 'Archaeology and heritage records'],
    sources: [
      { label: 'Vieri et al., Archaeological and Anthropological Sciences (2023)', url: 'https://doi.org/10.1007/s12520-023-01811-7' },
      { label: 'UNESCO World Heritage Centre', url: 'https://whc.unesco.org/en/list/364/' },
    ],
    quizLens: 'africanAgency',
  },
  {
    id: 'islamic-world', region: 'West Asian, North African and connected scholarly worlds', title: 'Astronomy across the medieval Islamic world',
    period: '8th–11th centuries and beyond',
    finding: 'Scholars translated and worked with Greek, Persian and Sanskrit material in Arabic, recorded local star knowledge, improved observation and calculation, and developed astronomical models. Support came from multiple courts and cities, including Baghdad, Cairo, Rayy and Isfahan.',
    lens: 'Knowledge travelled across languages and communities, then was adapted to local scholarly questions, religious practice and political patronage.',
    factors: ['Translation and critique', 'Court and city patronage', 'Practical and theoretical inquiry'],
    sources: [{ label: 'Marika Sardar, The Metropolitan Museum of Art (2011)', url: 'https://www.metmuseum.org/essays/astronomy-and-astrology-in-the-medieval-islamic-world' }],
    quizLens: 'islamicNetworks',
  },
  {
    id: 'song-china', region: 'East Asian histories', title: 'Printing and knowledge in China',
    period: 'from around 700 CE',
    finding: 'The Met dates printing on paper in China to around 700 CE. Buddhist communities helped drive early reproduction of texts and images; later urban readers and markets supported further uses of print.',
    lens: 'An invention becomes influential through the communities, institutions, materials and audiences that use it. This history connects religious practice, craft, commerce and communication.',
    factors: ['Craft and reproduction', 'Religious institutions', 'Urban audiences and markets'],
    sources: [{ label: 'The Metropolitan Museum of Art, The Printed Image in China', url: 'https://www.metmuseum.org/exhibitions/listings/2012/printed-image-in-china' }],
    quizLens: 'eastAsianInstitutions',
  },
  {
    id: 'european-enlightenment', region: 'European histories', title: 'Enlightenment-era institutions and public exchange',
    period: '17th–18th centuries',
    finding: 'The Royal Society organized observation, experiments, correspondence and publication. Its early fellows came from professional and aristocratic classes and were men; scientific participation was structured by access and status.',
    lens: 'European scientific institutions helped make some kinds of inquiry durable and visible. Their achievements should be studied alongside the networks they drew on and the people they excluded.',
    factors: ['Scientific societies and journals', 'Correspondence and publication', 'Unequal access to institutions'],
    sources: [{ label: 'The Royal Society, institutional history', url: 'https://royalsociety.org/about-us/who-we-are/history/' }],
    quizLens: 'europeanInstitutions',
  },
  {
    id: 'russian-exploration', region: 'Russian histories', title: 'Mapping Russia through state-backed inquiry',
    period: '18th century',
    finding: 'Historian Denis Shaw describes the Russian Academy of Sciences, founded in 1724–25, and state-directed mapping and expeditions. These projects developed geographical knowledge while also serving imperial security, resource assessment and state-building.',
    lens: 'Inquiry can expand a society’s knowledge while serving concentrated state power. Ask who set the research agenda, who benefited and what the maps made governable.',
    factors: ['State patronage', 'Mapping and exploration', 'Knowledge linked to imperial aims'],
    sources: [{ label: 'Denis J. B. Shaw, UCL Press (2024)', url: 'https://doi.org/10.14324/111.9781800085909' }],
    quizLens: 'russianStateBuilding',
  },
  {
    id: 'colonial-legacies', region: 'African histories', title: 'Colonial rule and uneven institutional legacies',
    period: '19th century to the present',
    finding: 'A major review of African development research documents colonial investments in infrastructure and human capital alongside extractive institutions, indirect rule and concessionary agreements. Its authors emphasize variation, continuity, rupture and open questions across places and periods.',
    lens: 'Colonial rule reshaped African institutions and economies, but it did not erase African agency or produce one uniform outcome. Compare regions and mechanisms, and test which effects persisted instead of treating colonization as a single explanation for every later condition.',
    factors: ['Extraction and infrastructure', 'Different local outcomes', 'Persistence and change both studied'],
    sources: [{ label: 'Michalopoulos & Papaioannou, Journal of Economic Literature (2020)', url: 'https://doi.org/10.1257/jel.20181447' }],
    quizLens: 'africanAgency',
  },
];

export const LENS_LABELS = {
  africanAgency: 'African agency and knowledge',
  islamicNetworks: 'Islamic-world knowledge networks',
  eastAsianInstitutions: 'East Asian institutions and audiences',
  europeanInstitutions: 'European institutions and publication',
  russianStateBuilding: 'Russian state-backed exploration',
};

export const QUIZ_QUESTIONS = [
  { prompt: 'What can the study of notched bones from Border Cave support?', source: { label: 'd’Errico et al., PNAS (2012)', url: 'https://doi.org/10.1073/pnas.1204213109' }, options: [
    { text: 'Some researchers interpret the marks as possible notation, while their exact meaning remains open', correct: true, why: 'The study interprets some artefacts as evidence of notational use; the marks do not by themselves prove a formal number system.' },
    { text: 'A written alphabet used across the continent', correct: false, why: 'The cited archaeological study does not establish a written alphabet.' },
    { text: 'A proven formal number system with a known calculation method', correct: false, why: 'The material evidence does not establish the exact meaning or a formal calculation system.' },
  ] },
  { prompt: 'What is one evidence-based way to describe Great Zimbabwe?', source: { label: 'Vieri et al. (2023)', url: 'https://doi.org/10.1007/s12520-023-01811-7' }, options: [
    { text: 'An African city with local production and regional and Indian Ocean connections', correct: true, why: 'Archaeological work studies local gold production and the city’s exchange networks.' },
    { text: 'A settlement created by foreign traders', correct: false, why: 'The cited sources centre African settlement and production.' },
    { text: 'A site isolated from wider exchange', correct: false, why: 'Finds and scholarship document regional and long-distance connections.' },
  ] },
  { prompt: 'What happened in medieval astronomy across the Islamic world?', source: { label: 'Marika Sardar, The Met (2011)', url: 'https://www.metmuseum.org/essays/astronomy-and-astrology-in-the-medieval-islamic-world' }, options: [
    { text: 'Scholars translated and revised knowledge across Greek, Persian and Sanskrit traditions', correct: true, why: 'The Met account describes translation, new observations and refinement of astronomical models.' },
    { text: 'All research took place in one Baghdad institution', correct: false, why: 'The source also names Cairo, Rayy, Isfahan and other centres.' },
    { text: 'Earlier knowledge was copied without new observations', correct: false, why: 'The source describes updating methods, observations, instruments and models.' },
  ] },
  { prompt: 'What helped early printing develop in China?', source: { label: 'The Metropolitan Museum of Art', url: 'https://www.metmuseum.org/exhibitions/listings/2012/printed-image-in-china' }, options: [
    { text: 'Reproducing Buddhist texts and images, alongside later urban uses', correct: true, why: 'The Met links early printing with Buddhist practice and later growth in urban audiences.' },
    { text: 'European academies importing a printing system', correct: false, why: 'The cited source dates printing on paper in China to around 700 CE.' },
    { text: 'Printing used only for government maps', correct: false, why: 'The source describes religious, artistic and popular uses.' },
  ] },
  { prompt: 'How did the early Royal Society circulate and evaluate knowledge?', source: { label: 'The Royal Society', url: 'https://royalsociety.org/about-us/who-we-are/history/' }, options: [
    { text: 'Through observation, experiments, correspondence and publication', correct: true, why: 'The Society’s history describes these practices and its early journal.' },
    { text: 'By admitting every social group on equal terms from its beginning', correct: false, why: 'Its own history says early fellows were male and drawn from professional and aristocratic classes.' },
    { text: 'By avoiding communication beyond Britain', correct: false, why: 'It used correspondence and elected members across Europe and the Atlantic world.' },
  ] },
  { prompt: 'What did Russian state-backed scientific exploration do in the 18th century?', source: { label: 'Denis J. B. Shaw, UCL Press (2024)', url: 'https://doi.org/10.14324/111.9781800085909' }, options: [
    { text: 'Supported mapping and expeditions tied to state-building and imperial aims', correct: true, why: 'Historian Denis Shaw connects the Academy and expeditions to mapping, security and resource assessment.' },
    { text: 'Developed entirely outside state influence', correct: false, why: 'The study describes centralized state planning and patronage.' },
    { text: 'Focused only on abstract philosophy', correct: false, why: 'The source documents mapping and geographical expeditions.' },
  ] },
  { prompt: 'What does research on colonial legacies in Africa emphasize?', source: { label: 'Michalopoulos & Papaioannou (2020)', url: 'https://doi.org/10.1257/jel.20181447' }, options: [
    { text: 'Both lasting institutional effects and substantial variation across places', correct: true, why: 'The review documents extractive institutions and colonial investments while noting continuity, rupture and open questions.' },
    { text: 'One uniform colonial experience explains every present outcome', correct: false, why: 'Comparative research studies varied institutions and mechanisms.' },
    { text: 'Colonial rule had no institutional or economic effects', correct: false, why: 'The reviewed evidence examines significant effects and asks where they persisted.' },
  ] },
];

export const LENS_QUESTIONS = [
  'Which knowledge history would you like to explore next?',
  'Which set of questions interests you most?',
  'Which case would you compare more closely?',
].map((prompt) => ({ prompt, options: [
  { text: LENS_LABELS.africanAgency, lens: 'africanAgency' },
  { text: LENS_LABELS.islamicNetworks, lens: 'islamicNetworks' },
  { text: LENS_LABELS.eastAsianInstitutions, lens: 'eastAsianInstitutions' },
  { text: LENS_LABELS.europeanInstitutions, lens: 'europeanInstitutions' },
  { text: LENS_LABELS.russianStateBuilding, lens: 'russianStateBuilding' },
] }));

export function scoreQuiz(answers, lensAnswers) {
  const lensCounts = Object.fromEntries(Object.keys(LENS_LABELS).map((key) => [key, 0]));
  let correct = 0;
  QUIZ_QUESTIONS.forEach((question, index) => {
    const choice = question.options[answers[index]];
    if (!choice) return;
    if (choice.correct) correct += 1;
  });
  LENS_QUESTIONS.forEach((question, index) => {
    const choice = question.options[lensAnswers[index]];
    if (choice) lensCounts[choice.lens] += 1;
  });
  return {
    correct,
    lensMix: Object.entries(lensCounts).filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ label: LENS_LABELS[key], count })),
  };
}

export function updateLocalLeaderboard(current, score) {
  return [...current, { score, date: new Date().toISOString() }]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, 10);
}
