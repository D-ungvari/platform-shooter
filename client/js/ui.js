import { fetchScores, submitScore } from './api.js';
import { GAME_MODE } from './constants.js';

let menuEl, gameOverEl, pauseEl, victoryEl, worldSelectEl, scoreListEl, goScoreListEl;
let finalScoreEl, nameInput, submitBtn, playAgainBtn, rankEl, errorEl;
let onStartStoryAt, onRestart, onResume, onAdvance;
let resetHoldTimer = 0;

const WORLDS = [
    { name: 'World 1-1', sub: 'Overworld', theme: 'overworld' },
    { name: 'World 1-2', sub: 'Underground', theme: 'underground' },
    { name: 'World 1-3', sub: 'Sky High', theme: 'sky' },
    { name: 'World 1-4', sub: 'Castle', theme: 'castle' },
];

export function initUI(callbacks) {
    onStartStoryAt = callbacks.onStartStoryAt;
    onRestart = callbacks.onRestart;
    onResume = callbacks.onResume;
    onAdvance = callbacks.onAdvance;

    menuEl = document.getElementById('menu-screen');
    worldSelectEl = document.getElementById('world-select');
    scoreListEl = document.getElementById('score-list');

    gameOverEl = document.getElementById('gameover-screen');
    finalScoreEl = document.getElementById('final-score');
    nameInput = document.getElementById('name-input');
    submitBtn = document.getElementById('submit-score');
    playAgainBtn = document.getElementById('play-again');
    goScoreListEl = document.getElementById('go-score-list');
    rankEl = document.getElementById('rank-display');
    errorEl = document.getElementById('submit-error');

    pauseEl = document.getElementById('pause-screen');
    victoryEl = document.getElementById('victory-screen');

    document.getElementById('btn-story').addEventListener('click', () => {
        showWorldSelect();
    });

    document.getElementById('world-back').addEventListener('click', () => {
        worldSelectEl.style.display = 'none';
        menuEl.style.display = 'flex';
    });

    submitBtn.addEventListener('click', handleSubmit);
    nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSubmit();
        e.stopPropagation();
    });
    playAgainBtn.addEventListener('click', () => {
        hideGameOver();
        onRestart();
    });

    document.getElementById('resume-btn').addEventListener('click', () => onResume());

    document.getElementById('victory-next').addEventListener('click', () => {
        hideVictory();
        if (onAdvance) onAdvance();
    });
    document.getElementById('victory-again').addEventListener('click', () => {
        hideVictory();
        onRestart();
    });
    document.getElementById('victory-menu').addEventListener('click', () => {
        hideVictory();
        showWorldSelect();
    });

    // Reset progress hold-R
    window.addEventListener('keydown', e => {
        if (e.key === 'r' && worldSelectEl.style.display !== 'none') {
            if (resetHoldTimer === 0) {
                resetHoldTimer = setTimeout(() => {
                    localStorage.removeItem('spb_progress_v1');
                    refreshWorldGrid();
                    document.getElementById('reset-hint').textContent = 'Progress reset!';
                    setTimeout(() => {
                        document.getElementById('reset-hint').textContent = 'Hold R for 2s to reset progress';
                    }, 1500);
                    resetHoldTimer = 0;
                }, 2000);
            }
        }
    });
    window.addEventListener('keyup', e => {
        if (e.key === 'r' && resetHoldTimer) {
            clearTimeout(resetHoldTimer);
            resetHoldTimer = 0;
        }
    });

    loadScores(scoreListEl);
}

function showWorldSelect() {
    menuEl.style.display = 'none';
    worldSelectEl.style.display = 'flex';
    refreshWorldGrid();
}

function refreshWorldGrid() {
    const grid = document.getElementById('world-grid');
    grid.innerHTML = '';
    const progress = loadProgress();
    for (let i = 0; i < WORLDS.length; i++) {
        const w = WORLDS[i];
        const unlocked = i < progress.unlocked;
        const cleared = progress.cleared.includes(i);
        const node = document.createElement('div');
        node.className = 'world-node theme-' + w.theme + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
        node.innerHTML = `
            <div class="world-name">${w.name}</div>
            <div class="world-sub">${w.sub}</div>
            <div class="world-status">${cleared ? '★ CLEARED' : unlocked ? 'PLAY' : '🔒 LOCKED'}</div>
        `;
        if (unlocked) {
            node.addEventListener('click', () => {
                worldSelectEl.style.display = 'none';
                if (onStartStoryAt) onStartStoryAt(i);
            });
        }
        grid.appendChild(node);
    }
}

function loadProgress() {
    try {
        const raw = localStorage.getItem('spb_progress_v1');
        if (!raw) return { cleared: [], unlocked: 1 };
        return JSON.parse(raw);
    } catch (e) { return { cleared: [], unlocked: 1 }; }
}

export function getLastMode() { return GAME_MODE.STORY; }

export function showMenu() {
    menuEl.style.display = 'flex';
    if (worldSelectEl) worldSelectEl.style.display = 'none';
    gameOverEl.style.display = 'none';
    pauseEl.style.display = 'none';
    if (victoryEl) victoryEl.style.display = 'none';
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

export function showVictory(data) {
    if (!victoryEl) return;
    victoryEl.style.display = 'flex';
    const scoreEl = document.getElementById('victory-score');
    const coinsEl = document.getElementById('victory-coins');
    const bonusEl = document.getElementById('victory-bonus');
    const starsEl = document.getElementById('victory-stars');
    const levelEl = document.getElementById('victory-level');
    const nextBtn = document.getElementById('victory-next');
    if (scoreEl) scoreEl.textContent = data.score;
    if (coinsEl) coinsEl.textContent = data.coins;
    if (bonusEl) bonusEl.textContent = data.bonus;
    if (starsEl) {
        starsEl.textContent = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
    }
    if (levelEl) levelEl.textContent = data.levelName || '';
    if (nextBtn) {
        if (data.isLastLevel) {
            nextBtn.style.display = 'none';
            // Show a "you finished the game" caption via title
            const titleEl = victoryEl.querySelector('.victory-title');
            if (titleEl) titleEl.textContent = 'GAME COMPLETE!';
        } else {
            nextBtn.style.display = 'inline-block';
            const titleEl = victoryEl.querySelector('.victory-title');
            if (titleEl) titleEl.textContent = 'COURSE CLEAR!';
        }
    }
}

export function hideVictory() {
    if (victoryEl) victoryEl.style.display = 'none';
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
