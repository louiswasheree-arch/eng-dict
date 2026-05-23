const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('.'));

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60;

// Quick Vietnamese fallback for words without full database entries
const viDictionary = {
  "resilient": "kiên cường, dẻo dai",
  "analyze": "phân tích",
  "break": "làm vỡ, phá vỡ",
  "make": "làm, tạo ra",
  "look": "nhìn, xem",
  "happy": "vui vẻ, hạnh phúc",
  "advance": "tiến bộ, phát triển",
  "achieve": "đạt được",
  "approach": "tiếp cận, phương pháp",
  "assess": "đánh giá",
  "benefit": "lợi ích, có lợi",
  "challenge": "thử thách, thách thức",
  "concept": "khái niệm",
  "context": "bối cảnh, ngữ cảnh",
  "contribute": "đóng góp",
  "create": "tạo ra, sáng tạo",
  "demonstrate": "chứng minh, thể hiện",
  "develop": "phát triển",
  "effective": "hiệu quả",
  "environment": "môi trường",
  "establish": "thành lập, thiết lập",
  "evaluate": "đánh giá, thẩm định",
  "evidence": "bằng chứng",
  "factor": "yếu tố, nhân tố",
  "focus": "tập trung, tiêu điểm",
  "function": "chức năng, hoạt động",
  "impact": "tác động, ảnh hưởng",
  "identify": "xác định, nhận diện",
  "implement": "thực hiện, triển khai",
  "indicate": "chỉ ra, biểu thị",
  "involve": "liên quan, bao gồm",
  "maintain": "duy trì, bảo trì",
  "method": "phương pháp",
  "occur": "xảy ra, xuất hiện",
  "participate": "tham gia",
  "process": "quy trình, xử lý",
  "provide": "cung cấp",
  "significant": "quan trọng, đáng kể",
  "structure": "cấu trúc, kết cấu",
  "theory": "lý thuyết",
  "undergo": "trải qua",
  "variable": "biến số, thay đổi"
};

// FULL DATABASE: Add new words here to get collocations, phrasal verbs & word forms
const internalLexicon = {
  "resilient": {
    collocations: ["highly resilient", "emotionally resilient", "resilient community", "remain resilient"],
    phrasalVerbs: [],
    wordForms: ["resilient (adj)", "resilience (n)", "resiliently (adv)"]
  },
  "analyze": {
    collocations: ["analyze data", "carefully analyze", "analyze results", "critically analyze"],
    phrasalVerbs: [],
    wordForms: ["analyze (v)", "analysis (n)", "analytic (adj)", "analytically (adv)"]
  },
  "break": {
    collocations: ["break the law", "break a record", "break the ice", "break even"],
    phrasalVerbs: [
      { phrase: "break down", meaning: "to stop working / lose emotional control" },
      { phrase: "break up", meaning: "to end a relationship" },
      { phrase: "break in", meaning: "to enter illegally / wear until comfortable" },
      { phrase: "break out", meaning: "to escape / start suddenly" }
    ],
    wordForms: ["break (v)", "broke (past)", "broken (pp)", "breakable (adj)", "breakdown (n)"]
  },
  "make": {
    collocations: ["make a decision", "make progress", "make sense", "make an effort"],
    phrasalVerbs: [
      { phrase: "make up", meaning: "to invent / reconcile after arguing" },
      { phrase: "make out", meaning: "to see/hear with difficulty" },
      { phrase: "make for", meaning: "to head toward a place" }
    ],
    wordForms: ["make (v)", "made (past/pp)", "maker (n)", "makeshift (adj)"]
  },
  "look": {
    collocations: ["look forward to", "look into", "look up to", "look after"],
    phrasalVerbs: [
      { phrase: "look up", meaning: "to search for information / improve" },
      { phrase: "look down on", meaning: "to regard as inferior" },
      { phrase: "look into", meaning: "to investigate" },
      { phrase: "look out", meaning: "to be careful" }
    ],
    wordForms: ["look (v/n)", "looked (v)", "looker (n)", "looking (adj)"]
  },
  "happy": {
    collocations: ["happy ending", "happy memory", "happy occasion", "perfectly happy"],
    phrasalVerbs: [],
    wordForms: ["happy (adj)", "happiness (n)", "happily (adv)", "unhappy (adj)"]
  },
  "advance": {
    collocations: ["advance technology", "advance rapidly", "advance in career", "advance payment"],
    phrasalVerbs: [
      { phrase: "advance on", meaning: "to move toward something/someone" }
    ],
    wordForms: ["advance (v/n)", "advanced (adj)", "advancement (n)", "advantage (n)"]
  },
  "achieve": {
    collocations: ["achieve success", "achieve goals", "achieve results", "easily achieve"],
    phrasalVerbs: [],
    wordForms: ["achieve (v)", "achievement (n)", "achievable (adj)", "achiever (n)"]
  },
  "approach": {
    collocations: ["different approach", "scientific approach", "approach to learning", "careful approach"],
    phrasalVerbs: [],
    wordForms: ["approach (v/n)", "approached (v)", "approaching (adj)", "unapproachable (adj)"]
  },
  "assess": {
    collocations: ["assess the situation", "assess risk", "accurately assess", "assess performance"],
    phrasalVerbs: [],
    wordForms: ["assess (v)", "assessment (n)", "assessor (n)", "assessable (adj)"]
  },
  "benefit": {
    collocations: ["benefit from", "mutual benefit", "health benefits", "financial benefit"],
    phrasalVerbs: [],
    wordForms: ["benefit (v/n)", "beneficial (adj)", "beneficiary (n)", "benefited (v)"]
  },
  "challenge": {
    collocations: ["face a challenge", "major challenge", "challenge accepted", "overcome challenges"],
    phrasalVerbs: [],
    wordForms: ["challenge (v/n)", "challenged (adj)", "challenging (adj)", "challenger (n)"]
  },
  "concept": {
    collocations: ["basic concept", "abstract concept", "concept of freedom", "key concept"],
    phrasalVerbs: [],
    wordForms: ["concept (n)", "conceptual (adj)", "conceptually (adv)", "conception (n)"]
  },
  "context": {
    collocations: ["historical context", "social context", "in context", "out of context"],
    phrasalVerbs: [],
    wordForms: ["context (n)", "contextual (adj)", "contextually (adv)", "contextualize (v)"]
  },
  "contribute": {
    collocations: ["contribute to", "contribute significantly", "contribute ideas", "willing to contribute"],
    phrasalVerbs: [],
    wordForms: ["contribute (v)", "contribution (n)", "contributor (n)", "contributory (adj)"]
  },
  "create": {
    collocations: ["create opportunities", "create value", "create awareness", "create a plan"],
    phrasalVerbs: [],
    wordForms: ["create (v)", "creation (n)", "creative (adj)", "creatively (adv)", "creator (n)"]
  },
  "demonstrate": {
    collocations: ["demonstrate ability", "clearly demonstrate", "demonstrate knowledge", "demonstrate a method"],
    phrasalVerbs: [],
    wordForms: ["demonstrate (v)", "demonstration (n)", "demonstrator (n)", "demonstrable (adj)"]
  },
  "develop": {
    collocations: ["develop skills", "develop rapidly", "develop a strategy", "develop relationships"],
    phrasalVerbs: [],
    wordForms: ["develop (v)", "development (n)", "developer (n)", "developing (adj)", "developed (adj)"]
  },
  "effective": {
    collocations: ["highly effective", "effective method", "effective communication", "cost-effective"],
    phrasalVerbs: [],
    wordForms: ["effective (adj)", "effectively (adv)", "effectiveness (n)", "ineffective (adj)"]
  },
  "environment": {
    collocations: ["natural environment", "working environment", "protect the environment", "learning environment"],
    phrasalVerbs: [],
    wordForms: ["environment (n)", "environmental (adj)", "environmentally (adv)", "environmentalist (n)"]
  },
  "establish": {
    collocations: ["establish a company", "establish rules", "firmly establish", "establish contact"],
    phrasalVerbs: [],
    wordForms: ["establish (v)", "establishment (n)", "established (adj)", "reestablish (v)"]
  },
  "evaluate": {
    collocations: ["evaluate performance", "evaluate options", "carefully evaluate", "evaluate effectiveness"],
    phrasalVerbs: [],
    wordForms: ["evaluate (v)", "evaluation (n)", "evaluator (n)", "evaluable (adj)"]
  },
  "evidence": {
    collocations: ["strong evidence", "scientific evidence", "evidence suggests", "lack of evidence"],
    phrasalVerbs: [],
    wordForms: ["evidence (n)", "evident (adj)", "evidently (adv)", "evidence-based (adj)"]
  },
  "factor": {
    collocations: ["key factor", "contributing factor", "risk factor", "deciding factor"],
    phrasalVerbs: [],
    wordForms: ["factor (n)", "factorial (adj)", "factorization (n)"]
  },
  "focus": {
    collocations: ["focus on", "main focus", "focus group", "lose focus"],
    phrasalVerbs: [],
    wordForms: ["focus (v/n)", "focused (adj)", "focusing (v)", "refocus (v)"]
  },
  "function": {
    collocations: ["function properly", "main function", "function of the heart", "social function"],
    phrasalVerbs: [],
    wordForms: ["function (v/n)", "functional (adj)", "functionality (n)", "functionally (adv)"]
  },
  "impact": {
    collocations: ["significant impact", "impact on society", "environmental impact", "have an impact"],
    phrasalVerbs: [],
    wordForms: ["impact (v/n)", "impacted (adj)", "impactful (adj)"]
  },
  "identify": {
    collocations: ["identify problems", "identify opportunities", "easily identify", "identify trends"],
    phrasalVerbs: [],
    wordForms: ["identify (v)", "identification (n)", "identifier (n)", "identifiable (adj)"]
  },
  "implement": {
    collocations: ["implement a plan", "implement changes", "successfully implement", "implement policy"],
    phrasalVerbs: [],
    wordForms: ["implement (v)", "implementation (n)", "implementer (n)", "implemented (adj)"]
  },
  "indicate": {
    collocations: ["clearly indicate", "research indicates", "indicate a problem", "indicate willingness"],
    phrasalVerbs: [],
    wordForms: ["indicate (v)", "indication (n)", "indicator (n)", "indicative (adj)"]
  },
  "involve": {
    collocations: ["involve in", "heavily involve", "involve risks", "process involves"],
    phrasalVerbs: [],
    wordForms: ["involve (v)", "involvement (n)", "involved (adj)", "involving (prep)"]
  },
  "maintain": {
    collocations: ["maintain standards", "maintain contact", "maintain balance", "maintain speed"],
    phrasalVerbs: [],
    wordForms: ["maintain (v)", "maintenance (n)", "maintainable (adj)", "maintainer (n)"]
  },
  "method": {
    collocations: ["scientific method", "teaching method", "effective method", "research method"],
    phrasalVerbs: [],
    wordForms: ["method (n)", "methodical (adj)", "methodically (adv)", "methodology (n)"]
  },
  "occur": {
    collocations: ["occur naturally", "occur frequently", "occur to me", "error occurs"],
    phrasalVerbs: [],
    wordForms: ["occur (v)", "occurrence (n)", "occurring (v)", "occasional (adj)"]
  },
  "participate": {
    collocations: ["participate in", "actively participate", "participate fully", "willing to participate"],
    phrasalVerbs: [],
    wordForms: ["participate (v)", "participation (n)", "participant (n)", "participatory (adj)"]
  },
  "process": {
    collocations: ["decision-making process", "learning process", "industrial process", "slow process"],
    phrasalVerbs: [],
    wordForms: ["process (v/n)", "processing (n)", "processor (n)", "processed (adj)"]
  },
  "provide": {
    collocations: ["provide information", "provide support", "provide opportunities", "provide assistance"],
    phrasalVerbs: [],
    wordForms: ["provide (v)", "provision (n)", "provider (n)", "provided (conj/adj)"]
  },
  "significant": {
    collocations: ["significant impact", "statistically significant", "significant difference", "highly significant"],
    phrasalVerbs: [],
    wordForms: ["significant (adj)", "significantly (adv)", "significance (n)", "insignificant (adj)"]
  },
  "structure": {
    collocations: ["organizational structure", "sentence structure", "flexible structure", "power structure"],
    phrasalVerbs: [],
    wordForms: ["structure (v/n)", "structural (adj)", "structurally (adv)", "structured (adj)"]
  },
  "theory": {
    collocations: ["scientific theory", "theory of relativity", "put into theory", "test a theory"],
    phrasalVerbs: [],
    wordForms: ["theory (n)", "theoretical (adj)", "theoretically (adv)", "theorist (n)"]
  },
  "undergo": {
    collocations: ["undergo surgery", "undergo changes", "undergo training", "undergo examination"],
    phrasalVerbs: [],
    wordForms: ["undergo (v)", "underwent (past)", "undergone (pp)"]
  },
  "variable": {
    collocations: ["independent variable", "dependent variable", "control variable", "highly variable"],
    phrasalVerbs: [],
    wordForms: ["variable (n/adj)", "variability (n)", "variably (adv)", "invariable (adj)"]
  }
};

const wordsOfTheDay = [
  { word: "serendipity", ipa: "/ˌser.əndɪp.ə.ti/", meaning: "the occurrence of events by chance in a happy way", vi: "sự tình cờ may mắn", example: "Finding this café was pure serendipity." },
  { word: "ephemeral", ipa: "/ɪˈfem.ər.əl/", meaning: "lasting for a very short time", vi: "phù du, ngắn ngủi", example: "Social media trends are often ephemeral." },
  { word: "ubiquitous", ipa: "/juːˈbɪk.wɪ.təs/", meaning: "present, appearing, or found everywhere", vi: "có mặt khắp nơi", example: "Smartphones have become ubiquitous in modern society." },
  { word: "resilient", ipa: "/rɪˈzɪl.i.ənt/", meaning: "able to recover quickly from difficulties", vi: "kiên cường, dẻo dai", example: "Children are remarkably resilient." },
  { word: "analyze", ipa: "/æn.ə.laɪz/", meaning: "to examine something in detail", vi: "phân tích", example: "Scientists analyze the data before publishing results." }
];

function generateFallbackIPA(word) {
  return `/${word}/`;
}

app.get('/api/dictionary', async (req, res) => {
  try {
    const { word, type } = req.query;
    if (!word) return res.status(400).json({ error: 'Missing word parameter' });

    const cleanWord = word.toLowerCase().trim();
    const cleanType = type ? type.toLowerCase() : '';
    const cacheKey = cleanWord + (cleanType ? `_${cleanType}` : '');
    
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const internal = internalLexicon[cleanWord] || {};

    let result = {
      word: cleanWord,
      ipa: generateFallbackIPA(cleanWord),
      audioUrl: null,
      meanings: [
        { vi: viDictionary[cleanWord] || 'Chưa có bản dịch', en: 'Definition not available', example: '' }
      ],
      wordForms: internal.wordForms || [],
      collocations: internal.collocations || [],
      phrasalVerbs: internal.phrasalVerbs || []
    };

    try {
      let dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`;
      if (cleanType) dictUrl += `?type=${cleanType}`;

      const dictRes = await fetch(dictUrl, { signal: AbortSignal.timeout(5000) });
      
      if (dictRes.ok) {
        const entries = await dictRes.json();
        if (entries && entries.length > 0) {
          const entry = entries[0];
          let viTranslation = viDictionary[cleanWord] || 'Chưa có bản dịch';
          
          if (!viDictionary[cleanWord]) {
            try {
              const viRes = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`,
                { signal: AbortSignal.timeout(3000) }
              );
              const viData = await viRes.json();
              if (viData.responseData?.translatedText && !viData.responseData.translatedText.includes('WARNING')) {
                viTranslation = viData.responseData.translatedText;
              }
            } catch (e) { console.log('Translation API failed'); }
          }

          result = {
            word: cleanWord,
            ipa: entry.phonetic || entry.phonetics?.[0]?.text || generateFallbackIPA(cleanWord),
            audioUrl: entry.phonetics?.find(p => p.audio)?.audio || null,
            meanings: entry.meanings.map(m => ({
              vi: viTranslation,
              en: m.definitions[0]?.definition || 'No definition',
              example: m.definitions[0]?.example || ''
            })),
            wordForms: internal.wordForms || [],
            collocations: internal.collocations || [],
            phrasalVerbs: internal.phrasalVerbs || []
          };
        }
      }
    } catch (apiErr) { console.log('Dictionary API failed, using offline'); }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return res.json(result);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal error', meanings: [{ vi: 'Lỗi', en: 'Try again', example: '' }], wordForms: [], collocations: [], phrasalVerbs: [] });
  }
});

app.get('/api/word-of-day', (req, res) => {
  const dayIndex = new Date().getDate() % wordsOfTheDay.length;
  res.json(wordsOfTheDay[dayIndex]);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});