const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('.'));

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60;

// Lightweight internal lexicon (contest-ready, high-quality academic/everyday words)
const internalLexicon = {
  "resilient": {
    collocations: ["highly resilient", "emotionally resilient", "resilient community", "resilient infrastructure"],
    phrasalVerbs: [],
    wordForms: ["resilient (adj)", "resilience (n)", "resiliently (adv)"]
  },
  "analyze": {
    collocations: ["analyze data", "carefully analyze", "analyze results", "critically analyze"],
    phrasalVerbs: [{phrase: "analyze out", meaning: "to separate components through analysis"}],
    wordForms: ["analyze (v)", "analysis (n)", "analytic (adj)", "analytically (adv)"]
  },
  "break": {
    collocations: ["break the law", "break a record", "break the ice", "break even"],
    phrasalVerbs: [
      {phrase: "break down", meaning: "to stop working / lose emotional control"},
      {phrase: "break up", meaning: "to end a relationship"},
      {phrase: "break in", meaning: "to enter illegally / wear until comfortable"}
    ],
    wordForms: ["break (v)", "broke (past)", "broken (pp)", "breakable (adj)", "breakdown (n)"]
  },
  "make": {
    collocations: ["make a decision", "make progress", "make sense", "make an effort"],
    phrasalVerbs: [
      {phrase: "make up", meaning: "to invent / reconcile after arguing"},
      {phrase: "make out", meaning: "to see/hear with difficulty"},
      {phrase: "make for", meaning: "to head toward a place"}
    ],
    wordForms: ["make (v)", "made (past/pp)", "maker (n)", "makeshift (adj)"]
  },
  "look": {
    collocations: ["look forward to", "look into", "look up to", "look after"],
    phrasalVerbs: [
      {phrase: "look up", meaning: "to search for information"},
      {phrase: "look down on", meaning: "to regard as inferior"},
      {phrase: "look into", meaning: "to investigate"}
    ],
    wordForms: ["look (v)", "looked (v)", "looker (n)", "looking (adj)"]
  }
};

app.get('/api/dictionary', async (req, res) => {
  const { word } = req.query;
  if (!word) return res.status(400).json({ error: 'Missing word' });

  const cleanWord = word.toLowerCase().trim();
  const cached = cache.get(cleanWord);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return res.json(cached.data);

  // Always have this internal fallback ready
  const internal = internalLexicon[cleanWord] || {};

  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`, { 
      signal: AbortSignal.timeout(3000) // 3s timeout prevents hanging
    });
    
    if (!dictRes.ok) throw new Error('API unavailable');
    const entry = (await dictRes.json())[0];

    let viTranslation = 'Chưa có bản dịch';
    try {
      const viRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`, {
        signal: AbortSignal.timeout(2000)
      });
      const viData = await viRes.json();
      if (viData.responseData?.translatedText) viTranslation = viData.responseData.translatedText;
    } catch (e) { /* silent fail for translation */ }

    const result = {
      word: cleanWord,
      ipa: entry.phonetic || entry.phonetics?.[0]?.text || '/.../',
      audioUrl: entry.phonetics?.find(p => p.audio)?.audio || null,
      meanings: entry.meanings.map(m => ({
        vi: viTranslation,
        en: m.definitions[0]?.definition || 'No definition',
        example: m.definitions[0]?.example || ''
      })),
      wordForms: internal.wordForms || [],
      collocations: internal.collocations || [],
      phrasalVerbs: internal.phrasalVerbs || [],
      source: 'online'
    };

    cache.set(cleanWord, {  result, timestamp: Date.now() });
    res.json(result);

  } catch (error) {
    console.warn(`⚠️ API failed for "${cleanWord}". Using offline fallback.`);
    // Return internal data if available, otherwise a graceful empty structure
    if (internal.wordForms?.length || internal.collocations?.length) {
      res.json({
        word: cleanWord,
        ipa: '/.../',
        audioUrl: null,
        meanings: [{ vi: 'Bản dịch offline', en: 'API temporarily unavailable. Showing local data.', example: '' }],
        wordForms: internal.wordForms || [],
        collocations: internal.collocations || [],
        phrasalVerbs: internal.phrasalVerbs || [],
        source: 'offline'
      });
    } else {
      res.status(404).json({ error: 'Word not found in database' });
    }
  }
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`);
  console.log(`💡 Local access: http://localhost:${PORT}`);
  console.log(`📱 Network access: 192.168.1.7>:${PORT}`);
});