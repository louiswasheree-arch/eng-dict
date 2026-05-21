console.log('Exercises module loading...');

let exercisesData = null;
let isExercisesLoading = true;

(async function initExercises() {
  try {
    const res = await fetch('/exercises.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    exercisesData = await res.json();
    console.log('Exercises loaded');
  } catch (err) {
    console.error('Exercises load failed:', err);
    exercisesData = null;
  } finally {
    isExercisesLoading = false;
  }
})();

function renderExercises(searchedWord) {
  const container = document.getElementById('exercise-container');
  if (!container) { console.error('exercise-container missing'); return; }

  if (isExercisesLoading) {
    container.innerHTML = '<p class="loading">Loading exercises...</p>';
    setTimeout(() => renderExercises(searchedWord), 800);
    return;
  }

  if (!exercisesData) {
    container.innerHTML = '<div class="no-exercises"><p>Exercise data unavailable. Refresh page.</p></div>';
    return;
  }

  const allExercises = [
    ...(exercisesData['fill-in-blank'] || []).map(e => ({...e, type: 'fill-in-blank'})),
    ...(exercisesData['multiple-choice'] || []).map(e => ({...e, type: 'multiple-choice'})),
    ...(exercisesData['word-forms'] || []).map(e => ({...e, type: 'word-forms'})),
    ...(exercisesData['collocations'] || []).map(e => ({...e, type: 'collocations'}))
  ];

  let filtered = allExercises.filter(e => 
    (e.word && e.word.toLowerCase() === searchedWord) || 
    (e.root && e.root.toLowerCase() === searchedWord)
  );
  if (filtered.length === 0) filtered = allExercises.slice(0, 5);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-exercises"><p>No exercises for this word. Try: resilient, analyze, break, make, advance</p></div>';
    return;
  }

  let currentIndex = 0;
  container.innerHTML = `<div class="exercise-header"><h3>Practice Exercises</h3><span class="level-badge">${filtered[0].level || 'B1+'}</span></div><div id="quiz-area"></div><div class="exercise-controls"><button id="check-btn" class="accent-btn">Check Answer</button><div id="feedback" class="feedback hidden"></div></div>`;

  function renderQuestion(idx) {
    const ex = filtered[idx];
    if (!ex) return;
    const area = document.getElementById('quiz-area');
    area.innerHTML = `<div class="question-card"><div class="question-meta"><span class="type-tag">${ex.type.replace('-', ' ')}</span><span class="word-tag">${ex.word || ex.root || 'Vocab'}</span></div><p class="question-text">${ex.sentence || ex.question || 'Q'}</p>${ex.options ? `<div class="options-grid">${ex.options.map(o => `<label class="option-label"><input type="radio" name="answer" value="${o}"><span class="option-text">${o}</span></label>`).join('')}</div>` : ''}</div>`;
    document.getElementById('feedback').classList.add('hidden');
    document.querySelectorAll('input[name="answer"]').forEach(r => r.checked = false);
  }

  function checkAnswer() {
    const ex = filtered[currentIndex];
    const sel = document.querySelector('input[name="answer"]:checked');
    const fb = document.getElementById('feedback');
    if (!sel) { fb.textContent = 'Select an answer first!'; fb.className = 'feedback error'; fb.classList.remove('hidden'); return; }
    const correct = sel.value === ex.answer;
    fb.innerHTML = correct ? `<i class="fas fa-check-circle"></i> Correct!` : `<i class="fas fa-times-circle"></i> Answer: <strong>${ex.answer}</strong>`;
    fb.className = `feedback ${correct ? 'success' : 'error'}`;
    fb.classList.remove('hidden');
  }

  document.getElementById('check-btn')?.addEventListener('click', checkAnswer);
  renderQuestion(0);
}

// Expose globally so app.js can find it
window.renderExercises = renderExercises;