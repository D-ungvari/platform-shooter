import { fetchScores, submitScore } from './api.js';

let menuEl, gameOverEl, scoreListEl, goScoreListEl;
let finalScoreEl, nameInput, submitBtn, playAgainBtn, rankEl;
let onStart, onRestart;

export function initUI(callbacks) {
    onStart = callbacks.onStart;
    onRestart = callbacks.onRestart;

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

    // Menu start
    document.addEventListener('keydown', e => {
        if (menuEl.style.display !== 'none' && (e.key === 'Enter' || e.key === ' ')) {
            startGame();
        }
    });
    menuEl.addEventListener('click', startGame);

    // Game over buttons
    submitBtn.addEventListener('click', handleSubmit);
    playAgainBtn.addEventListener('click', () => {
        hideGameOver();
        onRestart();
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
    loadScores(scoreListEl);
}

export function showGameOver(score) {
    gameOverEl.style.display = 'flex';
    finalScoreEl.textContent = score;
    nameInput.value = '';
    rankEl.textContent = '';
    submitBtn.disabled = false;
    loadScores(goScoreListEl);
}

export function hideGameOver() {
    gameOverEl.style.display = 'none';
}

async function handleSubmit() {
    const name = nameInput.value.trim();
    if (!name || name.length > 20) {
        nameInput.focus();
        return;
    }
    submitBtn.disabled = true;
    const score = parseInt(finalScoreEl.textContent, 10);
    const result = await submitScore(name, score);
    if (result && result.rank) {
        rankEl.textContent = `Rank: #${result.rank}`;
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
