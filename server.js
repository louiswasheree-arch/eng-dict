const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('.'));

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Offline Vietnamese dictionary (prevents API rate limits)
const viDictionary = {
  "resilient": "kiên cường, dẻo dai, có khả năng phục hồi",
  "analyze": "phân tích",
  "break": "làm vỡ, phá vỡ, nghỉ giải lao",
  "make": "làm, tạo ra, chế tạo",
  "look": "nhìn, xem, trông",
  "happy": "vui vẻ, hạnh phúc",
  "ubiquitous": "có mặt khắp nơi",
  "benefit": "lợi ích, có lợi",
  "significant": "quan trọng, đáng kể",
  "approach": "tiếp cận, phương pháp",
  "consistent": "nhất quán, kiên định",
  "enhance": "nâng cao, cải thiện",
  "collaborate": "hợp tác, cộng tác",
  "ephemeral": "phù du, ngắn ngủi, tạm thời",
  "serendipity": "sự tình cờ may mắn",
  "analysis": "sự phân tích",
  "resilience": "sự kiên cường, khả năng phục hồi"
};

// Internal lexicon for collocations, phrasal verbs, and word forms
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
      { phrase: "break down", meaning: "to stop working (machines) / lose emotional control" },
      { phrase: "break up", meaning: "to end a relationship" },
      { phrase: "break in", meaning: "to enter illegally / wear until comfortable" },
      { phrase: "break out", meaning: "to escape / start suddenly" }
    ],
    wordForms: ["break (v)", "broke (past)", "broken (pp)", "breakable (adj)", "breakdown (n)", "breaker (n)"]
  },
  "make": {
    collocations: ["make a decision", "make progress", "make sense", "make an effort", "make a difference"],
    phrasalVerbs: [
      { phrase: "make up", meaning: "to invent a story / reconcile after arguing" },
      { phrase: "make out", meaning: "to see/hear with difficulty" },
      { phrase: "make for", meaning: "to head toward a place" },
      { phrase: "make off", meaning: "to leave quickly / escape" }
    ],
    wordForms: ["make (v)", "made (past/pp)", "maker (n)", "makeshift (adj)"]
  },
  "look": {
    collocations: ["look forward to", "look into", "look up to", "look after", "look like"],
    phrasalVerbs: [
      { phrase: "look up", meaning: "to search for information / improve" },
      { phrase: "look down on", meaning: "to regard as inferior" },
      { phrase: "look into", meaning: "to investigate" },
      { phrase: "look out", meaning: "to be careful" },
      { phrase: "look back", meaning: "to think about the past" }
    ],
    wordForms: ["look (v/n)", "looked (v)", "looker (n)", "looking (adj)"]
  },
  "happy": {
    collocations: ["happy ending", "happy memory", "happy occasion", "perfectly happy"],
    phrasalVerbs: [],
    wordForms: ["happy (adj)", "happiness (n)", "happily (adv)", "unhappy (adj)"]
  }
};

// Word of the Day data
const wordsOfTheDay = [
  { word: "serendipity", ipa: "/ˌser.ənˈdp.ə.ti/", meaning: "the occurrence of events by chance in a happy way", vi: "sự tình cờ may mắn", example: "Finding this café was pure serendipity." },
  { word: "ephemeral", ipa: "/ˈfem.ər.əl/", meaning: "lasting for a very short time", vi: "phù du, ngắn ngủi", example: "Social media trends are often ephemeral." },
  { word: "ubiquitous", ipa: "/juːˈbɪk.wɪ.təs/", meaning: "present, appearing, or found everywhere", vi: "có mặt khắp nơi", example: "Smartphones have become ubiquitous in modern society." },
  { word: "resilient", ipa: "/rˈzɪl.i.ənt/", meaning: "able to recover quickly from difficulties", vi: "kiên cường, dẻo dai", example: "Children are remarkably resilient." },
  { word: "analyze", ipa: "/ˈæn.ə.laɪz/", meaning: "to examine something in detail", vi: "phân tích", example: "Scientists analyze the data before publishing results." }
];

// Helper: Fallback IPA generator
function generateFallbackIPA(word) {
  return `/${word}/`;
}

// Dictionary API endpoint
app.get('/api/dictionary', async (req, res) => {
  try {
    const { word } = req.query;
    if (!word) {
      return res.status(400).json({ error: 'Missing word parameter' });
    }

    const cleanWord = word.toLowerCase().trim();
    const cached = cache.get(cleanWord);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const internal = internalLexicon[cleanWord] || {};

    // Safe default response structure
    let result = {
      word: cleanWord,
      ipa: generateFallbackIPA(cleanWord),
      audioUrl: null,
      meanings: [
        {
          vi: viDictionary[cleanWord] || 'Chưa có bản dịch',
          en: 'Definition not available at this time',
          example: ''
        }
      ],
      wordForms: internal.wordForms || [],
      collocations: internal.collocations || [],
      phrasalVerbs: internal.phrasalVerbs || []
    };

    // Attempt external API fetch
    try {
      const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`, {
        signal: AbortSignal.timeout(5000)
      });

      if (dictRes.ok) {
        const entry = (await dictRes.json())[0];

        let viTranslation = viDictionary[cleanWord] || 'Chưa có bản dịch';

        // Only call translation API if not in offline dict
        if (!viDictionary[cleanWord]) {
          try {
            const viRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`, {
              signal: AbortSignal.timeout(3000)
            });
            const viData = await viRes.json();
            if (viData.responseData?.translatedText && !viData.responseData.translatedText.includes('WARNING')) {
              viTranslation = viData.responseData.translatedText;
            }
          } catch (translationError) {
            console.log('Translation API failed for:', cleanWord);
          }
        }

        result = {
          word: cleanWord,
          ipa: entry.phonetic || entry.phonetics?.[0]?.text || generateFallbackIPA(cleanWord),
          audioUrl: entry.phonetics?.find(p => p.audio)?.audio || null,
          meanings: entry.meanings.map(m => ({
            vi: viTranslation,
            en: m.definitions[0]?.definition || 'No definition available',
            example: m.definitions[0]?.example || ''
          })),
          wordForms: internal.wordForms || [],
          collocations: internal.collocations || [],
          phrasalVerbs: internal.phrasalVerbs || []
        };
      }
    } catch (apiError) {
      console.log('Dictionary API failed, using offline fallback for:', cleanWord);
    }

    // Cache and respond
    cache.set(cleanWord, { data: result, timestamp: Date.now() });
    return res.json(result);

  } catch (error) {
    console.error('Server error in /api/dictionary:', error);
    res.status(500).json({
      error: 'Internal server error',
      word: req.query.word || 'unknown',
      meanings: [{ vi: 'Lỗi hệ thống', en: 'Please try again later', example: '' }],
      wordForms: [],
      collocations: [],
      phrasalVerbs: []
    });
  }
});

// Word of the Day endpoint
app.get('/api/word-of-day', (req, res) => {
  try {
    const today = new Date();
    const dayIndex = today.getDate() % wordsOfTheDay.length;
    res.json(wordsOfTheDay[dayIndex]);
  } catch (error) {
    console.error('Word of the day error:', error);
    res.status(500).json({ error: 'Failed to load word of the day' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://0.0.0.0:${PORT}`);
});