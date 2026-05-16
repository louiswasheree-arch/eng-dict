document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const wordType = document.getElementById('wordType');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('main section');

  let currentSearchWord = '';

  // Tab Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      console.log('Switching to tab:', targetId);

      // Update active nav
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show target section, hide others
      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });

      // Load exercises if switching to that tab
      if (targetId === 'exercises' && currentSearchWord) {
        if (typeof renderExercises === 'function') {
          renderExercises(currentSearchWord);
        }
      }
    });
  });

  // Audio Playback
  function playAudio(word, audioUrl) {
    if (audioUrl) {
      new Audio(audioUrl).play().catch(() => fallbackSpeech(word));
    } else {
      fallbackSpeech(word);
    }
  }

  function fallbackSpeech(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }

  // Dictionary Search
  async function searchWord() {
    const word = searchInput.value.trim().toLowerCase();
    if (!word) return;

    currentSearchWord = word;
    console.log('Searching for:', word);

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    results.classList.add('hidden');

    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}&type=${wordType.value}`);
      if (!res.ok) throw new Error('Word not found');
      
      const data = await res.json();
      renderDictionaryResults(data);
      
      // If exercises tab is active, load exercises
      const activeTab = document.querySelector('nav a.active');
      if (activeTab && activeTab.getAttribute('href') === '#exercises') {
        if (typeof renderExercises === 'function') {
          setTimeout(() => renderExercises(word), 500);
        }
      }
    } catch (err) {
      error.textContent = err.message || 'Failed to fetch data. Try another word.';
      error.classList.remove('hidden');
    } finally {
      loading.classList.add('hidden');
    }
  }

  function renderDictionaryResults(data) {
    const audioUrl = data.audioUrl;
    const word = data.word;

    results.innerHTML = `
      <div class="result-card">
        <h2 style="text-transform: capitalize; margin-bottom: 0.5rem;">${word}</h2>
        <div class="pronunciation">
          <span class="ipa">${data.ipa}</span>
          <button class="audio-btn" id="playAudioBtn" title="Listen">
            <i class="fas fa-volume-high"></i>
          </button>
          ${audioUrl ? '<span style="font-size: 0.85rem; color: var(--success); margin-left: 0.5rem;">Real audio</span>' : '<span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 0.5rem;">Speech synthesis</span>'}
        </div>
        <div class="meanings">
          ${data.meanings.map(m => `
            <div class="meaning-item">
              <div class="vi">${m.vi}</div>
              <div class="def">${m.en}</div>
              ${m.example ? `<div class="example">"${m.example}"</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      ${data.wordForms && data.wordForms.length > 0 ? `
      <div class="expandable reveal">
        <h3>Word Forms</h3>
        <ul>${data.wordForms.map(w => `<li>${w}</li>`).join('')}</ul>
      </div>
      ` : ''}

      ${data.collocations && data.collocations.length > 0 ? `
      <div class="expandable reveal">
        <h3>Common Collocations</h3>
        <ul>${data.collocations.map(c => `<li>${c}</li>`).join('')}</ul>
      </div>
      ` : ''}

      ${data.phrasalVerbs && data.phrasalVerbs.length > 0 ? `
      <div class="expandable reveal">
        <h3>Phrasal Verbs & Idioms</h3>
        <ul>${data.phrasalVerbs.map(p => `<li><strong>${p.phrase}</strong>: ${p.meaning}</li>`).join('')}</ul>
      </div>
      ` : ''}
    `;
    
    results.classList.remove('hidden');
    setupExpandables();
    
    document.getElementById('playAudioBtn')?.addEventListener('click', () => playAudio(word, audioUrl));
  }

  function setupExpandables() {
    document.querySelectorAll('.expandable h3').forEach(h3 => {
      h3.style.cursor = 'pointer';
      h3.addEventListener('click', () => {
        const ul = h3.nextElementSibling;
        const isOpen = ul.style.display !== 'none';
        ul.style.display = isOpen ? 'none' : 'block';
      });
    });
  }

  // Event Listeners
  searchBtn.addEventListener('click', searchWord);
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchWord();
  });

  // Initialize: Show dictionary tab by default
  sections.forEach(sec => {
    if (sec.id === 'dictionary') {
      sec.classList.remove('hidden');
    } else {
      sec.classList.add('hidden');
    }
  });

  console.log('App setup complete');
});