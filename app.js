document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');

  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('main section');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  if (!navLinks.length || !sections.length) {
    console.error('HTML structure missing nav or sections');
    return;
  }

  let currentWord = '';

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      console.log('Tab clicked:', targetId);

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== targetId));

      if (targetId === 'exercises') {
        if (typeof window.renderExercises === 'function') {
          window.renderExercises(currentWord || 'resilient');
        } else {
          console.warn('renderExercises not loaded yet');
        }
      }
    });
  });

  if (searchBtn && searchInput) {
    const performSearch = async () => {
      currentWord = searchInput.value.trim().toLowerCase();
      if (!currentWord) return;

      console.log('Searching:', currentWord);
      loading?.classList.remove('hidden');
      error?.classList.add('hidden');
      results?.classList.add('hidden');

      try {
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(currentWord)}`);
        const data = await res.json();
        console.log('API Response:', data);
        renderDictionaryResults(data);
      } catch (err) {
        console.error('Fetch error:', err);
        if (error) { error.textContent = 'Failed to load'; error.classList.remove('hidden'); }
      } finally {
        loading?.classList.add('hidden');
      }
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', e => e.key === 'Enter' && performSearch());
  }

  function renderDictionaryResults(data) {
    if (!results) return;

    console.log('Rendering sections. WordForms:', data.wordForms?.length, 'Collocations:', data.collocations?.length, 'Phrasal:', data.phrasalVerbs?.length);

    let html = `<div class="result-card">
      <h2>${data.word}</h2>
      <div class="pronunciation">
        <span class="ipa">${data.ipa}</span>
        <button class="audio-btn" id="playAudioBtn"><i class="fas fa-volume-high"></i></button>
      </div>
      <div class="meanings">
        ${data.meanings.map(m => `
          <div class="meaning-item">
            <div class="vi">${m.vi}</div>
            <div class="def">${m.en}</div>
            ${m.example ? `<div class="example">"${m.example}"</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`;

    if (data.wordForms?.length) {
      html += `<div class="expandable"><h3>Word Forms <i class="fas fa-chevron-down"></i></h3><ul>${data.wordForms.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
    }
    if (data.collocations?.length) {
      html += `<div class="expandable"><h3>Common Collocations <i class="fas fa-chevron-down"></i></h3><ul>${data.collocations.map(c => `<li>${c}</li>`).join('')}</ul></div>`;
    }
    if (data.phrasalVerbs?.length) {
      html += `<div class="expandable"><h3>Phrasal Verbs & Idioms <i class="fas fa-chevron-down"></i></h3><ul>${data.phrasalVerbs.map(p => `<li><strong>${p.phrase}</strong>: ${p.meaning}</li>`).join('')}</ul></div>`;
    }

    results.innerHTML = html;
    results.classList.remove('hidden');
    setupExpandables();
    setupAudio(data.word, data.audioUrl);
  }

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

  function setupAudio(word, url) {
    const btn = document.getElementById('playAudioBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (url) new Audio(url).play().catch(() => speak(word));
      else speak(word);
    });
  }

  function speak(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1.15;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  async function loadWordOfTheDay() {
    try {
      const res = await fetch('/api/word-of-day');
      const data = await res.json();
      const container = document.getElementById('word-of-day-container');
      if (container) {
        container.innerHTML = `<div class="word-card"><h3>${data.word}</h3><span class="ipa">${data.ipa}</span><p><strong>${data.meaning}</strong></p><p><strong>${data.vi}</strong></p><p class="example">"${data.example}"</p></div>`;
      }
    } catch (e) { console.warn('WOTD failed', e); }
  }

  sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== 'dictionary'));
  loadWordOfTheDay();
  console.log('App ready');
});