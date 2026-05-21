console.log('Exercises module loaded');

let exercisesData = null;
let isExercisesLoading = true;

// Initialize: Load exercises.json on startup
(async function initExercises() {
  try {
    console.log('Loading exercises.json...');
    const res = await fetch('/exercises.json');
    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('exercises.json is not valid JSON');
    }

    exercisesData = await res.json();
    console.log('Exercises loaded successfully:', Object.keys(exercisesData));
  } catch (err) {
    console.error('Failed to load exercises:', err.message);
    exercisesData = null;
  } finally {
    isExercisesLoading = false;
  }
})();

// Main render function
function renderExercises(searchedWord) {
  console.log('Rendering exercises for:', searchedWord);

  const container = document.getElementById('exercise-container');
  if (!container) {
    console.error('exercise-container not found in HTML');
    return;
  }

  // Wait for data to load if still fetching
  if (isExercisesLoading) {
    container.innerHTML = '<p class="loading">Loading exercises...</p>';
    setTimeout(function() { renderExercises(searchedWord); }, 800);
    return;
  }

  // Handle failed load
  if (!exercisesData) {
    container.innerHTML = '<div class="no-exercises"><i class="fas fa-exclamation-circle"></i><p>Could not load exercise data. Please refresh the page.</p></div>';
    return;
  }

  // Flatten all exercise types into one array
  const allExercises = [
    ...(exercisesData['fill-in-blank'] || []).map(function(e) { return Object.assign({}, e, { type: 'fill-in-blank' }); }),
    ...(exercisesData['multiple-choice'] || []).map(function(e) { return Object.assign({}, e, { type: 'multiple-choice' }); }),
    ...(exercisesData['word-forms'] || []).map(function(e) { return Object.assign({}, e, { type: 'word-forms' }); }),
    ...(exercisesData['collocations'] || []).map(function(e) { return Object.assign({}, e, { type: 'collocations' }); })
  ];

  console.log('Total exercises available:', allExercises.length);

  // Filter for searched word, fallback to general exercises
  let filtered = allExercises.filter(function(e) {
    return (e.word && e.word.toLowerCase() === searchedWord) || 
           (e.root && e.root.toLowerCase() === searchedWord);
  });

  if (filtered.length === 0) {
    filtered = allExercises.slice(0, 5);
    console.log('No specific exercises found, showing general ones');
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-exercises"><i class="fas fa-book-open"></i><p>No exercises available yet.<br>Try searching: <em>resilient, analyze, break, make</em></p></div>';
    return;
  }

  let currentIndex = 0;

  // Render exercise container
  container.innerHTML = '<div class="exercise-header"><h3><i class="fas fa-brain"></i> Practice Exercises</h3><span class="level-badge">' + (filtered[0].level || 'B1+') + '</span></div><div id="quiz-area"></div><div class="exercise-controls" id="exercise-controls"><button id="check-btn" class="accent-btn">Check Answer</button><div id="feedback" class="feedback hidden"></div></div>';

  // Render individual question
  function renderQuestion(index) {
    const ex = filtered[index];
    if (!ex) return;

    const quizArea = document.getElementById('quiz-area');
    if (!quizArea) return;

    let questionHTML = '<div class="question-card"><div class="question-meta"><span class="type-tag">' + ex.type.replace('-', ' ') + '</span><span class="word-tag">' + (ex.word || ex.root || 'Vocabulary') + '</span></div>';
    
    questionHTML += '<p class="question-text">' + (ex.sentence || ex.question || 'Question') + '</p>';

    if (ex.options && ex.options.length > 0) {
      questionHTML += '<div class="options-grid">';
      ex.options.forEach(function(opt) {
        questionHTML += '<label class="option-label"><input type="radio" name="answer" value="' + opt + '"><span class="option-text">' + opt + '</span></label>';
      });
      questionHTML += '</div>';
    }

    questionHTML += '<div class="hint-box hidden" id="hint-box"><i class="fas fa-lightbulb"></i> <span>' + (ex.hint || '') + '</span></div></div>';

    quizArea.innerHTML = questionHTML;

    // Reset feedback and selections
    const feedback = document.getElementById('feedback');
    if (feedback) feedback.classList.add('hidden');
    document.querySelectorAll('input[name="answer"]').forEach(function(r) { r.checked = false; });
  }

  // Check answer function
  function checkAnswer() {
    const ex = filtered[currentIndex];
    const selected = document.querySelector('input[name="answer"]:checked');
    const feedback = document.getElementById('feedback');

    if (!selected) {
      if (feedback) {
        feedback.textContent = 'Please select an answer first!';
        feedback.className = 'feedback error';
        feedback.classList.remove('hidden');
      }
      return;
    }

    const isCorrect = selected.value === ex.answer;
    if (feedback) {
      feedback.innerHTML = isCorrect 
        ? '<i class="fas fa-check-circle"></i> Correct! Well done!' 
        : '<i class="fas fa-times-circle"></i> Not quite. The answer is: <strong>' + ex.answer + '</strong><br><small>' + (ex.hint || '') + '</small>';
      
      feedback.className = 'feedback ' + (isCorrect ? 'success' : 'error');
      feedback.classList.remove('hidden');
    }

    if (!isCorrect && ex.hint) {
      const hintBox = document.getElementById('hint-box');
      if (hintBox) hintBox.classList.remove('hidden');
    }
  }

  // Attach event listener
  const checkBtn = document.getElementById('check-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', checkAnswer);
  }

  // Render first question
  renderQuestion(0);
}