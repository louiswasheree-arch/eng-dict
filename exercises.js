// Global storage for exercises
window.exercisesData = null;

// Load exercises on startup
(async function initExercises() {
  try {
    const res = await fetch('exercises.json');
    if (!res.ok) throw new Error('File not found');
    window.exercisesData = await res.json();
    console.log('✅ Exercises loaded successfully!');
  } catch (err) {
    console.warn('⚠️ exercises.json not found. Place it in the same folder as index.html');
  }
})();

function renderExercises(allData, searchedWord) {
  const container = document.getElementById('exercise-container');
  if (!container || !allData) return;

  // Flatten all exercises into one array
  const allExercises = [
    ...allData['fill-in-blank'].map(e => ({...e, type: 'fill-in-blank'})),
    ...allData['multiple-choice'].map(e => ({...e, type: 'multiple-choice'})),
    ...allData['word-forms'].map(e => ({...e, type: 'word-forms'})),
    ...allData['collocations'].map(e => ({...e, type: 'collocations'}))
  ];

  // Filter: show exercises for searched word, fallback to all if none match
  let filtered = allExercises.filter(e => 
    e.word?.toLowerCase() === searchedWord || 
    e.root?.toLowerCase() === searchedWord
  );
  
  if (filtered.length === 0) {
    filtered = allExercises.filter(e => ['B1+', 'B2'].includes(e.level)).slice(0, 8);
    container.dataset.note = 'showing-general';
  } else {
    container.dataset.note = 'showing-specific';
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="no-exercises">
        <i class="fas fa-book-open" style="font-size: 2rem; color: var(--accent); margin-bottom: 1rem;"></i>
        <p>No exercises found for "<strong>${searchedWord}</strong>" yet.<br>Try: <em>resilient, analyze, ubiquitous, benefit, significant</em></p>
      </div>`;
    return;
  }

  let currentIndex = 0;

  container.innerHTML = `
    <div class="exercise-header">
      <h3><i class="fas fa-brain"></i> Practice Exercises</h3>
      <span class="level-badge" id="current-level">${filtered[0].level}</span>
      <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">
        ${container.dataset.note === 'showing-specific' ? '✨ Tailored to your word' : '📚 General practice'}
      </span>
    </div>
    <div id="quiz-area"></div>
    <div class="exercise-controls hidden" id="exercise-controls">
      <button id="prev-btn" class="secondary-btn"><i class="fas fa-arrow-left"></i></button>
      <button id="next-btn" class="primary-btn"><i class="fas fa-arrow-right"></i></button>
      <button id="check-btn" class="accent-btn">Check Answer</button>
      <div id="feedback" class="feedback hidden"></div>
    </div>
  `;

  function renderQuestion(index) {
    const ex = filtered[index];
    if (!ex) return;

    document.getElementById('current-level').textContent = ex.level;
    
    const quizArea = document.getElementById('quiz-area');
    quizArea.innerHTML = `
      <div class="question-card">
        <div class="question-meta">
          <span class="type-tag">${ex.type.replace('-', ' ')}</span>
          <span class="word-tag">${ex.word || ex.topic || ex.root || 'Vocabulary'}</span>
        </div>
        <p class="question-text">${ex.sentence || ex.question || `Match the terms:`}</p>
        
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
          <i class="fas fa-lightbulb"></i> <span id="hint-text">${ex.hint || ''}</span>
        </div>
      </div>
    `;

    document.getElementById('exercise-controls').classList.remove('hidden');
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
  
  document.getElementById('next-btn')?.addEventListener('click', () => {
    if (currentIndex < filtered.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
    }
  });
  
  document.getElementById('prev-btn')?.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion(currentIndex);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAnswer();
    if (e.key === 'ArrowRight') document.getElementById('next-btn')?.click();
    if (e.key === 'ArrowLeft') document.getElementById('prev-btn')?.click();
  });

  renderQuestion(0);
}