import { fetchScores, submitScore } from './api.js';
import { GAME_MODE } from './constants.js';

let menuEl, gameOverEl, pauseEl, scoreListEl, goScoreListEl;
let finalScoreEl, nameInput, submitBtn, playAgainBtn, rankEl, errorEl;
let onStartArena, onStartAdventure, onRestart, onResume;
let lastMode = GAME_MODE.ARENA;

export function initUI(callbacks) {
    onStartArena = callbacks.onStartArena;
    onStartAdventure = callbacks.onStartAdventure;
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

    // Mode buttons
    document.getElementById('btn-arena').addEventListener('click', () => {
        lastMode = GAME_MODE.ARENA;
        startGame(onStartArena);
    });
    document.getElementById('btn-adventure').addEventListener('click', () => {
        lastMode = GAME_MODE.ADVENTURE;
        startGame(onStartAdventure);
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

function startGame(startFn) {
    menuEl.style.display = 'none';
    startFn();
}

export function getLastMode() {
    return lastMode;
}

export function showMenu() {
    menuEl.style.display = 'flex';
    gameOverEl.style.display = 'none';
    pauseEl.style.display = 'none';
    loadScores(scoreListEl);
}

export function showGameOver(score, kills, timeStr) {
    gameOverEl.style.display = 'flex';
    finalScoreEl.textContent = score;
    document.getElementById('final-kills').textContent = kills || 0;
    document.getElementById('final-time').textContent = timeStr || '0s';
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
