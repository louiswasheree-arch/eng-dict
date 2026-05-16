window.exercisesData = null;

// Load exercises on startup
(async function initExercises() {
  try {
    console.log(' Loading exercises.json...');
    const res = await fetch('/exercises.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    window.exercisesData = await res.json();
    console.log(' Exercises loaded:', Object.keys(window.exercisesData));
  } catch (err) {
    console.error(' Failed to load exercises:', err.message);
    window.exercisesData = null;
  }
})();

function renderExercises(allData, searchedWord) {
  const container = document.getElementById('exercise-container');
  if (!container) {
    console.error(' Failed to find exercise-container');
    return;
  }

  if (!allData) {
    container.innerHTML = `
      <div class="no-exercises">
        <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--error); margin-bottom: 1rem;"></i>
        <p>Exercises data not loaded. Please refresh the page.</p>
      </div>`;
    return;
  }

  // Flatten all exercises
  const allExercises = [
    ...(allData['fill-in-blank'] || []).map(e => ({...e, type: 'fill-in-blank'})),
    ...(allData['multiple-choice'] || []).map(e => ({...e, type: 'multiple-choice'})),
    ...(allData['word-forms'] || []).map(e => ({...e, type: 'word-forms'})),
    ...(allData['collocations'] || []).map(e => ({...e, type: 'collocations'}))
  ];

  // Filter for searched word or show all
  let filtered = allExercises.filter(e => 
    e.word?.toLowerCase() === searchedWord || 
    e.root?.toLowerCase() === searchedWord ||
    !e.word // Show general exercises too
  );
  
  if (filtered.length === 0) {
    filtered = allExercises.slice(0, 5);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="no-exercises">
        <i class="fas fa-book-open" style="font-size: 2rem; color: var(--accent); margin-bottom: 1rem;"></i>
        <p>No exercises available yet.<br>Try: <em>resilient, analyze, break, make</em></p>
      </div>`;
    return;
  }

  let currentIndex = 0;

  container.innerHTML = `
    <div class="exercise-header">
      <h3><i class="fas fa-brain"></i> Practice Exercises</h3>
      <span class="level-badge">${filtered[0].level || 'B1+'}</span>
    </div>
    <div id="quiz-area"></div>
    <div class="exercise-controls" id="exercise-controls">
      <button id="check-btn" class="accent-btn">Check Answer</button>
      <div id="feedback" class="feedback hidden"></div>
    </div>
  `;

  function renderQuestion(index) {
    const ex = filtered[index];
    if (!ex) return;

    const quizArea = document.getElementById('quiz-area');
    quizArea.innerHTML = `
      <div class="question-card">
        <div class="question-meta">
          <span class="type-tag">${ex.type.replace('-', ' ')}</span>
          <span class="word-tag">${ex.word || ex.root || 'Vocabulary'}</span>
        </div>
        <p class="question-text">${ex.sentence || ex.question || 'Question'}</p>
        
        ${ex.options ? `
          <div class="options-grid">
            ${ex.options.map(opt => `
              <label class="option-label">
                <input type="radio" name="answer" value="${opt}">
                <span class="option-text">${opt}</span>
              </label>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="hint-box hidden" id="hint-box">
          <i class="fas fa-lightbulb"></i> <span>${ex.hint || ''}</span>
        </div>
      </div>
    `;

    document.getElementById('feedback').classList.add('hidden');
    document.querySelectorAll('input[name="answer"]').forEach(r => r.checked = false);
  }

  function checkAnswer() {
    const ex = filtered[currentIndex];
    const selected = document.querySelector('input[name="answer"]:checked');
    const feedback = document.getElementById('feedback');
    
    if (!selected) {
      feedback.textContent = 'Please select an answer first!';
      feedback.className = 'feedback error';
      feedback.classList.remove('hidden');
      return;
    }

    const isCorrect = selected.value === ex.answer;
    feedback.innerHTML = isCorrect 
      ? `<i class="fas fa-check-circle"></i> Correct! Well done! 🎉`
      : `<i class="fas fa-times-circle"></i> Not quite. The answer is: <strong>${ex.answer}</strong><br><small>${ex.hint || ''}</small>`;
    
    feedback.className = `feedback ${isCorrect ? 'success' : 'error'}`;
    feedback.classList.remove('hidden');
    
    if (!isCorrect && ex.hint) {
      document.getElementById('hint-box').classList.remove('hidden');
    }
  }

  document.getElementById('check-btn')?.addEventListener('click', checkAnswer);
  renderQuestion(0);
}