import {
    CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_ENEMY, COLOR_FLYER, COLOR_TANK, COLOR_PLAYER,
    PLAYER_MAX_HEALTH, GAME_MODE,
    TILE, STORY_LIVES, STORY_TIME_LIMIT, COIN_VALUE, STOMP_BOUNCE
} from './constants.js';
import { initInput, resetFrameInput, isKeyDown } from './input.js';
import { initRenderer, renderGame } from './renderer.js';
import { createPlayer, updatePlayer, damagePlayer, giveWeapon, applyPowerUp, hasPowerUp } from './player.js';
import { moveBullets } from './bullet.js';
import { createEnemy, updateEnemies } from './enemy.js';
import { collides } from './physics.js';
import { initUI, showMenu, showGameOver, showPause, hidePause, showVictory, hideVictory } from './ui.js';
import {
    updateEffects, renderWorldEffects, renderScreenEffects, resetEffects,
    spawnKillParticles, spawnScorePopup, triggerShake, getShakeOffset,
    spawnPickup, getPickups, removePickup, showAnnouncement,
    spawnLandingDust, spawnCoinSparkle, spawnSquishParticles
} from './effects.js';
import {
    playEnemyDeath, playPlayerHit, playPickup, playPlayerDeath, playPowerUp,
    playShieldHit, playCrumble,
    playStomp, playCoin, playFlag, playCourseClear, playOneUp, playBumpBlock
} from './audio.js';
import { createCamera, updateCamera, getCamera } from './camera.js';
import { loadLevel } from './level.js';
import { LEVEL_1 } from './levels/level1.js';
import { LEVEL_2 } from './levels/level2.js';
import { LEVEL_3 } from './levels/level3.js';
import { LEVEL_4 } from './levels/level4.js';

const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];

const SAVE_KEY = 'spb_progress_v1';
function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return { cleared: [], unlocked: 1 };
        return JSON.parse(raw);
    } catch (e) { return { cleared: [], unlocked: 1 }; }
}
function saveProgress(data) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}
function markCleared(idx) {
    const s = loadSave();
    if (!s.cleared.includes(idx)) s.cleared.push(idx);
    s.unlocked = Math.max(s.unlocked, idx + 2);
    saveProgress(s);
}
export function getProgress() { return loadSave(); }

const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', DYING: 'DYING', GAME_OVER: 'GAME_OVER', VICTORY: 'VICTORY' };
const ENEMY_COLORS = { runner: COLOR_ENEMY, flyer: COLOR_FLYER, tank: COLOR_TANK };

const currentMode = GAME_MODE.STORY;

let canvas, ctx;
let state;
let player, enemies, bullets, score;
let lastTime;
let escapeHeld = false;
let killCount = 0;
let survivalTime = 0;
let gameTime = 0;

let comboCount = 0;
let comboTimer = 0;
const COMBO_WINDOW = 1.5;

let deathTimer = 0;
let flashAlpha = 0;
let hitPauseTimer = 0;
let zoomPunch = 0;

let cachedPlatforms = null;

// Story state
let storyLives = STORY_LIVES;
let storyTimeRemaining = STORY_TIME_LIMIT;
let coinCount = 0;
let storyLevel = null;
let qBlocks = [];
let coins = [];
let decoTiles = [];
let pipeTiles = [];
let hazardTiles = [];
let movingPlatforms = [];
let crumbleTilesList = [];
let levelFlag = null;
let levelCastle = null;
let currentLevelIndex = 0;
let victoryTimer = 0;
let victoryPhase = 'sliding';
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
        onStartStoryAt: (idx) => startStory(idx),
        onRestart: () => startStory(currentLevelIndex),
        onResume: resumePlaying,
        onAdvance: advanceToNextLevel,
    });

    state = STATE.MENU;
    showMenu();
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function startStory(levelIndex = 0) {
    storyLives = STORY_LIVES;
    storyTimeRemaining = STORY_TIME_LIMIT;
    coinCount = 0;
    score = 0;
    currentLevelIndex = Math.max(0, Math.min(LEVELS.length - 1, levelIndex));
    startPlaying();
}

export function startStoryAtLevel(idx) { startStory(idx); }

export function advanceToNextLevel() {
    if (victoryStateData && !victoryStateData.isLastLevel) {
        currentLevelIndex = victoryStateData.nextLevelIndex;
        storyLives = STORY_LIVES;
        storyTimeRemaining = STORY_TIME_LIMIT;
        coinCount = 0;
        startPlaying();
    }
}

function startPlaying() {
    player = createPlayer(currentMode);
    enemies = [];
    bullets = [];
    killCount = 0;
    comboCount = 0;
    comboTimer = 0;
    survivalTime = 0;
    gameTime = 0;
    deathTimer = 0;
    flashAlpha = 0;
    hitPauseTimer = 0;
    zoomPunch = 0;
    victoryTimer = 0;
    victoryPhase = 'sliding';
    resetEffects();

    const levelData = LEVELS[currentLevelIndex] || LEVEL_1;
    storyLevel = loadLevel(levelData);
    player.x = storyLevel.spawn.x;
    player.y = storyLevel.spawn.y;
    qBlocks = storyLevel.blocks;
    coins = storyLevel.coins.map(c => ({ ...c }));
    decoTiles = storyLevel.decoTiles;
    pipeTiles = storyLevel.pipes;
    hazardTiles = storyLevel.hazards || [];
    movingPlatforms = (storyLevel.movingPlatforms || []).map(m => ({ ...m }));
    crumbleTilesList = (storyLevel.crumbleTiles || []).map(c => ({ ...c }));
    levelFlag = storyLevel.flag;
    levelCastle = storyLevel.castle;
    for (const e of storyLevel.enemies) {
        const en = createEnemy(e.tx * TILE, e.ty * TILE, e.type);
        en.fromLevel = true;
        enemies.push(en);
    }
    createCamera(player.x);

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
            if (hitPauseTimer > 0) {
                hitPauseTimer -= dt;
                render(0);
            } else {
                survivalTime += dt;
                gameTime += dt;
                storyTimeRemaining -= dt;
                if (storyTimeRemaining <= 0) {
                    storyTimeRemaining = 0;
                    player.health = 0;
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
            if (storyLives > 1) {
                storyLives--;
                storyTimeRemaining = STORY_TIME_LIMIT;
                showAnnouncement(`MARIO × ${storyLives}`);
                startPlaying();
            } else {
                state = STATE.GAME_OVER;
                const timeStr = formatTime(survivalTime);
                const displayScore = score + coinCount * COIN_VALUE;
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
            const stars = computeStars(storyTimeRemaining, coinCount);
            const isLastLevel = currentLevelIndex >= LEVELS.length - 1;
            markCleared(currentLevelIndex);
            victoryStateData = {
                score: finalScore,
                time: storyTimeRemaining,
                coins: coinCount,
                kills: killCount,
                bonus: timeBonus,
                stars,
                levelName: storyLevel.name,
                isLastLevel,
                nextLevelIndex: currentLevelIndex + 1,
            };
            showVictory(victoryStateData);
            state = STATE.GAME_OVER;
        }
    }
}

function computeStars(timeLeft, c) {
    let s = 1;
    if (timeLeft > 100) s++;
    if (c >= 15) s++;
    return Math.min(3, s);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function refreshPlatforms() {
    if (!storyLevel) {
        cachedPlatforms = [];
        return cachedPlatforms;
    }
    const dynamic = [];
    for (const m of movingPlatforms) dynamic.push(m);
    cachedPlatforms = storyLevel.platforms.concat(dynamic);
    return cachedPlatforms;
}

function getActivePlatforms() {
    return cachedPlatforms || [];
}

function updateMovingPlatforms() {
    for (const m of movingPlatforms) {
        m.prevX = m.x;
        m.prevY = m.y;
        if (m.moveAxis === 'h') {
            m.x = m.originX + Math.sin(gameTime * m.moveSpeed + m.movePhase) * m.moveRange;
        } else {
            m.y = m.originY + Math.sin(gameTime * m.moveSpeed + m.movePhase) * m.moveRange;
        }
    }
}

function updateCrumbleTiles(dt) {
    for (const c of crumbleTilesList) {
        if (c.state === 'shaking') {
            c.timer -= dt;
            if (c.timer <= 0) {
                c.state = 'broken';
                c.respawn = 4.0;
                spawnKillParticles(c.x + 16, c.y + 16, '#888');
                playCrumble();
                if (storyLevel) {
                    storyLevel.platforms = storyLevel.platforms.filter(p =>
                        !(p.x === c.x && p.y === c.y && p.tileType === 'x')
                    );
                }
            }
        } else if (c.state === 'broken') {
            c.respawn -= dt;
            if (c.respawn <= 0) {
                c.state = 'idle';
                if (storyLevel) {
                    storyLevel.platforms.push({
                        x: c.x, y: c.y, width: 32, height: 32, type: 'solid', tileType: 'x',
                    });
                }
            }
        }
    }
}

function checkCrumbleStand(player) {
    if (!player.grounded) return;
    for (const c of crumbleTilesList) {
        if (c.state !== 'idle') continue;
        if (player.y + player.height >= c.y - 2 && player.y + player.height <= c.y + 4 &&
            player.x + player.width > c.x && player.x < c.x + 32) {
            c.state = 'shaking';
            c.timer = 0.6;
        }
    }
}

function checkHazardTouch(player) {
    for (const h of hazardTiles) {
        if (h.type === 'spike') {
            if (player.x + player.width > h.x + 4 && player.x < h.x + h.width - 4 &&
                player.y + player.height > h.y + 4 && player.y < h.y + h.height) {
                damagePlayerHazard(player, 30);
                return;
            }
        } else if (h.type === 'lava') {
            if (player.x + player.width > h.x && player.x < h.x + h.width &&
                player.y + player.height > h.y + 8) {
                player.health = 0;
                return;
            }
        } else if (h.type === 'firebar') {
            const angle = gameTime * h.speed + h.phase;
            for (let i = 1; i <= h.length; i++) {
                const fx = h.x + Math.cos(angle) * i * 16;
                const fy = h.y + Math.sin(angle) * i * 16;
                if (player.x + player.width > fx - 6 && player.x < fx + 6 &&
                    player.y + player.height > fy - 6 && player.y < fy + 6) {
                    damagePlayerHazard(player, 30);
                    return;
                }
            }
        }
    }
}

function damagePlayerHazard(player, amount) {
    if (player.invincible > 0) return;
    if (player.shieldHits > 0) {
        player.shieldHits--;
        player.invincible = 0.5;
        triggerShake(3, 0.15);
        playShieldHit();
        return;
    }
    player.health -= amount;
    player.invincible = 1.0;
    triggerShake(6, 0.2);
    playPlayerHit();
    flashAlpha = 0.4;
    player.vy = -300;
}

function checkQBlockBump(player, dt) {
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
    for (const b of qBlocks) if (b.bumpT > 0) b.bumpT -= dt;
}

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

function checkFlagTouch(player) {
    if (!levelFlag) return false;
    if (player.x + player.width >= levelFlag.x &&
        player.x <= levelFlag.x + levelFlag.width + 10) {
        player.x = levelFlag.x - player.width + 4;
        player.vx = 0;
        player.vy = 0;
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
    updateCamera(player, dt, storyLevel);

    const camera = getCamera();
    const platforms = refreshPlatforms();
    updateMovingPlatforms();
    updateCrumbleTiles(dt);

    const wasAirborne = !player.grounded;
    updatePlayer(player, dt, bullets, currentMode, camera, platforms);

    // Carry on horizontal movers
    for (const m of movingPlatforms) {
        if (player.ridingPlatform === m && m.moveAxis === 'h') {
            player.x += (m.x - m.prevX);
        }
        for (const e of enemies) {
            if (e.ridingPlatform === m && m.moveAxis === 'h') {
                e.x += (m.x - m.prevX);
            }
        }
    }

    if (wasAirborne && player.grounded) {
        spawnLandingDust(player.x + player.width / 2, player.y + player.height);
    }

    checkCrumbleStand(player);
    checkQBlockBump(player, dt);
    checkCoinCollect(player);
    checkHazardTouch(player);
    if (checkFlagTouch(player)) {
        enemies = [];
        return;
    }

    moveBullets(bullets, dt, currentMode, camera);
    updateEnemies(enemies, player, dt, currentMode, camera, platforms);

    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) comboCount = 0;
    }

    if (flashAlpha > 0) flashAlpha -= dt * 3;

    // Bullet-enemy
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const bBox = { x: b.x - b.radius, y: b.y - b.radius, width: b.radius * 2, height: b.radius * 2 };
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (collides(bBox, enemies[j])) {
                enemies[j].health -= b.damage;
                enemies[j].hitFlash = 0.08;
                bullets.splice(i, 1);
                if (enemies[j].health <= 0) {
                    killEnemy(enemies, j);
                }
                break;
            }
        }
    }

    // Stomp + collision
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!collides(player, enemy)) continue;

        const playerFeet = player.y + player.height;
        const enemyTop = enemy.y;
        const fallingOnto = player.vy > 50 && playerFeet < enemyTop + 16;

        if (fallingOnto && enemy.type !== 'tank') {
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
                spawnSquishParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height, '#9C4810');
                playStomp();
                killEnemy(enemies, i, true);
            }
            continue;
        }

        if (fallingOnto && enemy.type === 'tank') {
            player.vy = -STOMP_BOUNCE * 0.7;
            enemy.health -= 1;
            enemy.hitFlash = 0.1;
            triggerHitPause(0.05);
            triggerShake(4, 0.2);
            playStomp();
            if (enemy.health <= 0) {
                killEnemy(enemies, i, true);
            }
            continue;
        }

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
                storyLives++;
                showAnnouncement('1-UP!');
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

    const fallLimit = camera.y + CANVAS_HEIGHT + 100;
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].y > fallLimit) enemies.splice(i, 1);
    }

    for (const e of enemies) if (e.hitFlash > 0) e.hitFlash -= dt;

    updateEffects(dt, platforms);

    const deathY = camera.y + CANVAS_HEIGHT + 50;
    if (player.y > deathY) {
        player.health = 0;
    }

    if (player.health <= 0 && state === STATE.PLAYING) {
        const px = player.x + player.width / 2;
        const py = Math.min(player.y + player.height / 2, camera.y + CANVAS_HEIGHT - 20);
        for (let i = 0; i < 3; i++) spawnKillParticles(px, py, COLOR_PLAYER);
        triggerShake(12, 0.5);
        flashAlpha = 0.6;
        playPlayerDeath();
        deathTimer = 1.6;
        state = STATE.DYING;
    }
}

function killEnemy(enemiesArr, j, fromStomp = false) {
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

    if (Math.random() < 0.04) spawnPickup(ex, ey, 'oneup');
    enemiesArr.splice(j, 1);
}

function triggerHitPause(duration) {
    hitPauseTimer = Math.max(hitPauseTimer, duration);
}

function render(dt) {
    const camera = getCamera();
    const platforms = getActivePlatforms();

    const shake = getShakeOffset();
    ctx.save();

    if (zoomPunch > 0) {
        const z = 1 + zoomPunch * 0.04;
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.scale(z, z);
        ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
    }
    ctx.translate(shake.x, shake.y);

    const storyData = {
        decoTiles, pipeTiles, qBlocks, coins, flag: levelFlag, castle: levelCastle,
        hazards: hazardTiles, movingPlatforms, crumbleTilesList,
        lives: storyLives, coinCount, timeRemaining: storyTimeRemaining,
        levelName: storyLevel ? storyLevel.name : '',
        theme: storyLevel ? storyLevel.theme : 'overworld',
    };
    renderGame(player, enemies, bullets, score, dt, killCount, survivalTime, currentMode, camera, platforms, [], null, gameTime, storyData);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    renderWorldEffects(ctx);
    ctx.restore();

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

    ctx.restore();

    if (flashAlpha > 0) {
        ctx.fillStyle = '#FF0000';
        ctx.globalAlpha = Math.max(0, flashAlpha);
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalAlpha = 1.0;
    }
}

export function getGameMode() { return currentMode; }
