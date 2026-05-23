document.addEventListener('DOMContentLoaded', () => {
  console.log('App initializing...');

  // === STATE & STORAGE ===
  const STORAGE_KEY = 'engDict_bookmarks';
  let bookmarks = [];
  try { bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e) { bookmarks = []; }

  // === DOM ELEMENTS ===
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const wordTypeSelect = document.getElementById('wordType');
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('main section');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const bookmarksContainer = document.getElementById('bookmarks-container');
  const emptyBookmarksMsg = document.getElementById('empty-bookmarks');

  if (!navLinks.length || !sections.length) {
    console.error('App initialization failed: Missing HTML structure');
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
      sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== targetId));

      if (targetId === 'bookmarks') renderBookmarksSection();
    });
  });

  // === SEARCH FUNCTION ===
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

  // === RENDER DICTIONARY RESULTS ===
  function renderDictionaryResults(data) {
    if (!results) return;

    const isBookmarked = bookmarks.some(b => b.word === data.word);
    const meanings = data.meanings || [];
    const wordForms = data.wordForms || [];
    const collocations = data.collocations || [];
    const phrasalVerbs = data.phrasalVerbs || [];

    let html = `
      <div class="result-card">
        <div class="result-header">
          <h2>${data.word || 'Unknown'}</h2>
          <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-word="${data.word}" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark this word'}">
            <i class="fas fa-heart"></i>
          </button>
        </div>
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

    if (wordForms.length > 0) {
      html += `<div class="expandable"><h3>Word Forms <i class="fas fa-chevron-down"></i></h3><ul class="word-forms-list">${wordForms.map(w => {
        const clean = w.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase();
        return `<li><span class="word-form-link" data-word="${clean}">${w}</span></li>`;
      }).join('')}</ul><div id="word-form-meaning" class="word-form-meaning hidden"></div></div>`;
    }

    if (collocations.length > 0) {
      html += `<div class="expandable"><h3>Common Collocations <i class="fas fa-chevron-down"></i></h3><ul>${collocations.map(c => `<li>${c}</li>`).join('')}</ul></div>`;
    }

    if (phrasalVerbs.length > 0) {
      html += `<div class="expandable"><h3>Phrasal Verbs & Idioms <i class="fas fa-chevron-down"></i></h3><ul>${phrasalVerbs.map(p => `<li><strong>${p.phrase}</strong>: ${p.meaning}</li>`).join('')}</ul></div>`;
    }

    results.innerHTML = html;
    results.classList.remove('hidden');
    
    setupExpandables();
    setupWordFormClicks();
    setupAudio(data.word, data.audioUrl);
    setupBookmarkToggle();
  }

  // === BOOKMARK LOGIC ===
  function setupBookmarkToggle() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const word = btn.dataset.word;
        const isBookmarked = btn.classList.contains('active');

        if (isBookmarked) {
          bookmarks = bookmarks.filter(b => b.word !== word);
          btn.classList.remove('active');
          btn.title = 'Bookmark this word';
        } else {
          // Find current word data from API or create minimal object
          const currentData = results.querySelector('.result-card')?.dataset?.word || word;
          const viText = results.querySelector('.meaning-item .vi')?.textContent || '';
          bookmarks.push({ word, vi: viText });
          btn.classList.add('active');
          btn.title = 'Remove bookmark';
        }

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)); } catch(e) {}
      });
    });
  }

  function renderBookmarksSection() {
    if (!bookmarksContainer || !emptyBookmarksMsg) return;
    bookmarksContainer.innerHTML = '';
    emptyBookmarksMsg.classList.toggle('hidden', bookmarks.length > 0);

    bookmarks.forEach(b => {
      const card = document.createElement('div');
      card.className = 'bookmark-card';
      card.innerHTML = `
        <div>
          <div class="word">${b.word}</div>
          <div class="vi">${b.vi || 'No translation'}</div>
        </div>
        <button class="remove-btn" title="Remove bookmark"><i class="fas fa-times"></i></button>
      `;
      
      card.querySelector('.word').addEventListener('click', () => {
        searchInput.value = b.word;
        searchBtn.click();
        // Switch to dictionary tab
        navLinks[0].click();
      });

      card.querySelector('.remove-btn').addEventListener('click', () => {
        bookmarks = bookmarks.filter(item => item.word !== b.word);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)); } catch(e) {}
        renderBookmarksSection();
        // Update search result button if visible
        const btn = document.querySelector(`.bookmark-btn[data-word="${b.word}"]`);
        if (btn) {
          btn.classList.remove('active');
          btn.title = 'Bookmark this word';
        }
      });

      bookmarksContainer.appendChild(card);
    });
  }

  // === EXPANDABLE SECTIONS ===
  function setupExpandables() {
    document.querySelectorAll('.expandable h3').forEach(h3 => {
      h3.style.cursor = 'pointer';
      h3.addEventListener('click', () => {
        const ul = h3.nextElementSibling;
        const icon = h3.querySelector('i');
        const isOpen = ul && ul.style.display !== 'none';
        if (ul) ul.style.display = isOpen ? 'none' : 'block';
        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    });
  }

  // === CLICKABLE WORD FORMS ===
  function setupWordFormClicks() {
    document.querySelectorAll('.word-form-link').forEach(span => {
      span.addEventListener('click', async (e) => {
        e.stopPropagation();
        const word = span.dataset.word;
        const meaningBox = document.getElementById('word-form-meaning');
        if (!meaningBox) return;

        meaningBox.innerHTML = '<p class="loading">Loading definition...</p>';
        meaningBox.classList.remove('hidden');
        
        try {
          const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
          const data = await res.json();
          const en = data.meanings?.[0]?.en || 'No definition';
          const vi = data.meanings?.[0]?.vi || 'No translation';
          meaningBox.innerHTML = `
            <div class="meaning-popup">
              <strong>${data.word}</strong>
              <div class="popup-meanings"><div class="vi">${vi}</div><div class="def">${en}</div></div>
              <button class="close-popup">&times;</button>
            </div>`;
          meaningBox.querySelector('.close-popup').addEventListener('click', () => {
            meaningBox.classList.add('hidden');
            meaningBox.innerHTML = '';
          });
        } catch (err) {
          meaningBox.innerHTML = '<p class="error">Failed to load definition.</p>';
        }
      });
    });
  }

  // === AUDIO ===
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
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  // === WORD OF THE DAY ===
  async function loadWordOfTheDay() {
    try {
      const res = await fetch('/api/word-of-day');
      const data = await res.json();
      const container = document.getElementById('word-of-day-container');
      if (container) {
        container.innerHTML = `<div class="word-card"><h3>${data.word}</h3><span class="ipa">${data.ipa}</span><p><strong>${data.meaning}</strong></p><p><strong>${data.vi}</strong></p><p class="example">"${data.example}"</p></div>`;
      }
    } catch (err) { console.warn('Word of the Day failed'); }
  }

  // === INIT ===
  sections.forEach(sec => {
    if (sec.id === 'dictionary') sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });
  loadWordOfTheDay();
  console.log('App ready. Bookmarks feature active.');
});