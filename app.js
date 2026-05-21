document.addEventListener('DOMContentLoaded', () => {
  console.log('App initializing...');

  // === 1. DOM ELEMENTS ===
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const wordTypeSelect = document.getElementById('wordType');
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

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== targetId));
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
        const selectedType = wordTypeSelect ? wordTypeSelect.value : '';
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

    // Expandable: Word Forms (Clickable)
    if (wordForms.length > 0) {
      html += `
        <div class="expandable">
          <h3>Word Forms <i class="fas fa-chevron-down"></i></h3>
          <ul class="word-forms-list">
            ${wordForms.map(w => {
              // Extract base word: "resilience (n)" -> "resilience"
              const cleanWord = w.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase();
              return `<li><span class="word-form-link" data-word="${cleanWord}">${w}</span></li>`;
            }).join('')}
          </ul>
          <div id="word-form-meaning" class="word-form-meaning hidden"></div>
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
    setupWordFormClicks();
    setupAudio(data.word, data.audioUrl);
  }

  // === 5. EXPANDABLE SECTIONS ===
  function setupExpandables() {
    document.querySelectorAll('.expandable h3').forEach(h3 => {
      h3.style.cursor = 'pointer';
      h3.addEventListener('click', () => {
        const ul = h3.nextElementSibling;
        // Skip the meaning box if it exists
        const content = ul.tagName === 'UL' ? ul : h3.parentElement.querySelector('ul');
        const icon = h3.querySelector('i');
        const isOpen = content && content.style.display !== 'none';
        
        if (content) content.style.display = isOpen ? 'none' : 'block';
        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    });
  }

  // === 6. CLICKABLE WORD FORMS ===
  function setupWordFormClicks() {
    document.querySelectorAll('.word-form-link').forEach(span => {
      span.addEventListener('click', async (e) => {
        e.stopPropagation();
        const word = span.dataset.word;
        const meaningBox = document.getElementById('word-form-meaning');
        
        // Show loading
        meaningBox.innerHTML = '<p class="loading">Loading definition...</p>';
        meaningBox.classList.remove('hidden');
        
        try {
          const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
          const data = await res.json();
          
          const enMeaning = data.meanings?.[0]?.en || 'No English definition';
          const viMeaning = data.meanings?.[0]?.vi || 'No Vietnamese definition';
          
          meaningBox.innerHTML = `
            <div class="meaning-popup">
              <strong>${data.word}</strong>
              <div class="popup-meanings">
                <div class="vi">${viMeaning}</div>
                <div class="def">${enMeaning}</div>
              </div>
              <button class="close-popup" title="Close">&times;</button>
            </div>
          `;
          
          // Attach close button
          meaningBox.querySelector('.close-popup').addEventListener('click', () => {
            meaningBox.classList.add('hidden');
            meaningBox.innerHTML = '';
          });
          
        } catch (err) {
          meaningBox.innerHTML = '<p class="error">Failed to load definition. Try again.</p>';
        }
      });
    });
  }

  // === 7. AUDIO PLAYBACK ===
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
    u.rate = 1.15;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // === 8. WORD OF THE DAY ===
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

  // === 9. INITIALIZATION ===
  sections.forEach(sec => {
    if (sec.id === 'dictionary') sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });

  loadWordOfTheDay();
  console.log('App is ready.');
});