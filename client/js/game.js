import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_ENEMY, COLOR_FLYER, COLOR_TANK, COLOR_PLAYER, PLAYER_MAX_HEALTH, GAME_MODE, PLATFORMS, CRUMBLE_DELAY, CRUMBLE_RESPAWN } from './constants.js';
import { initInput, resetFrameInput, isKeyDown } from './input.js';
import { initRenderer, renderGame } from './renderer.js';
import { createPlayer, updatePlayer, damagePlayer, giveWeapon, applyPowerUp, hasPowerUp } from './player.js';
import { moveBullets } from './bullet.js';
import { updateEnemies } from './enemy.js';
import { resetSpawner, updateSpawner } from './spawner.js';
import { collides, checkBlockCollisions } from './physics.js';
import { initUI, showMenu, showGameOver, showPause, hidePause } from './ui.js';
import {
    updateEffects, renderWorldEffects, renderScreenEffects, resetEffects,
    spawnKillParticles, spawnScorePopup, triggerShake, getShakeOffset,
    spawnHealthPickup, spawnPickup, getPickups, removePickup, showAnnouncement,
    spawnLandingDust
} from './effects.js';
import { playEnemyDeath, playPlayerHit, playPickup, playPlayerDeath, playPowerUp, playShieldHit, playBlockBreak, playBounce, playCrumble, playCheckpoint } from './audio.js';
import { createCamera, updateCamera, getCamera, resetCamera } from './camera.js';
import { createTerrain, updateTerrain, getVisiblePlatforms, getVisibleBlocks, resetTerrain } from './terrain.js';

const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', DYING: 'DYING', GAME_OVER: 'GAME_OVER' };
const ENEMY_COLORS = { runner: COLOR_ENEMY, flyer: COLOR_FLYER, tank: COLOR_TANK };

// Difficulty zones (adventure mode)
const ZONES = [
    { name: 'Twilight Plains', dist: 0, bg: [10, 10, 30], plat: '#555566', mt: [20, 18, 35] },
    { name: 'Crimson Wastes', dist: 1000, bg: [30, 8, 15], plat: '#665544', mt: [35, 15, 20] },
    { name: 'Frozen Depths', dist: 2000, bg: [8, 15, 35], plat: '#556677', mt: [15, 25, 40] },
    { name: 'Toxic Swamp', dist: 3000, bg: [10, 25, 12], plat: '#556644', mt: [18, 35, 20] },
    { name: 'The Void', dist: 4000, bg: [5, 3, 15], plat: '#444455', mt: [12, 8, 25] },
];

let currentMode = GAME_MODE.ARENA;

let canvas, ctx;
let state;
let player, enemies, bullets, score;
let lastTime;
let escapeHeld = false;
let killCount = 0;
let nextWaveAt = 10;
let survivalTime = 0;
let gameTime = 0;

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

// Adventure mode tracking
let maxPlayerX = 0;
let lastCheckpoint = 0;
let currentZone = 0;

// Cached per frame
let cachedPlatforms = null;
let cachedBlocks = null;

export function initGame() {
    canvas = document.getElementById('game-canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    initInput(canvas);
    initRenderer(ctx);
    initUI({
        onStartArena: startArena,
        onStartAdventure: startAdventure,
        onRestart: () => currentMode === GAME_MODE.ADVENTURE ? startAdventure() : startArena(),
        onResume: resumePlaying,
    });

    state = STATE.MENU;
    showMenu();
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function startArena() {
    currentMode = GAME_MODE.ARENA;
    startPlaying();
}

function startAdventure() {
    currentMode = GAME_MODE.ADVENTURE;
    startPlaying();
}

function startPlaying() {
    player = createPlayer(currentMode);
    enemies = [];
    bullets = [];
    score = 0;
    killCount = 0;
    nextWaveAt = 10;
    comboCount = 0;
    comboTimer = 0;
    survivalTime = 0;
    gameTime = 0;
    deathTimer = 0;
    flashAlpha = 0;
    lastDiffTier = 0;
    maxPlayerX = 0;
    lastCheckpoint = 0;
    currentZone = 0;
    resetSpawner();
    resetEffects();

    if (currentMode === GAME_MODE.ADVENTURE) {
        createTerrain();
        createCamera(player.x);
    } else {
        resetTerrain();
        resetCamera();
    }

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
            gameTime += dt;
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
        gameTime += dt;
        updateEffects(dt, getActivePlatforms());
        if (flashAlpha > 0) flashAlpha -= dt * 2;
        render(dt);
        if (deathTimer <= 0) {
            state = STATE.GAME_OVER;
            const timeStr = formatTime(survivalTime);
            const distMeters = Math.floor(maxPlayerX / 100);
            const displayScore = currentMode === GAME_MODE.ADVENTURE ? score + distMeters : score;
            showGameOver(displayScore, killCount, timeStr);
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

function refreshPlatforms() {
    if (currentMode === GAME_MODE.ADVENTURE) {
        const camera = getCamera();
        updateTerrain(camera.x);
        cachedPlatforms = getVisiblePlatforms(camera.x);
        cachedBlocks = getVisibleBlocks(camera.x);
    } else {
        cachedPlatforms = PLATFORMS;
        cachedBlocks = [];
    }
    return cachedPlatforms;
}

function getActivePlatforms() {
    return cachedPlatforms || PLATFORMS;
}

function getActiveBlocks() {
    return cachedBlocks || [];
}

// Update moving platforms and crumbling timers
function updateSpecialPlatforms(platforms, dt) {
    for (const plat of platforms) {
        if (plat.type === 'moving') {
            plat.prevX = plat.x;
            plat.prevY = plat.y;
            if (plat.moveAxis === 'h') {
                plat.x = plat.originX + Math.sin(gameTime * plat.moveSpeed + plat.movePhase) * plat.moveRange;
            } else {
                plat.y = plat.originY + Math.sin(gameTime * plat.moveSpeed + plat.movePhase) * plat.moveRange;
            }
        } else if (plat.type === 'crumbling') {
            if (plat.crumbleState === 'shaking') {
                plat.crumbleTimer -= dt;
                if (plat.crumbleTimer <= 0) {
                    plat.crumbleState = 'broken';
                    plat.respawnTimer = CRUMBLE_RESPAWN;
                    spawnKillParticles(plat.x + plat.width / 2, plat.y + plat.height / 2, '#887766');
                    playCrumble();
                }
            } else if (plat.crumbleState === 'broken') {
                plat.respawnTimer -= dt;
                if (plat.respawnTimer <= 0) {
                    plat.crumbleState = 'idle';
                }
            }
        }
    }
}

// Check if player is standing on a crumbling platform and trigger shake
function checkCrumbleTrigger(player, platforms) {
    if (!player.grounded) return;
    for (const plat of platforms) {
        if (plat.type !== 'crumbling' || plat.crumbleState !== 'idle') continue;
        if (player.y + player.height >= plat.y - 2 && player.y + player.height <= plat.y + 4 &&
            player.x + player.width > plat.x && player.x < plat.x + plat.width) {
            plat.crumbleState = 'shaking';
            plat.crumbleTimer = CRUMBLE_DELAY;
        }
    }
}

// Apply moving platform horizontal carry (vertical is handled by collision resolution)
function applyMovingPlatformRide(entity) {
    if (entity.ridingPlatform && entity.ridingPlatform.type === 'moving') {
        const p = entity.ridingPlatform;
        if (p.moveAxis === 'h') {
            entity.x += (p.x - (p.prevX || p.x));
        }
    }
}

function update(dt) {
    const isAdventure = currentMode === GAME_MODE.ADVENTURE;

    if (isAdventure) {
        updateCamera(player, dt);
    }

    const camera = getCamera();
    const platforms = refreshPlatforms();
    const blocks = getActiveBlocks();

    // Update moving/crumbling platforms before entity physics
    if (isAdventure) {
        updateSpecialPlatforms(platforms, dt);
    }

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
    updatePlayer(player, dt, bullets, currentMode, camera, platforms);

    // Apply moving platform ride (player + enemies)
    if (isAdventure) {
        applyMovingPlatformRide(player);
        for (const enemy of enemies) {
            applyMovingPlatformRide(enemy);
        }
    }

    if (wasAirborne && player.grounded) {
        spawnLandingDust(player.x + player.width / 2, player.y + player.height);
        if (player.bouncedThisFrame) {
            playBounce();
            player.bouncedThisFrame = false;
        }
    }

    // Crumble trigger
    if (isAdventure) {
        checkCrumbleTrigger(player, platforms);
    }

    // Destructible block collisions (adventure only)
    if (isAdventure && blocks.length > 0) {
        const hitBlocks = checkBlockCollisions(player, blocks);
        for (const block of hitBlocks) {
            block.broken = true;
            const bx = block.x + block.width / 2;
            const by = block.y + block.height / 2;
            spawnKillParticles(bx, by, '#FFDD44');
            playBlockBreak();

            // Drop power-up based on height
            const dropType = getBlockDrop(block.worldY);
            if (dropType) {
                spawnPickup(bx, by, dropType);
            }
        }
    }

    // Track distance
    if (isAdventure) {
        maxPlayerX = Math.max(maxPlayerX, player.x);

        // Checkpoints every 500m
        const distMeters = Math.floor(maxPlayerX / 100);
        if (distMeters >= lastCheckpoint + 500) {
            lastCheckpoint += 500;
            showAnnouncement(`Checkpoint: ${lastCheckpoint}m!`);
            playCheckpoint();
        }

        // Zone transitions
        const newZone = getZoneIndex(distMeters);
        if (newZone > currentZone) {
            currentZone = newZone;
            showAnnouncement(ZONES[currentZone].name);
            triggerShake(4, 0.3);
        }
    }

    moveBullets(bullets, dt, currentMode, camera);
    updateEnemies(enemies, player, dt, currentMode, camera, platforms);
    updateSpawner(dt, enemies, currentMode, camera, platforms);

    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) comboCount = 0;
    }

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

                // Giant mode knockback
                if (isAdventure && hasPowerUp(player, 'giant')) {
                    const dir = enemies[j].x > player.x ? 1 : -1;
                    enemies[j].vx += dir * 200;
                }

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

                    // Drops — adventure mode has extra power-up drops
                    const dropRoll = Math.random();
                    if (dropRoll < 0.15) spawnHealthPickup(ex, ey);
                    else if (dropRoll < 0.20) spawnPickup(ex, ey, 'shotgun');
                    else if (dropRoll < 0.25) spawnPickup(ex, ey, 'rapid');
                    else if (isAdventure) {
                        if (dropRoll < 0.32) spawnPickup(ex, ey, 'speed');
                        else if (dropRoll < 0.38) spawnPickup(ex, ey, 'superJump');
                        else if (dropRoll < 0.43) spawnPickup(ex, ey, 'doubleShot');
                        else if (dropRoll < 0.46) spawnPickup(ex, ey, 'shield');
                        else if (dropRoll < 0.48) spawnPickup(ex, ey, 'giant');
                    }

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
                const hasShield = player.shieldHits > 0;
                triggerShake(hasShield ? 3 : 6, 0.2);
                if (hasShield) {
                    playShieldHit();
                } else {
                    playPlayerHit();
                    flashAlpha = 0.4;
                }
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
            if (pu.type === 'health') {
                playPickup();
                player.health = Math.min(player.health + pu.healAmount, PLAYER_MAX_HEALTH);
                spawnScorePopup(pu.x + 8, pu.y - 10, 'HP');
            } else if (pu.type === 'shotgun') {
                playPickup();
                giveWeapon(player, 'shotgun', 8);
                showAnnouncement('SHOTGUN!');
            } else if (pu.type === 'rapid') {
                playPickup();
                giveWeapon(player, 'rapid', 8);
                showAnnouncement('RAPID FIRE!');
            } else {
                // New power-up types
                playPowerUp();
                applyPowerUp(player, pu.type);
                const labels = {
                    speed: 'SPEED BOOST!',
                    superJump: 'SUPER JUMP!',
                    doubleShot: 'DOUBLE SHOT!',
                    shield: 'SHIELD!',
                    giant: 'GIANT MODE!',
                };
                showAnnouncement(labels[pu.type] || pu.type.toUpperCase() + '!');
            }
            removePickup(i);
        }
    }

    // Remove enemies that fell off
    const fallLimit = isAdventure ? camera.y + CANVAS_HEIGHT + 100 : CANVAS_HEIGHT + 100;
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].y > fallLimit) enemies.splice(i, 1);
    }

    updateEffects(dt, platforms);

    // Fall death
    const deathY = isAdventure ? camera.y + CANVAS_HEIGHT + 50 : CANVAS_HEIGHT + 50;
    if (player.y > deathY) {
        player.health = 0;
    }

    // Death check
    if (player.health <= 0) {
        const px = player.x + player.width / 2;
        const py = Math.min(player.y + player.height / 2, (isAdventure ? camera.y + CANVAS_HEIGHT : CANVAS_HEIGHT) - 20);
        for (let i = 0; i < 3; i++) spawnKillParticles(px, py, COLOR_PLAYER);
        triggerShake(12, 0.5);
        flashAlpha = 0.6;
        playPlayerDeath();
        deathTimer = 1.2;
        state = STATE.DYING;
    }
}

function getBlockDrop(worldY) {
    const roll = Math.random();
    if (worldY < 200) {
        // High blocks — 80% drop rate, uncommon/rare
        if (roll < 0.25) return 'shield';
        if (roll < 0.50) return 'giant';
        if (roll < 0.80) return 'doubleShot';
        return null;
    } else if (worldY < 350) {
        // Mid blocks — 70% drop rate
        if (roll < 0.25) return 'speed';
        if (roll < 0.45) return 'doubleShot';
        if (roll < 0.70) return 'superJump';
        return null;
    } else {
        // Low blocks — 60% drop rate
        if (roll < 0.25) return 'superJump';
        if (roll < 0.45) return 'health';
        if (roll < 0.60) return 'speed';
        return null;
    }
}

function getZoneIndex(distMeters) {
    for (let i = ZONES.length - 1; i >= 0; i--) {
        if (distMeters >= ZONES[i].dist) return i;
    }
    return 0;
}

function getZoneData() {
    const distMeters = Math.floor(maxPlayerX / 100);
    const zi = getZoneIndex(distMeters);
    const zone = ZONES[zi];
    const nextZone = ZONES[zi + 1];
    if (!nextZone) return { zone, blend: 0 };
    // Blend over 100m near zone boundary
    const distIntoZone = distMeters - zone.dist;
    const zoneWidth = nextZone.dist - zone.dist;
    const transitionStart = zoneWidth - 100;
    if (distIntoZone > transitionStart) {
        return { zone, nextZone, blend: (distIntoZone - transitionStart) / 100 };
    }
    return { zone, blend: 0 };
}

function render(dt) {
    const camera = getCamera();
    const platforms = getActivePlatforms();
    const blocks = getActiveBlocks();
    const isAdventure = currentMode === GAME_MODE.ADVENTURE;

    const shake = getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    const zoneData = isAdventure ? getZoneData() : null;
    renderGame(player, enemies, bullets, score, dt, killCount, survivalTime, currentMode, camera, platforms, blocks, zoneData, gameTime);

    // World effects inside camera transform
    if (isAdventure) {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        renderWorldEffects(ctx);
        ctx.restore();
    } else {
        renderWorldEffects(ctx);
    }

    // Screen effects
    renderScreenEffects(ctx);

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

    // Adventure HUD extras
    if (isAdventure) {
        const distMeters = Math.floor(maxPlayerX / 100);
        const displayScore = score + distMeters;

        ctx.fillStyle = '#88CCFF';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Distance: ${distMeters}m`, 10, 64);

        // Active power-ups
        let puY = 82;
        const puColors = { speed: '#FFFF44', superJump: '#44FF88', doubleShot: '#FF44FF', shield: '#88BBFF', giant: '#FF8844' };
        const puLabels = { speed: 'SPD', superJump: 'JMP', doubleShot: 'DBL', shield: 'SHD', giant: 'BIG' };
        for (const type in player.activePowerUps) {
            const timer = player.activePowerUps[type];
            ctx.fillStyle = puColors[type] || '#fff';
            ctx.font = 'bold 11px monospace';
            const label = puLabels[type] || type.slice(0, 3).toUpperCase();
            const display = type === 'shield' ? `${label} ${player.shieldHits}` : `${label} ${Math.ceil(timer)}s`;
            ctx.fillText(display, 10, puY);
            puY += 16;
        }

        // Show combined score in HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('Score: ' + displayScore, CANVAS_WIDTH - 10, 26);
    }

    ctx.restore();

    // Screen flash
    if (flashAlpha > 0) {
        ctx.fillStyle = '#FF0000';
        ctx.globalAlpha = Math.max(0, flashAlpha);
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalAlpha = 1.0;
    }
}

export function getGameMode() {
    return currentMode;
}
