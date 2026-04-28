import {
    CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_ENEMY, COLOR_FLYER, COLOR_TANK, COLOR_PLAYER,
    PLAYER_MAX_HEALTH, GAME_MODE,
    TILE, STORY_LIVES, STORY_TIME_LIMIT, COIN_VALUE, STOMP_BOUNCE,
    POWER_SMALL, POWER_SUPER, POWER_FIRE,
    KOOPA_SHELL_SPEED, KOOPA_SHELL_REVIVE,
    STOMP_COMBO_SCORES, COINS_PER_LIFE, GROUND_POUND_RADIUS
} from './constants.js';
import { initInput, resetFrameInput, isKeyDown } from './input.js';
import { initRenderer, renderGame } from './renderer.js';
import {
    createPlayer, updatePlayer, damagePlayer, demoteOnHit, promotePower,
    giveWeapon, applyPowerUp, hasPowerUp
} from './player.js';
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
    playStomp, playCoin, playFlag, playCourseClear, playOneUp, playBumpBlock,
    playKick, playBrickBreak
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
const ENEMY_COLORS = { runner: COLOR_ENEMY, flyer: COLOR_FLYER, tank: COLOR_TANK, koopa: '#00A800', piranha: '#00A800' };

const currentMode = GAME_MODE.STORY;

let canvas, ctx;
let state;
let player, enemies, bullets, score;
let lastTime;
let escapeHeld = false;
let killCount = 0;
let survivalTime = 0;
let gameTime = 0;

// SMB1-style stomp combo: tracks airborne stomps without touching ground
let airStompChain = 0;

let deathTimer = 0;
let flashAlpha = 0;
let hitPauseTimer = 0;
let zoomPunch = 0;

let cachedPlatforms = null;

// Story state
let storyLives = STORY_LIVES;
let storyTimeRemaining = STORY_TIME_LIMIT;
let coinCount = 0;
let totalCoinsCollected = 0;
let storyLevel = null;
let qBlocks = [];
let coins = [];
let decoTiles = [];
let pipeTiles = [];
let hazardTiles = [];
let movingPlatforms = [];
let crumbleTilesList = [];
let bricks = [];
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
    totalCoinsCollected = 0;
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
    airStompChain = 0;
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
    bricks = storyLevel.bricks || [];
    // Reset broken state on bricks
    for (const b of bricks) { b.broken = false; b.bumpT = 0; }
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
                showAnnouncement(`DAVIO × ${storyLives}`);
                startPlaying();
            } else {
                state = STATE.GAME_OVER;
                const timeStr = formatTime(survivalTime);
                const displayScore = score;
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
            score += timeBonus;
            const stars = computeStars(storyTimeRemaining, coinCount);
            const isLastLevel = currentLevelIndex >= LEVELS.length - 1;
            markCleared(currentLevelIndex);
            victoryStateData = {
                score: score,
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

function updateBricks(dt) {
    for (const b of bricks) {
        if (b.bumpT > 0) b.bumpT -= dt;
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
    if (player.starTimer > 0) return;
    for (const h of hazardTiles) {
        if (h.type === 'spike') {
            if (player.x + player.width > h.x + 4 && player.x < h.x + h.width - 4 &&
                player.y + player.height > h.y + 4 && player.y < h.y + h.height) {
                damagePlayerHazard(player);
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
                    damagePlayerHazard(player);
                    return;
                }
            }
        }
    }
}

function damagePlayerHazard(player) {
    if (player.invincible > 0 || player.starTimer > 0) return;
    const willDie = demoteOnHit(player);
    triggerShake(6, 0.2);
    playPlayerHit();
    flashAlpha = 0.4;
    if (!willDie) player.vy = -300;
}

function checkQBlockBump(player, dt) {
    if (player.headBonk) {
        const playerCx = player.x + player.width / 2;
        // Q-blocks
        for (const b of qBlocks) {
            if (b.used) continue;
            if (b.y === player.headBonk.y &&
                playerCx >= b.x && playerCx <= b.x + b.width) {
                b.used = true;
                b.bumpT = 0.25;
                playBumpBlock();
                const cx = b.x + b.width / 2;
                if (b.contents === 'coin') {
                    addCoin(cx, b.y - 6);
                } else if (b.contents === 'mushroom') {
                    // Context-aware: small Davio gets red mushroom; super+ gets 1up
                    if (player.powerLevel === POWER_SMALL) {
                        spawnPickup(cx, b.y - 16, 'mushroom');
                    } else {
                        spawnPickup(cx, b.y - 16, 'oneup');
                    }
                    playPowerUp();
                } else if (b.contents === 'fireflower') {
                    spawnPickup(cx, b.y - 16, 'fireflower');
                    playPowerUp();
                } else if (b.contents === 'star') {
                    spawnPickup(cx, b.y - 16, 'star');
                    playPowerUp();
                } else if (b.contents === 'oneup') {
                    spawnPickup(cx, b.y - 16, 'oneup');
                    playPowerUp();
                }
                return;
            }
        }
        // Bricks
        for (const b of bricks) {
            if (b.broken) continue;
            if (b.y === player.headBonk.y &&
                playerCx >= b.x && playerCx <= b.x + b.width) {
                if (player.powerLevel !== POWER_SMALL || player.starTimer > 0) {
                    breakBrick(b);
                } else {
                    b.bumpT = 0.25;
                    playBumpBlock();
                }
                return;
            }
        }
    }
}

function breakBrick(b) {
    b.broken = true;
    score += 50;
    spawnKillParticles(b.x + 16, b.y + 8, '#C84C0C');
    spawnKillParticles(b.x + 16, b.y + 24, '#7C2810');
    playBrickBreak();
    triggerShake(2, 0.1);
}

function checkCoinCollect(player) {
    for (const c of coins) {
        if (c.picked) continue;
        const dx = (player.x + player.width / 2) - c.x;
        const dy = (player.y + player.height / 2) - c.y;
        if (Math.abs(dx) < 18 && Math.abs(dy) < 22) {
            c.picked = true;
            addCoin(c.x, c.y);
        }
        c.t += 0.1;
    }
}

function addCoin(cx, cy) {
    coinCount++;
    totalCoinsCollected++;
    score += COIN_VALUE;
    spawnScorePopup(cx, cy - 10, String(COIN_VALUE));
    spawnCoinSparkle(cx, cy);
    playCoin();
    if (totalCoinsCollected >= COINS_PER_LIFE) {
        totalCoinsCollected -= COINS_PER_LIFE;
        storyLives++;
        playOneUp();
        showAnnouncement('1-UP!');
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
    updateBricks(dt);

    const wasAirborne = !player.grounded;
    updatePlayer(player, dt, bullets, currentMode, camera, platforms);

    // Reset air stomp chain on landing
    if (wasAirborne && player.grounded) {
        airStompChain = 0;
    }

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

    // Ground pound shockwave
    if (player.groundPoundLanded > 0.99) {
        triggerShake(8, 0.25);
        zoomPunch = 0.12;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            const dx = (player.x + player.width / 2) - (e.x + e.width / 2);
            const dy = (player.y + player.height) - (e.y + e.height / 2);
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < GROUND_POUND_RADIUS) {
                e.health -= 2;
                e.hitFlash = 0.1;
                if (e.health <= 0) killEnemy(enemies, i, true);
            }
        }
        // Break adjacent bricks below
        for (const b of bricks) {
            if (b.broken) continue;
            const above = (b.y + 32 === Math.round(player.y + player.height) || b.y + 32 - (player.y + player.height) < 8);
            if (above && Math.abs((b.x + 16) - (player.x + player.width / 2)) < 24) {
                breakBrick(b);
            }
        }
    }

    checkCrumbleStand(player);
    checkQBlockBump(player, dt);
    checkCoinCollect(player);
    checkHazardTouch(player);
    if (checkFlagTouch(player)) {
        enemies = [];
        return;
    }

    moveBullets(bullets, dt, currentMode, camera, platforms);
    updateEnemies(enemies, player, dt, currentMode, camera, platforms);

    if (flashAlpha > 0) flashAlpha -= dt * 3;

    // Bullet (fireball) → enemy
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bu = bullets[i];
        const bBox = { x: bu.x - bu.radius, y: bu.y - bu.radius, width: bu.radius * 2, height: bu.radius * 2 };
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (e.type === 'piranha' && e.phase !== 'visible') continue;
            if (collides(bBox, e)) {
                if (e.type === 'tank') {
                    e.health -= bu.damage;
                    e.hitFlash = 0.1;
                    score += 200;
                    spawnScorePopup(e.x + e.width / 2, e.y - 10, '200');
                } else {
                    e.health = 0;
                }
                bullets.splice(i, 1);
                if (e.health <= 0) killEnemy(enemies, j);
                break;
            }
        }
    }

    // Player ↔ enemy
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.type === 'piranha' && enemy.phase !== 'visible') continue;
        if (!collides(player, enemy)) continue;

        // Star power: kill on contact, no damage taken
        if (player.starTimer > 0 && enemy.type !== 'tank') {
            spawnSquishParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height, '#FFE890');
            score += 1000;
            spawnScorePopup(enemy.x + enemy.width / 2, enemy.y - 10, '1000');
            killEnemy(enemies, i, true);
            continue;
        }

        const playerFeet = player.y + player.height;
        const enemyTop = enemy.y;
        const fallingOnto = player.vy > 50 && playerFeet < enemyTop + 16;

        // Koopa shell interactions
        if (enemy.type === 'koopa') {
            if (enemy.shellState === 'shell') {
                // Touching idle shell — kick it
                if (fallingOnto) {
                    // Stomping idle shell stops it / re-bumps
                    player.vy = -STOMP_BOUNCE;
                    enemy.shellTimer = KOOPA_SHELL_REVIVE;
                    triggerHitPause(0.04);
                    playStomp();
                    continue;
                } else {
                    // Side touch — kick
                    const kickDir = (player.x + player.width / 2) < (enemy.x + enemy.width / 2) ? 1 : -1;
                    enemy.shellState = 'sliding';
                    enemy.vx = kickDir * KOOPA_SHELL_SPEED;
                    enemy.shellTimer = 999;
                    playKick();
                    score += 400;
                    spawnScorePopup(enemy.x + enemy.width / 2, enemy.y - 10, '400');
                    // Brief invincibility so we don't immediately get hit by it
                    player.invincible = 0.3;
                    continue;
                }
            } else if (enemy.shellState === 'sliding') {
                // Stomp slides → stop
                if (fallingOnto) {
                    player.vy = -STOMP_BOUNCE;
                    enemy.shellState = 'shell';
                    enemy.vx = 0;
                    enemy.shellTimer = KOOPA_SHELL_REVIVE;
                    triggerHitPause(0.04);
                    playStomp();
                    continue;
                }
                // Otherwise sliding shell kills player (handled below as damage)
            } else if (enemy.shellState === 'walk') {
                if (fallingOnto) {
                    // First stomp → shell
                    player.vy = -STOMP_BOUNCE;
                    enemy.shellState = 'shell';
                    enemy.height = 24;
                    enemy.y += 12;
                    enemy.vx = 0;
                    enemy.shellTimer = KOOPA_SHELL_REVIVE;
                    triggerHitPause(0.05);
                    triggerShake(3, 0.15);
                    spawnSquishParticles(enemy.x + enemy.width / 2, enemy.y, '#00A800');
                    awardStompCombo(enemy);
                    playStomp();
                    continue;
                }
            }
        }

        if (fallingOnto && enemy.type !== 'tank' && enemy.type !== 'piranha') {
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
                awardStompCombo(enemy);
                killEnemy(enemies, i, true);
            }
            continue;
        }

        if (fallingOnto && enemy.type === 'tank') {
            player.vy = -STOMP_BOUNCE * 0.7;
            // Tank head only takes damage from fireballs/shells, not stomps
            // SMB1 style — bounce off harmlessly
            triggerHitPause(0.05);
            playStomp();
            continue;
        }

        // Damage to player
        if (player.invincible <= 0 && player.starTimer <= 0) {
            triggerShake(6, 0.2);
            playPlayerHit();
            flashAlpha = 0.4;
            airStompChain = 0;
            const willDie = demoteOnHit(player);
            if (!willDie) player.vy = -200;
        }
    }

    // Enemy ↔ enemy via shell
    for (let i = enemies.length - 1; i >= 0; i--) {
        const a = enemies[i];
        if (a.type !== 'koopa' || a.shellState !== 'sliding') continue;
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (i === j) continue;
            const b = enemies[j];
            if (b.type === 'piranha' && b.phase !== 'visible') continue;
            if (collides(a, b)) {
                if (b.type === 'tank') {
                    b.health -= 1;
                    b.hitFlash = 0.1;
                }
                spawnSquishParticles(b.x + b.width / 2, b.y + b.height / 2, '#FFE890');
                score += 800;
                spawnScorePopup(b.x + b.width / 2, b.y - 10, '800');
                if (b.health <= 0 || b.type !== 'tank') killEnemy(enemies, j);
                break;
            }
        }
    }

    // Pickups
    const pickups = getPickups();
    for (let i = pickups.length - 1; i >= 0; i--) {
        if (collides(player, pickups[i])) {
            const pu = pickups[i];
            if (pu.type === 'mushroom' || pu.type === 'health') {
                playPowerUp();
                promotePower(player, 'mushroom');
                score += 1000;
                spawnScorePopup(pu.x + 8, pu.y - 10, '1000');
            } else if (pu.type === 'oneup') {
                playOneUp();
                storyLives++;
                showAnnouncement('1-UP!');
            } else if (pu.type === 'fireflower' || pu.type === 'rapid') {
                playPowerUp();
                promotePower(player, 'fireflower');
                score += 1000;
                spawnScorePopup(pu.x + 8, pu.y - 10, '1000');
            } else if (pu.type === 'star' || pu.type === 'shield') {
                playPowerUp();
                promotePower(player, 'star');
                showAnnouncement('STAR POWER!');
            } else {
                playPickup();
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

function awardStompCombo(enemy) {
    const base = enemy.scoreValue || 100;
    let points;
    if (airStompChain < STOMP_COMBO_SCORES.length) {
        points = STOMP_COMBO_SCORES[airStompChain];
    } else {
        points = STOMP_COMBO_SCORES[STOMP_COMBO_SCORES.length - 1];
        // 9+ chain → 1-up cascade
        storyLives++;
        playOneUp();
        showAnnouncement('1-UP!');
    }
    // Use the larger of base score or combo tier
    const final = Math.max(base, points);
    score += final;
    spawnScorePopup(enemy.x + enemy.width / 2, enemy.y - 10, String(final));
    airStompChain++;
}

function killEnemy(enemiesArr, j, fromStomp = false) {
    const e = enemiesArr[j];
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const color = ENEMY_COLORS[e.type] || COLOR_ENEMY;
    if (!fromStomp) {
        spawnKillParticles(ex, ey, color);
        // Non-stomp kill awards base score
        score += e.scoreValue || 100;
        spawnScorePopup(ex, ey - 10, String(e.scoreValue || 100));
    }
    playEnemyDeath();
    killCount++;
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
        hazards: hazardTiles, movingPlatforms, crumbleTilesList, bricks,
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

    if (airStompChain > 1) {
        ctx.fillStyle = '#FFAA00';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.9;
        ctx.fillText(`${airStompChain}x STOMP CHAIN`, CANVAS_WIDTH / 2, 50);
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
