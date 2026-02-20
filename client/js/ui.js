import { fetchScores, submitScore } from './api.js';

let menuEl, gameOverEl, pauseEl, scoreListEl, goScoreListEl;
let finalScoreEl, nameInput, submitBtn, playAgainBtn, rankEl, errorEl;
let onStart, onRestart, onResume;

export function initUI(callbacks) {
    onStart = callbacks.onStart;
    onRestart = callbacks.onRestart;
    onResume = callbacks.onResume;

    // Menu screen
    menuEl = document.getElementById('menu-screen');
    scoreListEl = document.getElementById('score-list');

    // Game over screen
    gameOverEl = document.getElementById('gameover-screen');
    finalScoreEl = document.getElementById('final-score');
    nameInput = document.getElementById('name-input');
    submitBtn = document.getElementById('submit-score');
    playAgainBtn = document.getElementById('play-again');
    goScoreListEl = document.getElementById('go-score-list');
    rankEl = document.getElementById('rank-display');
    errorEl = document.getElementById('submit-error');

    // Pause screen
    pauseEl = document.getElementById('pause-screen');

    // Menu start
    document.addEventListener('keydown', e => {
        if (menuEl.style.display !== 'none' && (e.key === 'Enter' || e.key === ' ')) {
            startGame();
        }
    });
    menuEl.addEventListener('click', e => {
        if (e.target === menuEl || e.target.closest('.menu-content')) {
            startGame();
        }
    });

    // Game over buttons
    submitBtn.addEventListener('click', handleSubmit);
    nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSubmit();
        e.stopPropagation();
    });
    playAgainBtn.addEventListener('click', () => {
        hideGameOver();
        onRestart();
    });

    // Pause resume button
    document.getElementById('resume-btn').addEventListener('click', () => {
        onResume();
    });

    // Load scores on init
    loadScores(scoreListEl);
}

function startGame() {
    menuEl.style.display = 'none';
    onStart();
}

export function showMenu() {
    menuEl.style.display = 'flex';
    gameOverEl.style.display = 'none';
    pauseEl.style.display = 'none';
    loadScores(scoreListEl);
}

export function showGameOver(score) {
    gameOverEl.style.display = 'flex';
    finalScoreEl.textContent = score;
    nameInput.value = '';
    rankEl.textContent = '';
    errorEl.textContent = '';
    submitBtn.disabled = false;
    loadScores(goScoreListEl);
}

export function hideGameOver() {
    gameOverEl.style.display = 'none';
}

export function showPause() {
    pauseEl.style.display = 'flex';
}

export function hidePause() {
    pauseEl.style.display = 'none';
}

async function handleSubmit() {
    const name = nameInput.value.trim();
    if (!name || name.length > 20) {
        errorEl.textContent = 'Enter a name (1-20 characters)';
        nameInput.focus();
        return;
    }
    errorEl.textContent = '';
    submitBtn.disabled = true;
    const score = parseInt(finalScoreEl.textContent, 10);
    const result = await submitScore(name, score);
    if (result && result.rank) {
        rankEl.textContent = `Rank: #${result.rank}`;
    } else if (!result) {
        errorEl.textContent = 'Failed to submit — try again';
        submitBtn.disabled = false;
        return;
    }
    loadScores(goScoreListEl);
}

async function loadScores(listEl) {
    const scores = await fetchScores();
    listEl.innerHTML = '';
    if (scores.length === 0) {
        listEl.innerHTML = '<li>No scores yet</li>';
        return;
    }
    for (const s of scores) {
        const li = document.createElement('li');
        li.textContent = `${s.name} — ${s.score}`;
        listEl.appendChild(li);
    }
}
