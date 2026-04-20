document.addEventListener('DOMContentLoaded', () => {
  // === DOM ELEMENTS ===
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const wordType = document.getElementById('wordType');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('main section');

  // === TAB NAVIGATION ===
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== targetId));

      if (targetId === 'exercises') loadExercisesForCurrentWord();
    });
  });

  // === AUDIO ===
  function playAudio(word, audioUrl) {
    if (audioUrl) {
      new Audio(audioUrl).play().catch(() => fallbackSpeech(word));
    } else {
      fallbackSpeech(word);
    }
  }
  function fallbackSpeech(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  // === DICTIONARY SEARCH ===
  async function searchWord() {
    const word = searchInput.value.trim().toLowerCase();
    if (!word) return;

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    results.classList.add('hidden');

    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}&type=${wordType.value}`);
      if (!res.ok) throw new Error('Word not found');
      
      const data = await res.json();
      renderDictionaryResults(data);
      window.currentSearchWord = word;
    } catch (err) {
      error.textContent = err.message || 'Failed to fetch. Try another word.';
      error.classList.remove('hidden');
    } finally {
      loading.classList.add('hidden');
    }
  }

  function renderDictionaryResults(data) {
    results.innerHTML = `
      <div class="result-card">
        <h2 style="text-transform: capitalize; margin-bottom: 0.5rem;">${data.word}</h2>
        <div class="pronunciation">
          <span class="ipa">${data.ipa}</span>
          <button class="audio-btn" id="playAudioBtn" title="Listen"><i class="fas fa-volume-high"></i></button>
          ${data.audioUrl ? '<span style="font-size:0.85rem;color:var(--success);margin-left:0.5rem"><i class="fas fa-check-circle"></i> Real audio</span>' : '<span style="font-size:0.85rem;color:var(--text-muted);margin-left:0.5rem"><i class="fas fa-info-circle"></i> Speech synthesis</span>'}
        </div>
        <div class="meanings">
          ${data.meanings.map(m => `
            <div class="meaning-item">
              <div class="vi">🇻🇳 ${m.vi}</div>
              <div class="def">📘 ${m.en}</div>
              ${m.example ? `<div class="example">"${m.example}"</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="expandable reveal">
        <h3>🔤 Word Forms <i class="fas fa-chevron-down"></i></h3>
        <ul>${(data.wordForms || []).length > 0 ? data.wordForms.map(w => `<li>${w}</li>`).join('') : '<li>No additional forms available</li>'}</ul>
      </div>

      <div class="expandable reveal">
        <h3>🤝 Common Collocations <i class="fas fa-chevron-down"></i></h3>
        <ul>${(data.collocations || []).length > 0 ? data.collocations.map(c => `<li>${c}</li>`).join('') : '<li>Collocations loading...</li>'}</ul>
      </div>

      <div class="expandable reveal">
        <h3>🌟 Phrasal Verbs & Idioms <i class="fas fa-chevron-down"></i></h3>
        <ul>${(data.phrasalVerbs || []).length > 0 ? data.phrasalVerbs.map(p => `<li><strong>${p.phrase}</strong>: ${p.meaning}</li>`).join('') : '<li>Phrasal verbs loading...</li>'}</ul>
      </div>
    `;
    
    results.classList.remove('hidden');
    setupScrollReveal();
    setupExpandables();
    document.getElementById('playAudioBtn')?.addEventListener('click', () => playAudio(data.word, data.audioUrl));
  }

  function setupScrollReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => e.isIntersecting && e.target.classList.add('visible'));
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }

  function setupExpandables() {
    document.querySelectorAll('.expandable h3').forEach(h3 => {
      h3.addEventListener('click', () => {
        const ul = h3.nextElementSibling;
        const icon = h3.querySelector('i');
        const isOpen = ul.style.display !== 'none';
        ul.style.display = isOpen ? 'none' : 'block';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    });
  }

  // === EXERCISES LOADER ===
  function loadExercisesForCurrentWord() {
    const word = searchInput.value.trim().toLowerCase();
    if (!word) {
      document.getElementById('exercise-container').innerHTML = `<div class="no-exercises"><i class="fas fa-lightbulb" style="font-size:2rem;color:var(--accent);margin-bottom:1rem"></i><p><strong>Tip:</strong> Search for a word first, then come here to practice!</p></div>`;
      return;
    }
    if (window.exercisesData) {
      if (typeof renderExercises === 'function') renderExercises(window.exercisesData, word);
    } else {
      document.getElementById('exercise-container').innerHTML = '<p class="loading">Loading exercises...</p>';
    }
  }

  // === INIT ===
  searchBtn.addEventListener('click', searchWord);
  searchInput.addEventListener('keypress', e => e.key === 'Enter' && searchWord());
  sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== 'dictionary'));
});