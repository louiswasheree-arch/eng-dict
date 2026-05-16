const internalLexicon = {
  "resilient": {
    collocations: ["highly resilient", "emotionally resilient", "resilient community", "resilient infrastructure", "remain resilient"],
    phrasalVerbs: [],
    wordForms: ["resilient (adj)", "resilience (n)", "resiliently (adv)"]
  },
  "analyze": {
    collocations: ["analyze data", "carefully analyze", "analyze results", "critically analyze", "analyze information"],
    phrasalVerbs: [],
    wordForms: ["analyze (v)", "analysis (n)", "analytic (adj)", "analytically (adv)", "analyzer (n)"]
  },
  "break": {
    collocations: ["break the law", "break a record", "break the ice", "break even", "break a habit"],
    phrasalVerbs: [
      {phrase: "break down", meaning: "to stop working (machines) / lose emotional control"},
      {phrase: "break up", meaning: "to end a relationship"},
      {phrase: "break in", meaning: "to enter illegally / wear until comfortable"},
      {phrase: "break out", meaning: "to escape / start suddenly"}
    ],
    wordForms: ["break (v)", "broke (past)", "broken (pp)", "breakable (adj)", "breakdown (n)", "breaker (n)"]
  },
  "make": {
    collocations: ["make a decision", "make progress", "make sense", "make an effort", "make a difference"],
    phrasalVerbs: [
      {phrase: "make up", meaning: "to invent a story / reconcile after arguing"},
      {phrase: "make out", meaning: "to see/hear with difficulty"},
      {phrase: "make for", meaning: "to head toward a place"},
      {phrase: "make off", meaning: "to leave quickly / escape"}
    ],
    wordForms: ["make (v)", "made (past/pp)", "maker (n)", "makeshift (adj)"]
  },
  "look": {
    collocations: ["look forward to", "look into", "look up to", "look after", "look like"],
    phrasalVerbs: [
      {phrase: "look up", meaning: "to search for information / improve"},
      {phrase: "look down on", meaning: "to regard as inferior"},
      {phrase: "look into", meaning: "to investigate"},
      {phrase: "look out", meaning: "to be careful"},
      {phrase: "look back", meaning: "to think about the past"}
    ],
    wordForms: ["look (v/n)", "looked (v)", "looker (n)", "looking (adj)"]
  },
  "happy": {
    collocations: ["happy ending", "happy memory", "happy occasion", "perfectly happy"],
    phrasalVerbs: [],
    idioms: [
      {phrase: "happy-go-lucky", meaning: "carefree and cheerful"},
      {phrase: "trigger-happy", meaning: "too eager to use weapons"}
    ],
    wordForms: ["happy (adj)", "happiness (n)", "happily (adv)", "unhappy (adj)"]
  }
};
// Word of the Day endpoint
const wordsOfTheDay = [
  {
    word: "serendipity",
    ipa: "/ˌser.ənˈdɪp.ə.ti/",
    meaning: "the occurrence of events by chance in a happy way",
    vi: "sự tình cờ may mắn",
    example: "Finding this café was pure serendipity."
  },
  {
    word: "ephemeral",
    ipa: "/ɪˈfem.ər.əl/",
    meaning: "lasting for a very short time",
    vi: "phù du, ngắn ngủi",
    example: "Social media trends are often ephemeral."
  },
  {
    word: "ubiquitous",
    ipa: "/juːˈbɪk.wɪ.təs/",
    meaning: "present, appearing, or found everywhere",
    vi: "có mặt khắp nơi",
    example: "Smartphones have become ubiquitous in modern society."
  }
];

app.get('/api/word-of-day', (req, res) => {
  const today = new Date();
  const dayIndex = today.getDate() % wordsOfTheDay.length;
  res.json(wordsOfTheDay[dayIndex]);
});