document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ App initializing...');

  // Safe element selection (won't crash if missing)
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('main section');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  if (!navLinks.length || !sections.length) {
    console.error('❌ HTML missing <nav> or <main section> tags!');
    return;
  }

  let currentWord = '';

  // === TAB SWITCHING ===
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      console.log(' Switching to tab:', targetId);

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(sec => {
        sec.classList.toggle('hidden', sec.id !== targetId);
      });

      // Try to load exercises (won't crash if function missing)
      if (targetId === 'exercises') {
        try {
          if (typeof renderExercises === 'function') {
            renderExercises(currentWord || 'resilient');
          }
        } catch (err) {
          console.warn('⚠️ Exercises failed to load:', err.message);
        }
      }
    });
  });

  // === SEARCH ===
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  async function performSearch() {
    currentWord = searchInput.value.trim().toLowerCase();
    if (!currentWord) return;

    console.log('🔍 Searching for:', currentWord);
    if (loading) loading.classList.remove('hidden');
    if (error) error.classList.add('hidden');
    if (results) results.classList.add('hidden');

    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(currentWord)}`);
      if (!res.ok) throw new Error('Word not found');
      
      const data = await res.json();
      if (results) {
        results.innerHTML = `
          <div class="result-card">
            <h2>${data.word}</h2>
            <p><strong>IPA:</strong> ${data.ipa}</p>
            <p><strong>Definition:</strong> ${data.meanings?.[0]?.en || 'No definition'}</p>
            <p><strong>Translation:</strong> ${data.meanings?.[0]?.vi || 'No translation'}</p>
          </div>
        `;
        results.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Search error:', err);
      if (error) {
        error.textContent = err.message || 'Failed to load';
        error.classList.remove('hidden');
      }
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  }

  // Initialize: Show dictionary tab by default
  sections.forEach(sec => {
    sec.classList.toggle('hidden', sec.id !== 'dictionary');
  });

  console.log('✅ App ready. Tabs and search active.');
});