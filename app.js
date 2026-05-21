document.addEventListener('DOMContentLoaded', () => {
  console.log('App initializing...');

  // === 1. DOM ELEMENTS ===
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const wordTypeSelect = document.getElementById('wordType'); // Dropdown
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('main section');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  if (!navLinks.length || !sections.length) {
    console.error('App initialization failed: Missing HTML structure');
    return;
  }

  let currentWord = '';

  // === 2. TAB NAVIGATION ===
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      console.log('Switching to tab:', targetId);

      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show target section
      sections.forEach(sec => {
        sec.classList.toggle('hidden', sec.id !== targetId);
      });

      // Trigger specific logic per tab
      if (targetId === 'exercises') {
        // Try to load exercises for the current word (or default to 'resilient')
        if (typeof window.renderExercises === 'function') {
          window.renderExercises(currentWord || 'resilient');
        } else {
          console.warn('Exercises module not loaded yet');
        }
      }
    });
  });

  // === 3. SEARCH FUNCTION ===
  if (searchBtn && searchInput) {
    const performSearch = async () => {
      currentWord = searchInput.value.trim().toLowerCase();
      if (!currentWord) return;

      console.log('Searching for:', currentWord);
      if (loading) loading.classList.remove('hidden');
      if (error) error.classList.add('hidden');
      if (results) results.classList.add('hidden');

      try {
        // Get the selected word type (noun, verb, adj, etc.)
        const selectedType = wordTypeSelect ? wordTypeSelect.value : '';
        
        // Build URL with type parameter if selected
        // The server will use this to filter the dictionary API response
        const typeParam = selectedType ? `&type=${encodeURIComponent(selectedType)}` : '';
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(currentWord)}${typeParam}`);
        
        if (!res.ok) throw new Error('Server returned an error');
        
        const data = await res.json();
        console.log('Data received:', data.word);
        renderDictionaryResults(data);
        
      } catch (err) {
        console.error('Search error:', err);
        if (error) {
          error.textContent = 'Failed to fetch data. Please try again.';
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

  // === 4. RENDER DICTIONARY RESULTS ===
  function renderDictionaryResults(data) {
    if (!results) return;

    const meanings = data.meanings || [];
    const wordForms = data.wordForms || [];
    const collocations = data.collocations || [];
    const phrasalVerbs = data.phrasalVerbs || [];

    // Base HTML
    let html = `
      <div class="result-card">
        <h2>${data.word || 'Unknown'}</h2>
        <div class="pronunciation">
          <span class="ipa">${data.ipa || '/.../'}</span>
          <button class="audio-btn" id="playAudioBtn" title="Listen">
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

    // Expandable: Word Forms
    if (wordForms.length > 0) {
      html += `
        <div class="expandable">
          <h3>Word Forms <i class="fas fa-chevron-down"></i></h3>
          <ul>${wordForms.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>`;
    }

    // Expandable: Collocations
    if (collocations.length > 0) {
      html += `
        <div class="expandable">
          <h3>Common Collocations <i class="fas fa-chevron-down"></i></h3>
          <ul>${collocations.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>`;
    }

    // Expandable: Phrasal Verbs
    if (phrasalVerbs.length > 0) {
      html += `
        <div class="expandable">
          <h3>Phrasal Verbs & Idioms <i class="fas fa-chevron-down"></i></h3>
          <ul>${phrasalVerbs.map(p => `<li><strong>${p.phrase}</strong>: ${p.meaning}</li>`).join('')}</ul>
        </div>`;
    }

    results.innerHTML = html;
    results.classList.remove('hidden');
    setupExpandables();
    setupAudio(data.word, data.audioUrl);
  }

  // === 5. EXPANDABLE SECTIONS LOGIC ===
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

  // === 6. AUDIO PLAYBACK ===
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
    u.rate = 1.15; // Faster audio
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // === 7. WORD OF THE DAY ===
  async function loadWordOfTheDay() {
    try {
      const res = await fetch('/api/word-of-day');
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
      console.warn('Word of the Day failed to load');
    }
  }

  // === 8. INITIALIZATION ===
  // Hide all sections except Dictionary by default
  sections.forEach(sec => {
    if (sec.id === 'dictionary') sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });

  loadWordOfTheDay();
  console.log('App is ready.');
});