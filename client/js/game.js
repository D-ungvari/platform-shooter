import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_ENEMY, COLOR_FLYER, COLOR_TANK, COLOR_PLAYER, PLAYER_MAX_HEALTH } from './constants.js';
import { initInput, resetFrameInput, isKeyDown } from './input.js';
import { initRenderer, renderGame } from './renderer.js';
import { createPlayer, updatePlayer, damagePlayer, giveWeapon } from './player.js';
import { moveBullets } from './bullet.js';
import { updateEnemies } from './enemy.js';
import { resetSpawner, updateSpawner } from './spawner.js';
import { collides } from './physics.js';
import { initUI, showMenu, showGameOver, showPause, hidePause } from './ui.js';
import {
    updateEffects, renderEffects, resetEffects,
    spawnKillParticles, spawnScorePopup, triggerShake, getShakeOffset,
    spawnHealthPickup, spawnPickup, getPickups, removePickup, showAnnouncement,
    spawnLandingDust
} from './effects.js';
import { playEnemyDeath, playPlayerHit, playPickup, playPlayerDeath } from './audio.js';

const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', DYING: 'DYING', GAME_OVER: 'GAME_OVER' };
const ENEMY_COLORS = { runner: COLOR_ENEMY, flyer: COLOR_FLYER, tank: COLOR_TANK };

let canvas, ctx;
let state;
let player, enemies, bullets, score;
let lastTime;
let escapeHeld = false;
let killCount = 0;
let nextWaveAt = 10;
let survivalTime = 0;

// Combo system
let comboCount = 0;
let comboTimer = 0;
const COMBO_WINDOW = 1.5;

// Difficulty announcements
let lastDiffTier = 0;
const DIFF_THRESHOLDS = [30, 60, 90, 120, 180];

// Death animation
let deathTimer = 0;

// Screen flash
let flashAlpha = 0;

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
    killCount = 0;
    nextWaveAt = 10;
    comboCount = 0;
    comboTimer = 0;
    survivalTime = 0;
    deathTimer = 0;
    flashAlpha = 0;
    lastDiffTier = 0;
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
        if (isKeyDown('escape') && !escapeHeld) {
            escapeHeld = true;
            state = STATE.PAUSED;
            showPause();
        }
        if (!isKeyDown('escape')) escapeHeld = false;

        if (state === STATE.PLAYING) {
            survivalTime += dt;
            update(dt);
            render(dt);
        }
    } else if (state === STATE.PAUSED) {
        if (isKeyDown('escape') && !escapeHeld) {
            escapeHeld = true;
            resumePlaying();
        }
        if (!isKeyDown('escape')) escapeHeld = false;
    } else if (state === STATE.DYING) {
        deathTimer -= dt;
        updateEffects(dt);
        if (flashAlpha > 0) flashAlpha -= dt * 2;
        render(dt);
        if (deathTimer <= 0) {
            state = STATE.GAME_OVER;
            const timeStr = formatTime(survivalTime);
            showGameOver(score, killCount, timeStr);
        }
    }

    resetFrameInput();
    requestAnimationFrame(loop);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function update(dt) {
    // Difficulty tier announcements
    for (let i = lastDiffTier; i < DIFF_THRESHOLDS.length; i++) {
        if (survivalTime >= DIFF_THRESHOLDS[i]) {
            const labels = ['Danger rising...', 'Onslaught!', 'Nightmare!', 'HELL MODE', 'IMPOSSIBLE'];
            showAnnouncement(labels[i]);
            triggerShake(4, 0.3);
            lastDiffTier = i + 1;
        }
    }

    const wasAirborne = !player.grounded;
    updatePlayer(player, dt, bullets);
    if (wasAirborne && player.grounded) {
        spawnLandingDust(player.x + player.width / 2, player.y + player.height);
    }
    moveBullets(bullets, dt);
    updateEnemies(enemies, player, dt);
    updateSpawner(dt, enemies);

    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) comboCount = 0;
    }

    // Flash decay
    if (flashAlpha > 0) flashAlpha -= dt * 3;

    // Bullet-enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const bBox = {
            x: b.x - b.radius, y: b.y - b.radius,
            width: b.radius * 2, height: b.radius * 2,
        };
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (collides(bBox, enemies[j])) {
                enemies[j].health -= b.damage;
                bullets.splice(i, 1);
                if (enemies[j].health <= 0) {
                    const ex = enemies[j].x + enemies[j].width / 2;
                    const ey = enemies[j].y + enemies[j].height / 2;
                    const color = ENEMY_COLORS[enemies[j].type] || COLOR_ENEMY;
                    spawnKillParticles(ex, ey, color);
                    playEnemyDeath();

                    comboCount++;
                    comboTimer = COMBO_WINDOW;
                    const multiplier = Math.min(comboCount, 5);
                    const points = enemies[j].scoreValue * multiplier;
                    score += points;

                    const comboText = multiplier > 1 ? `${points} (${multiplier}x)` : `${points}`;
                    spawnScorePopup(ex, ey - 20, comboText);
                    killCount++;

                    const dropRoll = Math.random();
                    if (dropRoll < 0.15) spawnHealthPickup(ex, ey);
                    else if (dropRoll < 0.20) spawnPickup(ex, ey, 'shotgun');
                    else if (dropRoll < 0.25) spawnPickup(ex, ey, 'rapid');

                    if (killCount >= nextWaveAt) {
                        showAnnouncement(`Wave ${Math.floor(killCount / 10) + 1}!`);
                        nextWaveAt += 10;
                    }
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
                playPlayerHit();
                flashAlpha = 0.4; // red screen flash
                comboCount = 0;
                comboTimer = 0;
            }
            damagePlayer(player, enemy.damage);
        }
    }

    // Pickup collisions
    const pickups = getPickups();
    for (let i = pickups.length - 1; i >= 0; i--) {
        if (collides(player, pickups[i])) {
            const pu = pickups[i];
            playPickup();
            if (pu.type === 'health') {
                player.health = Math.min(player.health + pu.healAmount, PLAYER_MAX_HEALTH);
                spawnScorePopup(pu.x + 8, pu.y - 10, 'HP');
            } else if (pu.type === 'shotgun') {
                giveWeapon(player, 'shotgun', 8);
                showAnnouncement('SHOTGUN!');
            } else if (pu.type === 'rapid') {
                giveWeapon(player, 'rapid', 8);
                showAnnouncement('RAPID FIRE!');
            }
            removePickup(i);
        }
    }

    // Remove enemies that fell off the bottom
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].y > CANVAS_HEIGHT + 100) enemies.splice(i, 1);
    }

    updateEffects(dt);

    // Fall death
    if (player.y > CANVAS_HEIGHT + 50) {
        player.health = 0;
    }

    // Death check — enter dying state with explosion
    if (player.health <= 0) {
        const px = player.x + player.width / 2;
        const py = Math.min(player.y + player.height / 2, CANVAS_HEIGHT - 20);
        for (let i = 0; i < 3; i++) spawnKillParticles(px, py, COLOR_PLAYER);
        triggerShake(12, 0.5);
        flashAlpha = 0.6;
        playPlayerDeath();
        deathTimer = 1.2;
        state = STATE.DYING;
    }
}

function render(dt) {
    const shake = getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    renderGame(player, enemies, bullets, score, dt, killCount, survivalTime);
    renderEffects(ctx);

    // Combo indicator
    if (comboCount > 1) {
        ctx.fillStyle = '#FFAA00';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(comboTimer / 0.5, 1.0);
        ctx.fillText(`${comboCount}x COMBO`, CANVAS_WIDTH / 2, 50);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'left';
    }

    ctx.restore();

    // Screen flash (damage / death)
    if (flashAlpha > 0) {
        ctx.fillStyle = '#FF0000';
        ctx.globalAlpha = Math.max(0, flashAlpha);
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalAlpha = 1.0;
    }
}
