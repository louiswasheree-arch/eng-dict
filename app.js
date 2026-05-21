document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('main section');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  if (!navLinks.length || !sections.length) {
    console.error('Critical HTML structure missing');
    return;
  }

  let currentWord = '';

  // === TAB NAVIGATION ===
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      console.log('Switching to tab:', targetId);

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(sec => {
        sec.classList.toggle('hidden', sec.id !== targetId);
      });

      // Load exercises when switching to that tab
      if (targetId === 'exercises') {
        try {
          if (typeof renderExercises === 'function') {
            renderExercises(currentWord || 'resilient');
          }
        } catch (err) {
          console.warn('Exercises failed to load:', err.message);
        }
      }
    });
  });

  // === DICTIONARY SEARCH ===
  if (searchBtn && searchInput) {
    const performSearch = async () => {
      currentWord = searchInput.value.trim().toLowerCase();
      if (!currentWord) return;

      console.log('Searching for:', currentWord);
      if (loading) loading.classList.remove('hidden');
      if (error) error.classList.add('hidden');
      if (results) results.classList.add('hidden');

      try {
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(currentWord)}`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid server response');
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Word not found');

        renderDictionaryResults(data);
      } catch (err) {
        console.error('Search error:', err);
        if (error) {
          error.textContent = err.message || 'Failed to fetch data';
          error.classList.remove('hidden');
        }
      } finally {
        if (loading) loading.classList.add('hidden');
      }
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  // === RENDER DICTIONARY RESULTS ===
  function renderDictionaryResults(data) {
    if (!results) return;

    const wordForms = data.wordForms || [];
    const collocations = data.collocations || [];
    const phrasalVerbs = data.phrasalVerbs || [];
    const meanings = data.meanings || [];

    let html = `
      <div class="result-card">
        <h2>${data.word || 'Unknown'}</h2>
        <div class="pronunciation">
          <span class="ipa">${data.ipa || '/.../'}</span>
          <button class="audio-btn" id="playAudioBtn" title="Play pronunciation">
            <i class="fas fa-volume-high"></i>
          </button>
          ${data.audioUrl ? '<span class="audio-status">Real audio</span>' : '<span class="audio-status">Speech synthesis</span>'}
        </div>
        <div class="meanings">
          ${meanings.map(m => `
            <div class="meaning-item">
              <div class="vi">${m.vi || ''}</div>
              <div class="def">${m.en || ''}</div>
              ${m.example ? `<div class="example">"${m.example}"</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (wordForms.length > 0) {
      html += `
        <div class="expandable reveal">
          <h3>Word Forms <i class="fas fa-chevron-down"></i></h3>
          <ul>${wordForms.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>`;
    }

    if (collocations.length > 0) {
      html += `
        <div class="expandable reveal">
          <h3>Common Collocations <i class="fas fa-chevron-down"></i></h3>
          <ul>${collocations.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>`;
    }

    if (phrasalVerbs.length > 0) {
      html += `
        <div class="expandable reveal">
          <h3>Phrasal Verbs & Idioms <i class="fas fa-chevron-down"></i></h3>
          <ul>${phrasalVerbs.map(p => `<li><strong>${p.phrase}</strong>: ${p.meaning}</li>`).join('')}</ul>
        </div>`;
    }

    results.innerHTML = html;
    results.classList.remove('hidden');
    setupExpandables();
    setupAudio(data.word, data.audioUrl);
  }

  // === EXPANDABLE SECTIONS ===
  function setupExpandables() {
    document.querySelectorAll('.expandable h3').forEach(h3 => {
      h3.style.cursor = 'pointer';
      h3.addEventListener('click', () => {
        const ul = h3.nextElementSibling;
        const icon = h3.querySelector('i');
        const isOpen = ul.style.display !== 'none';
        ul.style.display = isOpen ? 'none' : 'block';
        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    });
  }

  // === AUDIO PLAYBACK ===
  function setupAudio(word, url) {
    const btn = document.getElementById('playAudioBtn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
      if (url) {
        new Audio(url).play().catch(() => speak(word));
      } else {
        speak(word);
      }
    });
  }

  function speak(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 1.15; // Faster playback
    u.pitch = 1.0;
    speechSynthesis.cancel(); // Clear queue to prevent delays
    speechSynthesis.speak(u);
  }

  // === WORD OF THE DAY ===
  async function loadWordOfTheDay() {
    try {
      const res = await fetch('/api/word-of-day');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const container = document.getElementById('word-of-day-container');
      if (container) {
        container.innerHTML = `
          <div class="word-card">
            <h3>${data.word}</h3>
            <span class="ipa">${data.ipa}</span>
            <p><strong>${data.meaning}</strong></p>
            <p><strong>${data.vi}</strong></p>
            <p class="example">"${data.example}"</p>
          </div>`;
      }
    } catch (err) {
      console.warn('Word of the Day failed:', err.message);
    }
  }

  // === INITIALIZATION ===
  sections.forEach(sec => {
    sec.classList.toggle('hidden', sec.id !== 'dictionary');
  });

  loadWordOfTheDay();
  console.log('App ready.');
});