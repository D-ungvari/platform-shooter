import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { initInput, resetFrameInput, getMouse } from './input.js';
import { initRenderer, renderGame } from './renderer.js';
import { createPlayer, updatePlayer, damagePlayer } from './player.js';
import { moveBullets } from './bullet.js';
import { updateEnemies } from './enemy.js';
import { resetSpawner, updateSpawner } from './spawner.js';
import { collides } from './physics.js';
import { initUI, showMenu, showGameOver } from './ui.js';

const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };

let canvas, ctx;
let state;
let player, enemies, bullets, score;
let lastTime;

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
    window.__gameScore = 0;
    resetSpawner();
    state = STATE.PLAYING;
}

function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (state === STATE.PLAYING) {
        update(dt);
        render();
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
                    score += enemies[j].scoreValue;
                    window.__gameScore = score;
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }

    // Enemy-player collisions
    for (const enemy of enemies) {
        if (collides(player, enemy)) {
            damagePlayer(player, enemy.damage);
        }
    }

    // Game over check
    if (player.health <= 0) {
        state = STATE.GAME_OVER;
        showGameOver(score);
    }
}

function render() {
    renderGame(player, enemies, bullets);
}
