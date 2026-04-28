import {
    CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_ENEMY, COLOR_FLYER, COLOR_TANK, COLOR_PLAYER,
    PLAYER_MAX_HEALTH, GAME_MODE, PLATFORMS, CRUMBLE_DELAY, CRUMBLE_RESPAWN,
    TILE, STORY_LIVES, STORY_TIME_LIMIT, COIN_VALUE, STOMP_BOUNCE
} from './constants.js';
import { initInput, resetFrameInput, isKeyDown, jumpPressedThisFrame } from './input.js';
import { initRenderer, renderGame } from './renderer.js';
import { createPlayer, updatePlayer, damagePlayer, giveWeapon, applyPowerUp, hasPowerUp } from './player.js';
import { moveBullets } from './bullet.js';
import { createEnemy, updateEnemies } from './enemy.js';
import { resetSpawner, updateSpawner } from './spawner.js';
import { collides, checkBlockCollisions } from './physics.js';
import { initUI, showMenu, showGameOver, showPause, hidePause, showVictory, hideVictory } from './ui.js';
import {
    updateEffects, renderWorldEffects, renderScreenEffects, resetEffects,
    spawnKillParticles, spawnScorePopup, triggerShake, getShakeOffset,
    spawnHealthPickup, spawnPickup, getPickups, removePickup, showAnnouncement,
    spawnLandingDust, spawnCoinSparkle, spawnSquishParticles
} from './effects.js';
import {
    playEnemyDeath, playPlayerHit, playPickup, playPlayerDeath, playPowerUp,
    playShieldHit, playBlockBreak, playBounce, playCrumble, playCheckpoint,
    playStomp, playCoin, playFlag, playCourseClear, playOneUp, playBumpBlock
} from './audio.js';
import { createCamera, updateCamera, getCamera, resetCamera } from './camera.js';
import { createTerrain, updateTerrain, getVisiblePlatforms, getVisibleBlocks, resetTerrain } from './terrain.js';
import { loadLevel, getCurrentLevel, resetLevel } from './level.js';
import { LEVEL_1 } from './levels/level1.js';

const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', DYING: 'DYING', GAME_OVER: 'GAME_OVER', VICTORY: 'VICTORY' };
const ENEMY_COLORS = { runner: COLOR_ENEMY, flyer: COLOR_FLYER, tank: COLOR_TANK };

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

let comboCount = 0;
let comboTimer = 0;
const COMBO_WINDOW = 1.5;

let lastDiffTier = 0;
const DIFF_THRESHOLDS = [30, 60, 90, 120, 180];

let deathTimer = 0;
let flashAlpha = 0;
let hitPauseTimer = 0;
let zoomPunch = 0;

let maxPlayerX = 0;
let lastCheckpoint = 0;
let currentZone = 0;

let cachedPlatforms = null;
let cachedBlocks = null;

// Story mode state
let storyLives = STORY_LIVES;
let storyTimeRemaining = STORY_TIME_LIMIT;
let coinCount = 0;
let storyLevel = null;
let qBlocks = []; // ?-blocks (bumpable)
let coins = []; // collectible coins
let decoTiles = [];
let pipeTiles = [];
let levelFlag = null;
let levelCastle = null;
let victoryTimer = 0;
let victoryPhase = 'sliding'; // sliding | walking | done
let victoryStateData = null;

export function initGame() {
    canvas = document.getElementById('game-canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    initInput(canvas);
    initRenderer(ctx);
    initUI({
        onStartArena: startArena,
        onStartAdventure: startAdventure,
        onStartStory: startStory,
        onRestart: () => {
            if (currentMode === GAME_MODE.STORY) startStory();
            else if (currentMode === GAME_MODE.ADVENTURE) startAdventure();
            else startArena();
        },
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

function startStory() {
    currentMode = GAME_MODE.STORY;
    storyLives = STORY_LIVES;
    storyTimeRemaining = STORY_TIME_LIMIT;
    coinCount = 0;
    score = 0;
    startPlaying();
}

function startPlaying() {
    player = createPlayer(currentMode);
    enemies = [];
    bullets = [];
    if (currentMode !== GAME_MODE.STORY) score = 0;
    killCount = 0;
    nextWaveAt = 10;
    comboCount = 0;
    comboTimer = 0;
    survivalTime = 0;
    gameTime = 0;
    deathTimer = 0;
    flashAlpha = 0;
    hitPauseTimer = 0;
    zoomPunch = 0;
    lastDiffTier = 0;
    maxPlayerX = 0;
    lastCheckpoint = 0;
    currentZone = 0;
    victoryTimer = 0;
    victoryPhase = 'sliding';
    resetSpawner();
    resetEffects();

    if (currentMode === GAME_MODE.STORY) {
        storyLevel = loadLevel(LEVEL_1);
        player.x = storyLevel.spawn.x;
        player.y = storyLevel.spawn.y;
        qBlocks = storyLevel.blocks;
        coins = storyLevel.coins.map(c => ({ ...c }));
        decoTiles = storyLevel.decoTiles;
        pipeTiles = storyLevel.pipes;
        levelFlag = storyLevel.flag;
        levelCastle = storyLevel.castle;
        // Spawn hand-placed enemies
        for (const e of storyLevel.enemies) {
            const en = createEnemy(e.tx * TILE, e.ty * TILE, e.type);
            en.fromLevel = true;
            enemies.push(en);
        }
        createCamera(player.x);
        resetTerrain();
    } else if (currentMode === GAME_MODE.ADVENTURE) {
        createTerrain();
        createCamera(player.x);
        storyLevel = null;
        qBlocks = [];
        coins = [];
        decoTiles = [];
        pipeTiles = [];
        levelFlag = null;
    } else {
        resetTerrain();
        resetCamera();
        storyLevel = null;
        qBlocks = [];
        coins = [];
        decoTiles = [];
        pipeTiles = [];
        levelFlag = null;
    }

    state = STATE.PLAYING;
}

function resumePlaying() {
    hidePause();
    state = STATE.PLAYING;
    lastTime = performance.now();
}

function loop(timestamp) {
    let dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (state === STATE.PLAYING) {
        if (isKeyDown('escape') && !escapeHeld) {
            escapeHeld = true;
            state = STATE.PAUSED;
            showPause();
        }
        if (!isKeyDown('escape')) escapeHeld = false;

        if (state === STATE.PLAYING) {
            // Hit-pause: freeze logic but keep rendering
            if (hitPauseTimer > 0) {
                hitPauseTimer -= dt;
                render(0);
            } else {
                survivalTime += dt;
                gameTime += dt;
                if (currentMode === GAME_MODE.STORY) {
                    storyTimeRemaining -= dt;
                    if (storyTimeRemaining <= 0) {
                        storyTimeRemaining = 0;
                        player.health = 0;
                    }
                }
                update(dt);
                render(dt);
            }
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
            if (currentMode === GAME_MODE.STORY && storyLives > 1) {
                // Lose a life, restart level
                storyLives--;
                storyTimeRemaining = STORY_TIME_LIMIT;
                showAnnouncement(`MARIO × ${storyLives}`);
                startPlaying();
            } else {
                state = STATE.GAME_OVER;
                const timeStr = formatTime(survivalTime);
                let displayScore = score;
                if (currentMode === GAME_MODE.ADVENTURE) {
                    displayScore = score + Math.floor(maxPlayerX / 100);
                } else if (currentMode === GAME_MODE.STORY) {
                    displayScore = score + coinCount * COIN_VALUE;
                }
                showGameOver(displayScore, killCount, timeStr);
            }
        }
    } else if (state === STATE.VICTORY) {
        gameTime += dt;
        updateVictory(dt);
        updateEffects(dt, getActivePlatforms());
        render(dt);
    }

    if (zoomPunch > 0) zoomPunch -= dt * 4;

    resetFrameInput();
    requestAnimationFrame(loop);
}

function updateVictory(dt) {
    victoryTimer += dt;
    if (victoryPhase === 'sliding') {
        // Slide down pole
        if (levelFlag) {
            player.y += 200 * dt;
            if (player.y + player.height >= levelFlag.base) {
                player.y = levelFlag.base - player.height;
                victoryPhase = 'walking';
                playCourseClear();
            }
        } else {
            victoryPhase = 'walking';
        }
    } else if (victoryPhase === 'walking') {
        player.x += 80 * dt;
        if (victoryTimer > 4) {
            victoryPhase = 'done';
            const timeBonus = Math.floor(storyTimeRemaining) * 50;
            const finalScore = score + coinCount * COIN_VALUE + timeBonus;
            const stars = computeStars(storyTimeRemaining, coinCount, killCount);
            victoryStateData = { score: finalScore, time: storyTimeRemaining, coins: coinCount, kills: killCount, bonus: timeBonus, stars };
            showVictory(victoryStateData);
            state = STATE.GAME_OVER; // freeze further updates; victory screen handles next
        }
    }
}

function computeStars(timeLeft, c, k) {
    let s = 1;
    if (timeLeft > 100) s++;
    if (c >= 20) s++;
    return Math.min(3, s);
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
    } else if (currentMode === GAME_MODE.STORY && storyLevel) {
        cachedPlatforms = storyLevel.platforms;
        cachedBlocks = []; // qBlocks handled separately
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

function applyMovingPlatformRide(entity) {
    if (entity.ridingPlatform && entity.ridingPlatform.type === 'moving') {
        const p = entity.ridingPlatform;
        if (p.moveAxis === 'h') {
            entity.x += (p.x - (p.prevX || p.x));
        }
    }
}

// === Q-BLOCK BUMP ===
function checkQBlockBump(player, dt) {
    // Check headBonk against any qBlock by x-range overlap
    if (player.headBonk) {
        const playerCx = player.x + player.width / 2;
        for (const b of qBlocks) {
            if (b.used) continue;
            if (b.y === player.headBonk.y &&
                playerCx >= b.x && playerCx <= b.x + b.width) {
                b.used = true;
                b.bumpT = 0.25;
                playBumpBlock();
                const cx = b.x + b.width / 2;
                if (b.contents === 'coin') {
                    coinCount++;
                    score += COIN_VALUE;
                    spawnScorePopup(cx, b.y - 10, '200');
                    spawnCoinSparkle(cx, b.y - 6);
                    playCoin();
                } else if (b.contents === 'mushroom') {
                    spawnPickup(cx, b.y - 16, 'health');
                    playPowerUp();
                } else if (b.contents === 'fireflower') {
                    spawnPickup(cx, b.y - 16, 'rapid');
                    playPowerUp();
                } else if (b.contents === 'star') {
                    spawnPickup(cx, b.y - 16, 'shield');
                    playPowerUp();
                }
                break;
            }
        }
    }
    // Tick bump animation
    for (const b of qBlocks) if (b.bumpT > 0) b.bumpT -= dt;
}

// === COIN COLLECT ===
function checkCoinCollect(player) {
    for (const c of coins) {
        if (c.picked) continue;
        const dx = (player.x + player.width / 2) - c.x;
        const dy = (player.y + player.height / 2) - c.y;
        if (Math.abs(dx) < 18 && Math.abs(dy) < 22) {
            c.picked = true;
            coinCount++;
            score += COIN_VALUE;
            spawnScorePopup(c.x, c.y - 10, '50');
            spawnCoinSparkle(c.x, c.y);
            playCoin();
        }
        c.t += 0.1;
    }
}

// === FLAG CHECK ===
function checkFlagTouch(player) {
    if (!levelFlag) return false;
    if (player.x + player.width >= levelFlag.x &&
        player.x <= levelFlag.x + levelFlag.width + 10) {
        // Snap player to pole
        player.x = levelFlag.x - player.width + 4;
        player.vx = 0;
        player.vy = 0;
        // Compute time bonus from grab height
        const grabRatio = 1 - (player.y - levelFlag.top) / Math.max(1, levelFlag.height);
        const flagBonus = Math.floor(grabRatio * 5000);
        score += flagBonus;
        spawnScorePopup(player.x, player.y - 20, String(flagBonus));
        playFlag();
        state = STATE.VICTORY;
        victoryTimer = 0;
        victoryPhase = 'sliding';
        return true;
    }
    return false;
}

function update(dt) {
    const isAdventure = currentMode === GAME_MODE.ADVENTURE;
    const isStory = currentMode === GAME_MODE.STORY;

    if (isAdventure || isStory) {
        updateCamera(player, dt, storyLevel);
    }

    const camera = getCamera();
    const platforms = refreshPlatforms();
    const blocks = getActiveBlocks();

    if (isAdventure) {
        updateSpecialPlatforms(platforms, dt);
    }

    if (isAdventure) {
        for (let i = lastDiffTier; i < DIFF_THRESHOLDS.length; i++) {
            if (survivalTime >= DIFF_THRESHOLDS[i]) {
                const labels = ['Danger rising...', 'Onslaught!', 'Nightmare!', 'HELL MODE', 'IMPOSSIBLE'];
                showAnnouncement(labels[i]);
                triggerShake(4, 0.3);
                lastDiffTier = i + 1;
            }
        }
    }

    const wasAirborne = !player.grounded;
    updatePlayer(player, dt, bullets, currentMode, camera, platforms);

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

    if (isAdventure) {
        checkCrumbleTrigger(player, platforms);
    }

    if (isAdventure && blocks.length > 0) {
        const hitBlocks = checkBlockCollisions(player, blocks);
        for (const block of hitBlocks) {
            block.broken = true;
            const bx = block.x + block.width / 2;
            const by = block.y + block.height / 2;
            spawnKillParticles(bx, by, '#FFDD44');
            playBlockBreak();
            const dropType = getBlockDrop(block.worldY);
            if (dropType) {
                spawnPickup(bx, by, dropType);
            }
        }
    }

    // Story mode: ?-block bumps + coin collect + flag check
    if (isStory) {
        checkQBlockBump(player, dt);
        checkCoinCollect(player);
        if (checkFlagTouch(player)) {
            // Disable enemies on flag touch
            enemies = [];
            return;
        }
    }

    if (isAdventure) {
        maxPlayerX = Math.max(maxPlayerX, player.x);
        const distMeters = Math.floor(maxPlayerX / 100);
        if (distMeters >= lastCheckpoint + 500) {
            lastCheckpoint += 500;
            showAnnouncement(`Checkpoint: ${lastCheckpoint}m!`);
            playCheckpoint();
        }
        const newZone = getZoneIndex(distMeters);
        if (newZone > currentZone) {
            currentZone = newZone;
            showAnnouncement(ZONES[currentZone].name);
            triggerShake(4, 0.3);
        }
    }

    moveBullets(bullets, dt, currentMode, camera);
    updateEnemies(enemies, player, dt, currentMode, camera, platforms);
    if (!isStory) {
        updateSpawner(dt, enemies, currentMode, camera, platforms);
    }

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
                enemies[j].hitFlash = 0.08;
                bullets.splice(i, 1);

                if (isAdventure && hasPowerUp(player, 'giant')) {
                    const dir = enemies[j].x > player.x ? 1 : -1;
                    enemies[j].vx += dir * 200;
                }

                if (enemies[j].health <= 0) {
                    killEnemy(enemies, j, isAdventure, isStory);
                }
                break;
            }
        }
    }

    // STOMP CHECK + enemy-player collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!collides(player, enemy)) continue;

        // Stomp: player falling, player feet near enemy top
        const playerFeet = player.y + player.height;
        const enemyTop = enemy.y;
        const fallingOnto = player.vy > 50 && playerFeet < enemyTop + 16;
        const stompable = enemy.type !== 'tank' || enemy.stomped;

        if (fallingOnto && stompable && enemy.type !== 'tank') {
            // Stomp!
            player.vy = -STOMP_BOUNCE;
            player.grounded = false;
            triggerHitPause(0.05);
            triggerShake(3, 0.15);
            zoomPunch = 0.08;

            if (enemy.type === 'flyer' && !enemy.wingsClipped) {
                enemy.wingsClipped = true;
                enemy.health = Math.max(1, enemy.health);
                enemy.type = 'runner';
                enemy.width = 28;
                enemy.height = 28;
                spawnSquishParticles(enemy.x + enemy.width / 2, enemy.y, '#F8B070');
                playStomp();
            } else {
                // Goomba squish — score + remove
                spawnSquishParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height, '#9C4810');
                playStomp();
                killEnemy(enemies, i, isAdventure, isStory, true);
            }
            continue;
        }

        // Tank stomp does damage too in story (but bounces player)
        if (fallingOnto && enemy.type === 'tank') {
            player.vy = -STOMP_BOUNCE * 0.7;
            enemy.health -= 1;
            enemy.hitFlash = 0.1;
            triggerHitPause(0.05);
            triggerShake(4, 0.2);
            playStomp();
            if (enemy.health <= 0) {
                killEnemy(enemies, i, isAdventure, isStory, true);
            }
            continue;
        }

        // Damage
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

    // Pickups
    const pickups = getPickups();
    for (let i = pickups.length - 1; i >= 0; i--) {
        if (collides(player, pickups[i])) {
            const pu = pickups[i];
            if (pu.type === 'health') {
                playPickup();
                player.health = Math.min(player.health + (pu.healAmount || 20), PLAYER_MAX_HEALTH);
                spawnScorePopup(pu.x + 8, pu.y - 10, 'HP');
            } else if (pu.type === 'oneup') {
                playOneUp();
                if (currentMode === GAME_MODE.STORY) {
                    storyLives++;
                    showAnnouncement('1-UP!');
                }
            } else if (pu.type === 'shotgun') {
                playPickup();
                giveWeapon(player, 'shotgun', 8);
                showAnnouncement('SHOTGUN!');
            } else if (pu.type === 'rapid') {
                playPickup();
                giveWeapon(player, 'rapid', 10);
                showAnnouncement('FIRE FLOWER!');
            } else {
                playPowerUp();
                applyPowerUp(player, pu.type);
                const labels = {
                    speed: 'SPEED BOOST!',
                    superJump: 'SUPER JUMP!',
                    doubleShot: 'DOUBLE SHOT!',
                    shield: 'STAR POWER!',
                    giant: 'SUPER MARIO!',
                };
                showAnnouncement(labels[pu.type] || pu.type.toUpperCase() + '!');
            }
            removePickup(i);
        }
    }

    // Cull fallen enemies
    const fallLimit = (isAdventure || isStory) ? camera.y + CANVAS_HEIGHT + 100 : CANVAS_HEIGHT + 100;
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].y > fallLimit) enemies.splice(i, 1);
    }

    // Tick enemy hit flash
    for (const e of enemies) if (e.hitFlash > 0) e.hitFlash -= dt;

    updateEffects(dt, platforms);

    const deathY = (isAdventure || isStory) ? camera.y + CANVAS_HEIGHT + 50 : CANVAS_HEIGHT + 50;
    if (player.y > deathY) {
        player.health = 0;
    }

    if (player.health <= 0 && state === STATE.PLAYING) {
        const px = player.x + player.width / 2;
        const py = Math.min(player.y + player.height / 2, (isAdventure || isStory ? camera.y + CANVAS_HEIGHT : CANVAS_HEIGHT) - 20);
        for (let i = 0; i < 3; i++) spawnKillParticles(px, py, COLOR_PLAYER);
        triggerShake(12, 0.5);
        flashAlpha = 0.6;
        playPlayerDeath();
        deathTimer = 1.6;
        state = STATE.DYING;
    }
}

function killEnemy(enemiesArr, j, isAdventure, isStory, fromStomp = false) {
    const e = enemiesArr[j];
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const color = ENEMY_COLORS[e.type] || COLOR_ENEMY;
    if (!fromStomp) spawnKillParticles(ex, ey, color);
    playEnemyDeath();

    comboCount++;
    comboTimer = COMBO_WINDOW;
    const multiplier = Math.min(comboCount, 5);
    const points = e.scoreValue * multiplier;
    score += points;
    const comboText = multiplier > 1 ? `${points} (${multiplier}x)` : `${points}`;
    spawnScorePopup(ex, ey - 20, comboText);
    killCount++;

    if (!isStory) {
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
    } else {
        // Story drops: rare 1-up
        if (Math.random() < 0.04) spawnPickup(ex, ey, 'oneup');
    }
    enemiesArr.splice(j, 1);
}

function triggerHitPause(duration) {
    hitPauseTimer = Math.max(hitPauseTimer, duration);
}

function getBlockDrop(worldY) {
    const roll = Math.random();
    if (worldY < 200) {
        if (roll < 0.25) return 'shield';
        if (roll < 0.50) return 'giant';
        if (roll < 0.80) return 'doubleShot';
        return null;
    } else if (worldY < 350) {
        if (roll < 0.25) return 'speed';
        if (roll < 0.45) return 'doubleShot';
        if (roll < 0.70) return 'superJump';
        return null;
    } else {
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
    const isStory = currentMode === GAME_MODE.STORY;

    const shake = getShakeOffset();
    ctx.save();

    // Zoom punch
    if (zoomPunch > 0) {
        const z = 1 + zoomPunch * 0.04;
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.scale(z, z);
        ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
    }
    ctx.translate(shake.x, shake.y);

    const zoneData = isAdventure ? getZoneData() : null;
    const storyData = isStory ? {
        decoTiles, pipeTiles, qBlocks, coins, flag: levelFlag, castle: levelCastle,
        lives: storyLives, coinCount, timeRemaining: storyTimeRemaining,
        levelName: storyLevel ? storyLevel.name : ''
    } : null;
    renderGame(player, enemies, bullets, score, dt, killCount, survivalTime, currentMode, camera, platforms, blocks, zoneData, gameTime, storyData);

    if (isAdventure || isStory) {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        renderWorldEffects(ctx);
        ctx.restore();
    } else {
        renderWorldEffects(ctx);
    }

    renderScreenEffects(ctx);

    if (comboCount > 1) {
        ctx.fillStyle = '#FFAA00';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(comboTimer / 0.5, 1.0);
        ctx.fillText(`${comboCount}x COMBO`, CANVAS_WIDTH / 2, 50);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'left';
    }

    if (isAdventure) {
        const distMeters = Math.floor(maxPlayerX / 100);
        const displayScore = score + distMeters;
        ctx.fillStyle = '#88CCFF';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Distance: ${distMeters}m`, 10, 64);
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
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('Score: ' + displayScore, CANVAS_WIDTH - 10, 26);
    }

    ctx.restore();

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
