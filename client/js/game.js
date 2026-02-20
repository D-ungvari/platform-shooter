import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_ENEMY, COLOR_FLYER } from './constants.js';
import { initInput, resetFrameInput, isKeyDown } from './input.js';
import { initRenderer, renderGame } from './renderer.js';
import { createPlayer, updatePlayer, damagePlayer } from './player.js';
import { moveBullets } from './bullet.js';
import { updateEnemies } from './enemy.js';
import { resetSpawner, updateSpawner } from './spawner.js';
import { collides } from './physics.js';
import { initUI, showMenu, showGameOver, showPause, hidePause } from './ui.js';
import {
    updateEffects, renderEffects, resetEffects,
    spawnKillParticles, spawnScorePopup, triggerShake, getShakeOffset
} from './effects.js';

const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER' };

let canvas, ctx;
let state;
let player, enemies, bullets, score;
let lastTime;
let escapeHeld = false;

export function initGame() {
    canvas = document.getElementById('game-canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    initInput(canvas);
    initRenderer(ctx);
    initUI({
        onStart: startPlaying,
        onRestart: startPlaying,
        onResume: resumePlaying,
    });

    state = STATE.MENU;
    showMenu();
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function startPlaying() {
    player = createPlayer();
    enemies = [];
    bullets = [];
    score = 0;
    resetSpawner();
    resetEffects();
    state = STATE.PLAYING;
}

function resumePlaying() {
    hidePause();
    state = STATE.PLAYING;
    lastTime = performance.now();
}

function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (state === STATE.PLAYING) {
        // Pause check
        if (isKeyDown('escape') && !escapeHeld) {
            escapeHeld = true;
            state = STATE.PAUSED;
            showPause();
        }
        if (!isKeyDown('escape')) escapeHeld = false;

        if (state === STATE.PLAYING) {
            update(dt);
            render();
        }
    } else if (state === STATE.PAUSED) {
        if (isKeyDown('escape') && !escapeHeld) {
            escapeHeld = true;
            resumePlaying();
        }
        if (!isKeyDown('escape')) escapeHeld = false;
    }

    resetFrameInput();
    requestAnimationFrame(loop);
}

function update(dt) {
    // Player
    updatePlayer(player, dt, bullets);

    // Bullets
    moveBullets(bullets, dt);

    // Enemies
    updateEnemies(enemies, player, dt);

    // Spawner
    updateSpawner(dt, enemies);

    // Bullet-enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const bBox = {
            x: b.x - b.radius,
            y: b.y - b.radius,
            width: b.radius * 2,
            height: b.radius * 2,
        };
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (collides(bBox, enemies[j])) {
                enemies[j].health -= b.damage;
                bullets.splice(i, 1);
                if (enemies[j].health <= 0) {
                    const ex = enemies[j].x + enemies[j].width / 2;
                    const ey = enemies[j].y + enemies[j].height / 2;
                    const color = enemies[j].type === 'flyer' ? COLOR_FLYER : COLOR_ENEMY;
                    spawnKillParticles(ex, ey, color);
                    spawnScorePopup(ex, ey - 20, enemies[j].scoreValue);
                    score += enemies[j].scoreValue;
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }

    // Enemy-player collisions
    for (const enemy of enemies) {
        if (collides(player, enemy)) {
            if (player.invincible <= 0) {
                triggerShake(6, 0.2);
            }
            damagePlayer(player, enemy.damage);
        }
    }

    // Remove off-screen enemies (fell below canvas)
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].y > CANVAS_HEIGHT + 100) {
            enemies.splice(i, 1);
        }
    }

    // Effects
    updateEffects(dt);

    // Game over check
    if (player.health <= 0) {
        state = STATE.GAME_OVER;
        showGameOver(score);
    }
}

function render() {
    const shake = getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    renderGame(player, enemies, bullets, score);
    renderEffects(ctx);
    ctx.restore();
}
