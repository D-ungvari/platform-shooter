import {
    CANVAS_WIDTH, CANVAS_HEIGHT, PLATFORMS, TILE,
    COLOR_SKY, COLOR_CLOUD, COLOR_CLOUD_SHADOW,
    COLOR_HILL, COLOR_HILL_DARK, COLOR_BUSH, COLOR_BUSH_DARK,
    COLOR_GRASS, COLOR_GRASS_DARK, COLOR_DIRT, COLOR_DIRT_DARK, COLOR_DIRT_SPECK,
    COLOR_BRICK, COLOR_BRICK_LIGHT, COLOR_BRICK_DARK,
    COLOR_QBLOCK, COLOR_QBLOCK_DARK, COLOR_QBLOCK_LIGHT, COLOR_QBLOCK_USED,
    COLOR_PIPE, COLOR_PIPE_LIGHT, COLOR_PIPE_DARK,
    COLOR_FLAG, COLOR_FLAG_POLE, COLOR_FLAG_BALL, COLOR_FLAG_CLOTH,
    COLOR_CASTLE, COLOR_CASTLE_DARK, COLOR_COIN, COLOR_COIN_LIGHT, COLOR_COIN_DARK,
    COLOR_PLAYER, COLOR_ENEMY, COLOR_BULLET, COLOR_FLYER, COLOR_TANK, COLOR_BACKGROUND,
    GAME_MODE, COIN_VALUE
} from './constants.js';
import { getMouse, getWorldMouse } from './input.js';

let ctx;
let muzzleFlash = 0;
let gameTime = 0;

// === STATIC PARALLAX BACKGROUND (story/arena) ===
// Cloud sprites: each is x, y, scale
const clouds = [];
for (let i = 0; i < 16; i++) {
    clouds.push({
        x: Math.random() * 4000,
        y: 50 + Math.random() * 180,
        scale: 0.7 + Math.random() * 0.7,
        speed: 0.15 + Math.random() * 0.15,
    });
}

// Hill silhouettes — big rolling green hills
const hills = [];
for (let i = 0; i < 30; i++) {
    hills.push({
        x: i * 280 + Math.random() * 80,
        y: 380 + Math.random() * 30,
        w: 200 + Math.random() * 140,
        h: 80 + Math.random() * 60,
        small: Math.random() < 0.3,
    });
}

// Bushes
const bushes = [];
for (let i = 0; i < 40; i++) {
    bushes.push({
        x: i * 220 + Math.random() * 100,
        y: 460 + Math.random() * 20,
        w: 60 + Math.random() * 60,
    });
}

// Legacy adventure-mode bg
const bgStars = [];
for (let i = 0; i < 80; i++) {
    bgStars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT * 0.75,
        size: 0.5 + Math.random() * 2,
        speed: 5 + Math.random() * 15,
        brightness: 0.15 + Math.random() * 0.5,
    });
}

function generateMountains(count, baseY, maxH, color, speed) {
    const layer = [];
    let x = -50;
    for (let i = 0; i < count; i++) {
        const w = 80 + Math.random() * 160;
        const h = 30 + Math.random() * maxH;
        layer.push({ x, w, h, baseY, color, speed });
        x += w * 0.6 + Math.random() * 40;
    }
    return layer;
}
const farMountains = generateMountains(12, CANVAS_HEIGHT * 0.78, 100, null, 0.03);
const nearMountains = generateMountains(10, CANVAS_HEIGHT * 0.82, 80, null, 0.06);
const farTotalWidth = farMountains.length > 0 ? farMountains[farMountains.length - 1].x + farMountains[farMountains.length - 1].w + 50 : CANVAS_WIDTH;
const nearTotalWidth = nearMountains.length > 0 ? nearMountains[nearMountains.length - 1].x + nearMountains[nearMountains.length - 1].w + 50 : CANVAS_WIDTH;

const moonX = CANVAS_WIDTH * 0.8;
const moonY = 70;

export function initRenderer(context) {
    ctx = context;
    ctx.imageSmoothingEnabled = false;
}

export function triggerMuzzleFlash() {
    muzzleFlash = 0.05;
}

export function renderGame(player, enemies, bullets, score, dt, killCount, survivalTime, mode, camera, platforms, blocks, zoneData, extGameTime, storyData) {
    gameTime = extGameTime || (gameTime + (dt || 1 / 60));
    const isAdventure = mode === GAME_MODE.ADVENTURE;
    const isStory = mode === GAME_MODE.STORY;
    const useMarioBg = isStory || mode === GAME_MODE.ARENA;
    const activePlatforms = ((isAdventure || isStory) && platforms) ? platforms : PLATFORMS;
    const activeBlocks = blocks || [];
    const cam = camera || { x: 0, y: 0 };

    if (useMarioBg) {
        drawMarioBackground(cam, isStory);
    } else {
        drawAdventureBackground(cam, zoneData, survivalTime);
    }

    // === CAMERA TRANSFORM ===
    ctx.save();
    if (isAdventure || isStory) {
        ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    }

    if (isStory && storyData) {
        // Story mode: draw decorative tiles + special tiles + flag + castle
        drawStoryWorld(storyData, cam);
    } else {
        // Arena/Adventure: legacy platform draw
        drawLegacyPlatforms(activePlatforms, isAdventure, zoneData);
        for (const block of activeBlocks) {
            if (block.broken) continue;
            drawDestructibleBlock(block);
        }
    }

    // Enemies
    for (const e of enemies) {
        drawEnemy(e);
    }

    // Player
    drawPlayer(player, isAdventure || isStory, cam);

    // Bullets — fireball style in story
    for (const b of bullets) {
        drawFireball(b);
    }

    // Muzzle flash (suppressed in story for cleaner Mario feel)
    if (muzzleFlash > 0 && !isStory) {
        muzzleFlash -= dt || 1 / 60;
        const mouse = (isAdventure || isStory) ? getWorldMouse(cam) : getMouse();
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            const fx = cx + (dx / len) * 24;
            const fy = cy + (dy / len) * 24;
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(fx, fy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = COLOR_BULLET;
            ctx.beginPath();
            ctx.arc(fx, fy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    } else if (muzzleFlash > 0) {
        muzzleFlash -= dt || 1 / 60;
    }

    ctx.restore();
    // === END CAMERA TRANSFORM ===

    // Off-screen enemy indicators
    for (const e of enemies) {
        const ecx = e.x + e.width / 2 - cam.x;
        const ecy = e.y + e.height / 2 - cam.y;
        if (ecx < -5 || ecx > CANVAS_WIDTH + 5 || ecy < -5 || ecy > CANVAS_HEIGHT + 5) {
            const ix = Math.max(14, Math.min(CANVAS_WIDTH - 14, ecx));
            const iy = Math.max(14, Math.min(CANVAS_HEIGHT - 14, ecy));
            const color = ENEMY_COLORS[e.type] || COLOR_ENEMY;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6 + Math.sin(gameTime * 8) * 0.2;
            ctx.beginPath();
            if (ecx < 0) {
                ctx.moveTo(ix + 6, iy);
                ctx.lineTo(ix - 4, iy - 5);
                ctx.lineTo(ix - 4, iy + 5);
            } else if (ecx > CANVAS_WIDTH) {
                ctx.moveTo(ix - 6, iy);
                ctx.lineTo(ix + 4, iy - 5);
                ctx.lineTo(ix + 4, iy + 5);
            } else if (ecy < 0) {
                ctx.moveTo(ix, iy + 6);
                ctx.lineTo(ix - 5, iy - 4);
                ctx.lineTo(ix + 5, iy - 4);
            } else {
                ctx.moveTo(ix, iy - 6);
                ctx.lineTo(ix - 5, iy + 4);
                ctx.lineTo(ix + 5, iy + 4);
            }
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    if (isStory && storyData) {
        drawStoryHUD(storyData, score, killCount);
    } else {
        drawHUD(player, score, killCount, survivalTime, enemies.length, isAdventure);
    }
}

// === MARIO BACKGROUND ===
function drawMarioBackground(cam, isStory) {
    // Sky gradient
    const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grd.addColorStop(0, '#5C94FC');
    grd.addColorStop(0.85, '#A0C4FC');
    grd.addColorStop(1, '#C0E0FC');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Far hills (parallax 0.3)
    const camX = isStory ? cam.x : 0;
    drawHillsParallax(camX, 0.3, COLOR_HILL_DARK, 1.0);
    drawHillsParallax(camX, 0.5, COLOR_HILL, 0.8);

    // Clouds (parallax 0.4)
    drawCloudsParallax(camX, 0.4);
}

function drawHillsParallax(camX, factor, color, sizeMul) {
    const offset = (camX * factor) % 4000;
    ctx.fillStyle = color;
    for (const h of hills) {
        const sx = h.x - offset;
        const wrapX = ((sx % 4000) + 4000) % 4000;
        const drawX = wrapX > CANVAS_WIDTH + h.w ? wrapX - 4000 : wrapX;
        if (drawX + h.w * sizeMul < -50 || drawX > CANVAS_WIDTH + 50) continue;

        const w = h.w * sizeMul;
        const peakH = h.h * sizeMul;
        const baseY = h.y;
        // Round hill (3 humps)
        ctx.beginPath();
        ctx.moveTo(drawX, baseY);
        ctx.quadraticCurveTo(drawX + w * 0.5, baseY - peakH, drawX + w, baseY);
        ctx.closePath();
        ctx.fill();
    }
}

function drawCloudsParallax(camX, factor) {
    for (const c of clouds) {
        const drift = c.speed * gameTime * 8;
        const sx = c.x - camX * factor - drift;
        const wrapX = ((sx % 4000) + 4000) % 4000 - 200;
        const drawX = wrapX;
        if (drawX < -200 || drawX > CANVAS_WIDTH + 200) continue;
        drawCloud(drawX, c.y, c.scale);
    }
}

function drawCloud(x, y, s) {
    ctx.fillStyle = COLOR_CLOUD_SHADOW;
    drawCloudShape(x + 2, y + 4, s);
    ctx.fillStyle = COLOR_CLOUD;
    drawCloudShape(x, y, s);
}

function drawCloudShape(x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 18 * s, y - 8 * s, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 38 * s, y - 4 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 56 * s, y, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 28 * s, y + 6 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
}

// === ADVENTURE LEGACY BG ===
function drawAdventureBackground(cam, zoneData, survivalTime) {
    let bgR, bgG, bgB;
    const isAdventure = zoneData != null;
    if (isAdventure && zoneData && zoneData.zone) {
        const z = zoneData.zone;
        const nz = zoneData.nextZone;
        const b = zoneData.blend || 0;
        bgR = nz ? Math.round(z.bg[0] + (nz.bg[0] - z.bg[0]) * b) : z.bg[0];
        bgG = nz ? Math.round(z.bg[1] + (nz.bg[1] - z.bg[1]) * b) : z.bg[1];
        bgB = nz ? Math.round(z.bg[2] + (nz.bg[2] - z.bg[2]) * b) : z.bg[2];
    } else {
        const timeRatio = survivalTime !== undefined ? Math.min(survivalTime / 180, 1) : 0;
        bgR = 10 + Math.floor(timeRatio * 20);
        bgG = 10 - Math.floor(timeRatio * 6);
        bgB = 30 - Math.floor(timeRatio * 12);
    }
    ctx.fillStyle = `rgb(${bgR}, ${Math.max(0, bgG)}, ${Math.max(4, bgB)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const moonDrawX = isAdventure ? moonX - cam.x * 0.05 : moonX;
    const moonDrawY = isAdventure ? moonY - cam.y * 0.05 : moonY;
    ctx.fillStyle = '#DDDDBB';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(moonDrawX, moonDrawY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${bgR}, ${Math.max(0, bgG)}, ${Math.max(4, bgB)})`;
    ctx.beginPath();
    ctx.arc(moonDrawX + 10, moonDrawY - 5, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    for (const star of bgStars) {
        const twinkle = 0.5 + Math.sin(gameTime * star.speed + star.x) * 0.5;
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = '#ffffff';
        const sx = isAdventure ? ((star.x - cam.x * 0.02) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH : star.x;
        const sy = isAdventure ? star.y - cam.y * 0.02 : star.y;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    let farColor, nearColor;
    if (isAdventure && zoneData && zoneData.zone) {
        const z = zoneData.zone;
        const nz = zoneData.nextZone;
        const b = zoneData.blend || 0;
        const mt = z.mt;
        const mtn = nz ? nz.mt : mt;
        farColor = `rgb(${Math.round(mt[0] + (mtn[0] - mt[0]) * b)}, ${Math.round(mt[1] + (mtn[1] - mt[1]) * b)}, ${Math.round(mt[2] + (mtn[2] - mt[2]) * b)})`;
        nearColor = `rgb(${Math.round(mt[0] + 10 + (mtn[0] + 10 - mt[0] - 10) * b)}, ${Math.round(mt[1] + 8 + (mtn[1] + 8 - mt[1] - 8) * b)}, ${Math.round(mt[2] + 5 + (mtn[2] + 5 - mt[2] - 5) * b)})`;
    } else {
        const timeRatio = survivalTime !== undefined ? Math.min(survivalTime / 180, 1) : 0;
        farColor = `rgb(${20 + Math.floor(timeRatio * 15)}, ${18 - Math.floor(timeRatio * 5)}, ${35 - Math.floor(timeRatio * 10)})`;
        nearColor = `rgb(${30 + Math.floor(timeRatio * 15)}, ${26 - Math.floor(timeRatio * 8)}, ${40 - Math.floor(timeRatio * 12)})`;
    }

    if (isAdventure) {
        drawMountainLayerTiled(farMountains, farColor, gameTime, cam.x * 0.1, farTotalWidth);
        drawMountainLayerTiled(nearMountains, nearColor, gameTime, cam.x * 0.2, nearTotalWidth);
    } else {
        drawMountainLayer(farMountains, farColor, gameTime);
        drawMountainLayer(nearMountains, nearColor, gameTime);
    }
}

// === STORY WORLD DRAW ===
function drawStoryWorld(storyData, cam) {
    const { decoTiles, pipeTiles, qBlocks, coins, flag, castle } = storyData;
    const camLeft = cam.x - 32;
    const camRight = cam.x + CANVAS_WIDTH + 32;

    // Castle silhouette in background — drawn first
    if (castle) {
        drawCastle(castle.x, castle.y);
    }

    // Bushes (deco) drawn before ground tiles
    for (const t of decoTiles) {
        if (t.x < camLeft - 64 || t.x > camRight + 64) continue;
        if (t.type === 'bush') drawBushTile(t.x, t.y);
    }

    // Ground tiles (grass + dirt body)
    for (const t of decoTiles) {
        if (t.x < camLeft - 64 || t.x > camRight + 64) continue;
        if (t.type === 'ground') drawGroundTile(t.x, t.y, t.isTop);
        else if (t.type === 'stone') drawStoneTile(t.x, t.y);
        else if (t.type === 'brick') drawBrickTile(t.x, t.y);
    }

    // Pipes
    for (const p of pipeTiles) {
        if (p.x + p.width < camLeft || p.x > camRight) continue;
        drawPipe(p.x, p.y, p.width, p.height);
    }

    // ?-blocks
    for (const b of qBlocks) {
        if (b.x + b.width < camLeft || b.x > camRight) continue;
        drawQBlock(b);
    }

    // Coins
    for (const c of coins) {
        if (c.picked) continue;
        if (c.x < camLeft || c.x > camRight) continue;
        drawCoin(c.x, c.y);
    }

    // Flag pole
    if (flag) {
        drawFlagpole(flag);
    }
}

function drawGroundTile(x, y, isTop) {
    if (isTop) {
        // Grass top strip
        ctx.fillStyle = COLOR_GRASS;
        ctx.fillRect(x, y, TILE, 8);
        ctx.fillStyle = COLOR_GRASS_DARK;
        ctx.fillRect(x, y + 6, TILE, 2);
        // Dirt body
        ctx.fillStyle = COLOR_DIRT;
        ctx.fillRect(x, y + 8, TILE, TILE - 8);
        // Speckles
        ctx.fillStyle = COLOR_DIRT_DARK;
        ctx.fillRect(x + 4, y + 14, 3, 3);
        ctx.fillRect(x + 18, y + 22, 3, 3);
        ctx.fillRect(x + 26, y + 12, 2, 2);
        ctx.fillStyle = COLOR_DIRT_SPECK;
        ctx.fillRect(x + 10, y + 24, 2, 2);
    } else {
        // Pure dirt
        ctx.fillStyle = COLOR_DIRT;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLOR_DIRT_DARK;
        ctx.fillRect(x + 4, y + 4, 3, 3);
        ctx.fillRect(x + 16, y + 18, 3, 3);
        ctx.fillRect(x + 24, y + 8, 2, 2);
        ctx.fillStyle = COLOR_DIRT_SPECK;
        ctx.fillRect(x + 12, y + 26, 2, 2);
    }
    // Tile outline
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
    ctx.fillRect(x + TILE - 1, y, 1, TILE);
}

function drawStoneTile(x, y) {
    ctx.fillStyle = '#A8A8A8';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#D8D8D8';
    ctx.fillRect(x, y, TILE, 4);
    ctx.fillRect(x, y, 4, TILE);
    ctx.fillStyle = '#606060';
    ctx.fillRect(x, y + TILE - 4, TILE, 4);
    ctx.fillRect(x + TILE - 4, y, 4, TILE);
    // Notch
    ctx.fillStyle = '#888888';
    ctx.fillRect(x + 8, y + 14, 16, 4);
}

function drawBrickTile(x, y) {
    ctx.fillStyle = COLOR_BRICK;
    ctx.fillRect(x, y, TILE, TILE);
    // Highlights
    ctx.fillStyle = COLOR_BRICK_LIGHT;
    ctx.fillRect(x, y, TILE, 2);
    ctx.fillRect(x, y + 16, TILE, 2);
    ctx.fillRect(x, y, 2, TILE);
    // Mortar lines
    ctx.fillStyle = COLOR_BRICK_DARK;
    ctx.fillRect(x, y + 14, TILE, 2);
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
    ctx.fillRect(x + 15, y, 2, 14);
    ctx.fillRect(x + 7, y + 16, 2, 14);
    ctx.fillRect(x + 23, y + 16, 2, 14);
}

function drawBushTile(x, y) {
    // Sit on top of ground (y is row 15, ground top at row 16)
    const by = y + TILE - 4;
    ctx.fillStyle = COLOR_BUSH_DARK;
    ctx.beginPath();
    ctx.arc(x + 8, by, 12, Math.PI, 0);
    ctx.arc(x + 18, by - 4, 14, Math.PI, 0);
    ctx.arc(x + 26, by, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLOR_BUSH;
    ctx.beginPath();
    ctx.arc(x + 8, by - 1, 10, Math.PI, 0);
    ctx.arc(x + 18, by - 5, 12, Math.PI, 0);
    ctx.arc(x + 26, by - 1, 10, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // Highlights
    ctx.fillStyle = '#80F800';
    ctx.fillRect(x + 16, by - 14, 4, 2);
    ctx.fillRect(x + 6, by - 8, 3, 2);
}

function drawPipe(x, y, w, h) {
    // Body
    ctx.fillStyle = COLOR_PIPE;
    ctx.fillRect(x + 4, y + 16, w - 8, h - 16);
    // Body highlights
    ctx.fillStyle = COLOR_PIPE_LIGHT;
    ctx.fillRect(x + 4, y + 16, 4, h - 16);
    ctx.fillStyle = COLOR_PIPE_DARK;
    ctx.fillRect(x + w - 12, y + 16, 8, h - 16);
    // Top rim
    ctx.fillStyle = COLOR_PIPE;
    ctx.fillRect(x, y, w, 16);
    ctx.fillStyle = COLOR_PIPE_LIGHT;
    ctx.fillRect(x, y, w, 4);
    ctx.fillRect(x, y, 4, 16);
    ctx.fillStyle = COLOR_PIPE_DARK;
    ctx.fillRect(x, y + 12, w, 4);
    ctx.fillRect(x + w - 6, y, 6, 16);
    // Mouth shadow
    ctx.fillStyle = '#003800';
    ctx.fillRect(x + 6, y + 4, w - 12, 6);
}

function drawQBlock(b) {
    const x = b.x;
    const bumpOffset = b.bumpT > 0 ? -Math.sin(b.bumpT * Math.PI / 0.25) * 8 : 0;
    const y = b.y + bumpOffset;
    if (b.used) {
        // Used (brown stone block)
        ctx.fillStyle = COLOR_QBLOCK_USED;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#7C3000';
        ctx.fillRect(x, y, TILE, 3);
        ctx.fillRect(x, y, 3, TILE);
        ctx.fillStyle = '#5C1800';
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
        ctx.fillRect(x + TILE - 3, y, 3, TILE);
        // Rivets
        ctx.fillStyle = '#3C0800';
        ctx.fillRect(x + 4, y + 4, 3, 3);
        ctx.fillRect(x + TILE - 7, y + 4, 3, 3);
        ctx.fillRect(x + 4, y + TILE - 7, 3, 3);
        ctx.fillRect(x + TILE - 7, y + TILE - 7, 3, 3);
    } else {
        // Active ?-block w/ flicker
        const flicker = 0.5 + 0.5 * Math.sin(gameTime * 3);
        ctx.fillStyle = COLOR_QBLOCK;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLOR_QBLOCK_LIGHT;
        ctx.fillRect(x, y, TILE, 3);
        ctx.fillRect(x, y, 3, TILE);
        ctx.fillStyle = COLOR_QBLOCK_DARK;
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
        ctx.fillRect(x + TILE - 3, y, 3, TILE);
        // Rivets
        ctx.fillStyle = COLOR_QBLOCK_DARK;
        ctx.fillRect(x + 4, y + 4, 3, 3);
        ctx.fillRect(x + TILE - 7, y + 4, 3, 3);
        ctx.fillRect(x + 4, y + TILE - 7, 3, 3);
        ctx.fillRect(x + TILE - 7, y + TILE - 7, 3, 3);
        // ? glyph
        ctx.fillStyle = `rgba(255,255,255,${0.6 + flicker * 0.4})`;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', x + TILE / 2, y + TILE - 8);
        ctx.textAlign = 'left';
    }
}

function drawCoin(x, y) {
    const spin = (Math.sin(gameTime * 6) + 1) / 2; // 0..1
    const w = 4 + spin * 12;
    const drawX = x - w / 2;
    const drawY = y - 12;
    // Outer
    ctx.fillStyle = COLOR_COIN_DARK;
    ctx.fillRect(drawX, drawY, w, 24);
    // Mid
    ctx.fillStyle = COLOR_COIN;
    if (w > 4) ctx.fillRect(drawX + 2, drawY + 2, w - 4, 20);
    // Highlight
    ctx.fillStyle = COLOR_COIN_LIGHT;
    if (w > 8) ctx.fillRect(drawX + Math.max(2, w * 0.2), drawY + 4, Math.max(2, w * 0.2), 16);
}

function drawFlagpole(flag) {
    const px = flag.x;
    const top = flag.top;
    const base = flag.base;
    // Pole
    ctx.fillStyle = COLOR_FLAG_POLE;
    ctx.fillRect(px + 1, top + 6, 4, base - top - 6);
    // Highlight
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(px + 1, top + 6, 1, base - top - 6);
    // Ball top
    ctx.fillStyle = COLOR_FLAG_BALL;
    ctx.beginPath();
    ctx.arc(px + 3, top + 6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE890';
    ctx.beginPath();
    ctx.arc(px + 1, top + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Flag cloth — animated wave
    const wave = Math.sin(gameTime * 2) * 4;
    ctx.fillStyle = COLOR_FLAG_CLOTH;
    ctx.beginPath();
    ctx.moveTo(px + 4, top + 14);
    ctx.lineTo(px + 28 + wave, top + 22);
    ctx.lineTo(px + 4, top + 30);
    ctx.closePath();
    ctx.fill();
    // Star symbol
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(px + 12, top + 20, 4, 4);
}

function drawCastle(x, y) {
    // Base
    ctx.fillStyle = COLOR_CASTLE;
    ctx.fillRect(x - 80, y, 160, 96);
    // Crenellations
    ctx.fillStyle = COLOR_CASTLE_DARK;
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x - 80 + i * 32, y - 12, 16, 12);
    }
    ctx.fillRect(x - 80, y, 160, 4);
    // Tower
    ctx.fillStyle = COLOR_CASTLE;
    ctx.fillRect(x - 16, y - 48, 32, 48);
    ctx.fillStyle = COLOR_CASTLE_DARK;
    ctx.fillRect(x - 16, y - 60, 8, 12);
    ctx.fillRect(x + 8, y - 60, 8, 12);
    ctx.fillRect(x - 16, y - 48, 32, 4);
    // Door
    ctx.fillStyle = '#1C0800';
    ctx.beginPath();
    ctx.arc(x, y + 80, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 14, y + 80, 28, 16);
    // Window
    ctx.fillStyle = '#1C0800';
    ctx.fillRect(x - 4, y - 40, 8, 12);
    // Brick lines
    ctx.fillStyle = COLOR_CASTLE_DARK;
    for (let r = 0; r < 6; r++) {
        ctx.fillRect(x - 80, y + 16 + r * 14, 160, 1);
    }
}

// === LEGACY PLATFORM DRAW (arena/adventure) ===
function drawLegacyPlatforms(activePlatforms, isAdventure, zoneData) {
    for (let i = 0; i < activePlatforms.length; i++) {
        const p = activePlatforms[i];
        const isGround = p.type === 'ground' || (p.width >= 500 && !p.type);
        if (isGround) {
            // Mario-style ground for arena too
            ctx.fillStyle = COLOR_GRASS;
            ctx.fillRect(p.x, p.y, p.width, 6);
            ctx.fillStyle = COLOR_GRASS_DARK;
            ctx.fillRect(p.x, p.y + 6, p.width, 2);
            ctx.fillStyle = COLOR_DIRT;
            ctx.fillRect(p.x, p.y + 8, p.width, p.height - 8);
            ctx.fillStyle = COLOR_DIRT_DARK;
            for (let sx = p.x + 8; sx < p.x + p.width; sx += 32) {
                ctx.fillRect(sx, p.y + 14, 3, 3);
                ctx.fillRect(sx + 12, p.y + 22, 2, 2);
            }
        } else if (p.type === 'crumbling') {
            if (p.crumbleState === 'broken') {
                if (p.respawnTimer < 1) {
                    ctx.globalAlpha = 0.15;
                    ctx.fillStyle = '#665555';
                    roundRect(p.x, p.y, p.width, p.height, 4);
                    ctx.globalAlpha = 1.0;
                }
            } else {
                const sx = p.crumbleState === 'shaking' ? (Math.random() - 0.5) * 3 : 0;
                const sy = p.crumbleState === 'shaking' ? (Math.random() - 0.5) * 2 : 0;
                const alpha = p.crumbleState === 'shaking' ? 0.5 + p.crumbleTimer * 0.5 : 1.0;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#776655';
                roundRect(p.x + sx, p.y + sy, p.width, p.height, 4);
                ctx.strokeStyle = '#554433';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x + sx + p.width * 0.3, p.y + sy);
                ctx.lineTo(p.x + sx + p.width * 0.5, p.y + sy + p.height);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p.x + sx + p.width * 0.7, p.y + sy + 2);
                ctx.lineTo(p.x + sx + p.width * 0.6, p.y + sy + p.height - 2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        } else if (p.type === 'bounce') {
            ctx.fillStyle = '#44CC44';
            roundRect(p.x, p.y, p.width, p.height, 4);
            ctx.fillStyle = '#66FF66';
            ctx.fillRect(p.x + 4, p.y, p.width - 8, 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('^', p.x + p.width / 2, p.y + p.height - 3);
            ctx.textAlign = 'left';
        } else if (p.type === 'moving') {
            ctx.fillStyle = '#6666AA';
            roundRect(p.x, p.y, p.width, p.height, 4);
            ctx.fillStyle = '#8888CC';
            ctx.fillRect(p.x + 4, p.y, p.width - 8, 2);
            ctx.fillStyle = '#AAAADD';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            const arrow = p.moveAxis === 'h' ? '<>' : 'v^';
            ctx.fillText(arrow, p.x + p.width / 2, p.y + p.height - 3);
            ctx.textAlign = 'left';
        } else {
            // Brick-style floating platform
            ctx.fillStyle = COLOR_BRICK;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = COLOR_BRICK_LIGHT;
            ctx.fillRect(p.x, p.y, p.width, 2);
            ctx.fillStyle = COLOR_BRICK_DARK;
            ctx.fillRect(p.x, p.y + p.height - 2, p.width, 2);
        }
    }
}

function drawDestructibleBlock(block) {
    const pulse = 0.7 + Math.sin(gameTime * 4) * 0.3;
    ctx.globalAlpha = 0.2 * pulse;
    ctx.fillStyle = '#FFDD44';
    roundRect(block.x - 3, block.y - 3, block.width + 6, block.height + 6, 6);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#DDAA22';
    roundRect(block.x, block.y, block.width, block.height, 4);
    ctx.fillStyle = '#FFDD44';
    roundRect(block.x + 2, block.y + 2, block.width - 4, block.height - 4, 3);
    ctx.fillStyle = '#884400';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('?', block.x + block.width / 2, block.y + block.height - 5);
    ctx.textAlign = 'left';
}

function drawFireball(b) {
    // Outer glow
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FF6020';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    // Body
    ctx.fillStyle = '#FFA000';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE800';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

// --- Helpers ---
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();
}

function drawMountainLayer(layer, color, t) {
    ctx.fillStyle = color;
    for (const m of layer) {
        const sway = Math.sin(t * m.speed + m.x * 0.01) * 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.baseY);
        ctx.lineTo(m.x + m.w * 0.3, m.baseY - m.h + sway);
        ctx.lineTo(m.x + m.w * 0.5, m.baseY - m.h * 0.85 + sway);
        ctx.lineTo(m.x + m.w * 0.7, m.baseY - m.h * 0.95 + sway);
        ctx.lineTo(m.x + m.w, m.baseY);
        ctx.fill();
    }
}

function drawMountainLayerTiled(layer, color, t, parallaxOffset, totalWidth) {
    ctx.fillStyle = color;
    const offset = -(parallaxOffset % totalWidth);
    for (let copy = -1; copy <= Math.ceil(CANVAS_WIDTH / totalWidth) + 1; copy++) {
        const baseX = offset + copy * totalWidth;
        for (const m of layer) {
            const drawX = baseX + m.x;
            if (drawX + m.w < -50 || drawX > CANVAS_WIDTH + 50) continue;
            const sway = Math.sin(t * m.speed + m.x * 0.01) * 2;
            ctx.beginPath();
            ctx.moveTo(drawX, m.baseY);
            ctx.lineTo(drawX + m.w * 0.3, m.baseY - m.h + sway);
            ctx.lineTo(drawX + m.w * 0.5, m.baseY - m.h * 0.85 + sway);
            ctx.lineTo(drawX + m.w * 0.7, m.baseY - m.h * 0.95 + sway);
            ctx.lineTo(drawX + m.w, m.baseY);
            ctx.fill();
        }
    }
}

// === ENEMY DRAWS ===
const ENEMY_COLORS = {
    runner: '#9C4810',
    flyer: COLOR_FLYER,
    tank: COLOR_TANK,
};

function drawEnemy(e) {
    if (e.squished && e.squished > 0) {
        drawSquishedGoomba(e);
        e.squished -= 0.016;
        return;
    }
    ctx.save();
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height / 2;

    // Hit flash
    if (e.hitFlash > 0) {
        ctx.globalCompositeOperation = 'source-over';
    }

    if (e.type === 'runner') {
        drawGoomba(e, cx, cy);
    } else if (e.type === 'flyer') {
        drawParatroopa(e, cx, cy);
    } else if (e.type === 'tank') {
        drawBowserMini(e, cx, cy);
    }

    // Hit flash overlay
    if (e.hitFlash > 0) {
        ctx.globalAlpha = e.hitFlash * 8;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(e.x, e.y, e.width, e.height);
        ctx.globalAlpha = 1.0;
    }

    if (e.maxHealth > 1 && e.health > 0) {
        const barW = e.width + 4;
        const barH = 3;
        const barX = e.x - 2;
        const barY = e.y - 8;
        const ratio = e.health / e.maxHealth;
        ctx.fillStyle = '#222';
        roundRect(barX, barY, barW, barH, 1);
        ctx.fillStyle = ratio > 0.5 ? '#88FF44' : '#FF6633';
        ctx.fillRect(barX + 1, barY, (barW - 2) * ratio, barH);
    }

    ctx.restore();
}

function drawSquishedGoomba(e) {
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height;
    ctx.fillStyle = '#9C4810';
    ctx.fillRect(cx - 14, cy - 6, 28, 5);
    ctx.fillStyle = '#5C2818';
    ctx.fillRect(cx - 14, cy - 1, 28, 1);
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 7, cy - 4, 4, 2);
    ctx.fillRect(cx + 3, cy - 4, 4, 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 6, cy - 4, 2, 2);
    ctx.fillRect(cx + 4, cy - 4, 2, 2);
}

function drawGoomba(e, cx, cy) {
    const facing = e.vx >= 0 ? 1 : -1;
    const walkPhase = Math.floor(gameTime * 8) % 2;
    const w = e.width;
    const h = e.height;
    const top = e.y;

    // Feet (alternating)
    ctx.fillStyle = '#5C2818';
    if (walkPhase === 0) {
        ctx.fillRect(cx - 11, top + h - 4, 8, 4);
        ctx.fillRect(cx + 3, top + h - 4, 8, 4);
    } else {
        ctx.fillRect(cx - 13, top + h - 4, 8, 4);
        ctx.fillRect(cx + 5, top + h - 4, 8, 4);
    }

    // Body (mushroom cap)
    ctx.fillStyle = '#9C4810';
    ctx.beginPath();
    ctx.arc(cx, top + 14, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // Cap underside (face area)
    ctx.fillStyle = '#C87030';
    ctx.fillRect(cx - 12, top + 14, 24, 8);
    // Cap shadow
    ctx.fillStyle = '#5C2818';
    ctx.fillRect(cx - 14, top + 12, 28, 2);

    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 8, top + 6, 6, 7);
    ctx.fillRect(cx + 2, top + 6, 6, 7);
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 6 + facing, top + 8, 3, 5);
    ctx.fillRect(cx + 4 + facing, top + 8, 3, 5);
    // Angry brows
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 10, top + 4, 8, 2);
    ctx.fillRect(cx + 2, top + 4, 8, 2);
    // Fang mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 6, top + 18, 12, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 5, top + 18, 2, 2);
    ctx.fillRect(cx + 3, top + 18, 2, 2);
}

function drawParatroopa(e, cx, cy) {
    const flap = Math.floor(gameTime * 16) % 2;
    const top = e.y;
    const facing = e.vx >= 0 ? 1 : -1;

    // Wings (behind body)
    ctx.fillStyle = '#FFFFFF';
    if (flap === 0) {
        // Wings up
        ctx.beginPath();
        ctx.moveTo(cx - 14, top + 8);
        ctx.lineTo(cx - 22, top - 4);
        ctx.lineTo(cx - 4, top + 6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 14, top + 8);
        ctx.lineTo(cx + 22, top - 4);
        ctx.lineTo(cx + 4, top + 6);
        ctx.fill();
    } else {
        // Wings down
        ctx.beginPath();
        ctx.moveTo(cx - 14, top + 8);
        ctx.lineTo(cx - 20, top + 14);
        ctx.lineTo(cx - 4, top + 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 14, top + 8);
        ctx.lineTo(cx + 20, top + 14);
        ctx.lineTo(cx + 4, top + 10);
        ctx.fill();
    }
    // Wing outlines
    ctx.strokeStyle = '#A8A8A8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 14, top + 8);
    if (flap === 0) ctx.lineTo(cx - 22, top - 4);
    else ctx.lineTo(cx - 20, top + 14);
    ctx.stroke();

    // Shell (red)
    ctx.fillStyle = '#E0281C';
    ctx.beginPath();
    ctx.arc(cx, top + 12, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - 12, top + 12, 24, 8);
    // Shell highlights
    ctx.fillStyle = '#FF6850';
    ctx.fillRect(cx - 10, top + 4, 4, 8);
    // Shell rim
    ctx.fillStyle = '#FFE890';
    ctx.fillRect(cx - 12, top + 18, 24, 2);

    // Head (yellow)
    ctx.fillStyle = '#F8D830';
    ctx.fillRect(cx - 6, top + 16, 12, 8);
    ctx.fillStyle = '#A88800';
    ctx.fillRect(cx - 6, top + 22, 12, 2);
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 4, top + 18, 3, 3);
    ctx.fillRect(cx + 1, top + 18, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 3 + facing, top + 19, 2, 2);
    ctx.fillRect(cx + 2 + facing, top + 19, 2, 2);

    // Feet
    ctx.fillStyle = '#F8D830';
    ctx.fillRect(cx - 8, top + 24, 6, 4);
    ctx.fillRect(cx + 2, top + 24, 6, 4);
}

function drawBowserMini(e, cx, cy) {
    const top = e.y;
    const facing = e.vx >= 0 ? 1 : -1;
    const bob = Math.sin(gameTime * 4) * 1;
    const w = e.width;
    const h = e.height;

    // Feet
    ctx.fillStyle = '#005800';
    ctx.fillRect(cx - 16, top + h - 6, 12, 6);
    ctx.fillRect(cx + 4, top + h - 6, 12, 6);
    // Claws
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 16, top + h - 2, 3, 2);
    ctx.fillRect(cx - 11, top + h - 2, 3, 2);
    ctx.fillRect(cx + 4, top + h - 2, 3, 2);
    ctx.fillRect(cx + 9, top + h - 2, 3, 2);

    // Body (yellow underbelly)
    ctx.fillStyle = '#F8D830';
    ctx.fillRect(cx - 12, top + 12 + bob, 24, 22);
    ctx.fillStyle = '#A88800';
    for (let r = 0; r < 4; r++) {
        ctx.fillRect(cx - 12, top + 14 + r * 6 + bob, 24, 1);
    }

    // Shell on back (green w/ spikes)
    ctx.fillStyle = COLOR_PIPE;
    ctx.beginPath();
    ctx.arc(cx, top + 14 + bob, 16, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#005800';
    ctx.fillRect(cx - 16, top + 14 + bob, 32, 2);
    // Shell spikes
    ctx.fillStyle = '#FFFFFF';
    for (let i = -1; i <= 1; i++) {
        const sx = cx + i * 10;
        ctx.beginPath();
        ctx.moveTo(sx - 3, top + 4 + bob);
        ctx.lineTo(sx, top - 2 + bob);
        ctx.lineTo(sx + 3, top + 4 + bob);
        ctx.closePath();
        ctx.fill();
    }

    // Head
    ctx.fillStyle = '#F8D830';
    ctx.fillRect(cx - 10 + facing * 4, top + 6 + bob, 16, 12);
    ctx.fillStyle = '#A88800';
    ctx.fillRect(cx - 10 + facing * 4, top + 16 + bob, 16, 2);
    // Horns
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx - 8 + facing * 4, top + 4 + bob);
    ctx.lineTo(cx - 6 + facing * 4, top - 2 + bob);
    ctx.lineTo(cx - 4 + facing * 4, top + 4 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 2 + facing * 4, top + 4 + bob);
    ctx.lineTo(cx + 4 + facing * 4, top - 2 + bob);
    ctx.lineTo(cx + 6 + facing * 4, top + 4 + bob);
    ctx.closePath();
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 6 + facing * 4, top + 9 + bob, 4, 4);
    ctx.fillRect(cx + 1 + facing * 4, top + 9 + bob, 4, 4);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(cx - 5 + facing * 4 + facing, top + 10 + bob, 2, 3);
    ctx.fillRect(cx + 2 + facing * 4 + facing, top + 10 + bob, 2, 3);
    // Mouth + fangs
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 6 + facing * 4, top + 16 + bob, 12, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 4 + facing * 4, top + 16 + bob, 2, 3);
    ctx.fillRect(cx + 3 + facing * 4, top + 16 + bob, 2, 3);
}

// === PLAYER (Mario) ===
function drawPlayer(player, isWorldSpace, cam) {
    ctx.save();

    if (player.invincible > 0) {
        const blink = Math.floor(player.invincible * 10) % 2 === 0;
        ctx.globalAlpha = blink ? 0.3 : 1.0;
    }

    const facing = player.facingRight ? 1 : -1;
    const isMoving = Math.abs(player.vx) > 10;
    const isAirborne = !player.grounded;
    const runFrame = player.runFrame || 0;

    // Squash/stretch
    const sx = player.squashX || 1;
    const sy = player.squashY || 1;
    const baseX = Math.round(player.x);
    const baseY = Math.round(player.y);
    const w = player.width * sx;
    const h = player.height * sy;
    const ox = baseX + (player.width - w) / 2;
    const oy = baseY + (player.height - h);

    // Aim angle for gun
    const mouse = isWorldSpace ? getWorldMouse(cam) : getMouse();
    const cxw = baseX + player.width / 2;
    const cyw = baseY + player.height / 2;
    const dx = mouse.x - cxw;
    const dy = mouse.y - cyw;
    const aimAngle = Math.atan2(dy, dx);

    drawMario(ox, oy, w, h, facing, isAirborne, isMoving, runFrame, aimAngle, cxw, cyw);

    ctx.globalAlpha = 1.0;

    // Power-up effects
    if (player.activePowerUps) {
        if (player.activePowerUps.speed > 0 && Math.abs(player.vx) > 10) {
            const dir = player.facingRight ? -1 : 1;
            for (let t = 1; t <= 3; t++) {
                ctx.globalAlpha = 0.18 / t;
                ctx.fillStyle = '#FFFF44';
                ctx.fillRect(cxw + dir * t * 10 - 4, cyw - 10, 8, 20);
            }
            ctx.globalAlpha = 1.0;
        }
        if (player.shieldHits > 0) {
            // Star sparkle ring
            const r = Math.max(player.width, player.height) * 0.7;
            for (let i = 0; i < 6; i++) {
                const a = gameTime * 4 + i * Math.PI / 3;
                const sxx = cxw + Math.cos(a) * r;
                const syy = cyw + Math.sin(a) * r;
                ctx.fillStyle = (Math.floor(gameTime * 8 + i) % 2 === 0) ? '#FFE830' : '#FFFFFF';
                drawStar(sxx, syy, 5, 6);
            }
        }
        if (player.activePowerUps.giant > 0) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#FF8844';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.globalAlpha = 1.0;
        }
    }

    ctx.restore();
}

function drawStar(x, y, r, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r / 2;
        const px = x + Math.cos(ang) * rr;
        const py = y + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
}

// Mario sprite (chunky pixel-art)
function drawMario(x, y, w, h, facing, airborne, moving, runFrame, aimAngle, cxw, cyw) {
    // Scale 1px = w/14 roughly. Use fractions of w/h for layout.
    const cx = x + w / 2;
    const top = y;
    const skin = '#F8B070';
    const skinDark = '#C84C0C';
    const red = '#E8281C';
    const redDark = '#A0140C';
    const blue = '#0058F8';
    const blueDark = '#003078';
    const brown = '#7C2810';
    const yellow = '#F8B800';
    const white = '#FFFFFF';
    const black = '#000000';

    // Cap (red)
    const capH = h * 0.20;
    ctx.fillStyle = red;
    ctx.fillRect(cx - w * 0.42, top + h * 0.04, w * 0.84, capH);
    // Cap brim
    if (facing === 1) {
        ctx.fillRect(cx - w * 0.10, top + h * 0.20, w * 0.50, h * 0.08);
    } else {
        ctx.fillRect(cx - w * 0.40, top + h * 0.20, w * 0.50, h * 0.08);
    }
    // Cap shadow
    ctx.fillStyle = redDark;
    ctx.fillRect(cx - w * 0.42, top + h * 0.04, w * 0.84, h * 0.04);
    // Cap "M" emblem
    ctx.fillStyle = white;
    ctx.fillRect(cx - w * 0.10, top + h * 0.10, w * 0.20, h * 0.06);
    ctx.fillStyle = red;
    ctx.fillRect(cx - w * 0.06, top + h * 0.12, w * 0.04, h * 0.04);
    ctx.fillRect(cx + w * 0.02, top + h * 0.12, w * 0.04, h * 0.04);

    // Hair sideburns (brown)
    ctx.fillStyle = brown;
    ctx.fillRect(cx - w * 0.42, top + h * 0.22, w * 0.10, h * 0.10);
    ctx.fillRect(cx + w * 0.32, top + h * 0.22, w * 0.10, h * 0.10);

    // Face (skin)
    ctx.fillStyle = skin;
    ctx.fillRect(cx - w * 0.32, top + h * 0.22, w * 0.64, h * 0.16);
    // Ear
    ctx.fillRect(cx - w * 0.42 + (facing === 1 ? 0 : w * 0.74), top + h * 0.28, w * 0.10, h * 0.08);

    // Eye
    ctx.fillStyle = white;
    const eyeX = cx + (facing === 1 ? w * 0.06 : -w * 0.14);
    ctx.fillRect(eyeX, top + h * 0.24, w * 0.08, h * 0.08);
    ctx.fillStyle = blue;
    ctx.fillRect(eyeX + w * 0.02, top + h * 0.26, w * 0.04, h * 0.06);
    ctx.fillStyle = black;
    ctx.fillRect(eyeX + w * 0.02 + (facing === 1 ? w * 0.02 : 0), top + h * 0.26, w * 0.02, h * 0.06);

    // Mustache
    ctx.fillStyle = brown;
    ctx.fillRect(cx - w * 0.22, top + h * 0.32, w * 0.44, h * 0.06);
    // Nose
    ctx.fillStyle = skinDark;
    ctx.fillRect(cx + (facing === 1 ? w * 0.10 : -w * 0.20), top + h * 0.28, w * 0.10, h * 0.06);

    // Body — overalls (blue) over red shirt
    // Red shirt sleeves
    ctx.fillStyle = red;
    ctx.fillRect(cx - w * 0.42, top + h * 0.40, w * 0.20, h * 0.20);
    ctx.fillRect(cx + w * 0.22, top + h * 0.40, w * 0.20, h * 0.20);
    ctx.fillStyle = redDark;
    ctx.fillRect(cx - w * 0.42, top + h * 0.55, w * 0.20, h * 0.05);
    ctx.fillRect(cx + w * 0.22, top + h * 0.55, w * 0.20, h * 0.05);

    // Overalls torso (blue)
    ctx.fillStyle = blue;
    ctx.fillRect(cx - w * 0.30, top + h * 0.40, w * 0.60, h * 0.40);
    // Overalls highlight
    ctx.fillStyle = '#3080F8';
    ctx.fillRect(cx - w * 0.30, top + h * 0.40, w * 0.60, h * 0.04);
    // Overalls darker side
    ctx.fillStyle = blueDark;
    ctx.fillRect(cx - w * 0.30, top + h * 0.76, w * 0.60, h * 0.04);

    // Yellow buttons
    ctx.fillStyle = yellow;
    ctx.fillRect(cx - w * 0.18, top + h * 0.50, w * 0.08, h * 0.06);
    ctx.fillRect(cx + w * 0.10, top + h * 0.50, w * 0.08, h * 0.06);

    // Hands (white gloves)
    ctx.fillStyle = white;
    ctx.fillRect(cx - w * 0.46, top + h * 0.56, w * 0.14, h * 0.10);
    ctx.fillRect(cx + w * 0.32, top + h * 0.56, w * 0.14, h * 0.10);

    // Legs (blue overalls bottom + boots)
    if (airborne) {
        // Both legs tucked
        ctx.fillStyle = blue;
        ctx.fillRect(cx - w * 0.24, top + h * 0.78, w * 0.20, h * 0.14);
        ctx.fillRect(cx + w * 0.04, top + h * 0.78, w * 0.20, h * 0.14);
        // Boots
        ctx.fillStyle = brown;
        ctx.fillRect(cx - w * 0.30, top + h * 0.90, w * 0.26, h * 0.10);
        ctx.fillRect(cx + w * 0.04, top + h * 0.90, w * 0.26, h * 0.10);
    } else if (moving) {
        // Run cycle (4 frames)
        const offsets = [
            { l: 0, r: 0 },
            { l: 0.05, r: -0.05 },
            { l: 0, r: 0 },
            { l: -0.05, r: 0.05 },
        ];
        const o = offsets[runFrame];
        ctx.fillStyle = blue;
        ctx.fillRect(cx - w * 0.24 + w * o.l, top + h * 0.78, w * 0.20, h * 0.14);
        ctx.fillRect(cx + w * 0.04 + w * o.r, top + h * 0.78, w * 0.20, h * 0.14);
        ctx.fillStyle = brown;
        ctx.fillRect(cx - w * 0.30 + w * o.l, top + h * 0.90, w * 0.26, h * 0.10);
        ctx.fillRect(cx + w * 0.04 + w * o.r, top + h * 0.90, w * 0.26, h * 0.10);
    } else {
        ctx.fillStyle = blue;
        ctx.fillRect(cx - w * 0.24, top + h * 0.78, w * 0.20, h * 0.14);
        ctx.fillRect(cx + w * 0.04, top + h * 0.78, w * 0.20, h * 0.14);
        ctx.fillStyle = brown;
        ctx.fillRect(cx - w * 0.30, top + h * 0.90, w * 0.26, h * 0.10);
        ctx.fillRect(cx + w * 0.04, top + h * 0.90, w * 0.26, h * 0.10);
    }

    // Gun arm (small fire stick)
    ctx.save();
    ctx.translate(cxw, cyw);
    ctx.rotate(aimAngle);
    ctx.fillStyle = white;
    ctx.fillRect(0, -3, 12, 6);
    ctx.fillStyle = red;
    ctx.fillRect(10, -4, 12, 8);
    ctx.fillStyle = yellow;
    ctx.fillRect(20, -2, 6, 4);
    ctx.restore();
}

// === HUD ===
function drawHUD(player, score, killCount, survivalTime, enemyCount, isAdventure) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HP', 10, 8);

    const barW = 200;
    const barH = 16;
    const barX = 10;
    const barY = 12;
    const healthRatio = Math.max(0, player.health / player.maxHealth);

    ctx.fillStyle = '#222';
    roundRect(barX, barY, barW, barH, 3);
    const r = Math.floor(255 * (1 - healthRatio));
    const g = Math.floor(200 * healthRatio);
    ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
    if (healthRatio > 0) {
        ctx.fillRect(barX + 1, barY + 1, (barW - 2) * healthRatio, barH - 2);
    }
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    if (!isAdventure) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('Score: ' + score, CANVAS_WIDTH - 10, 26);
    }

    if (survivalTime !== undefined) {
        const m = Math.floor(survivalTime / 60);
        const s = Math.floor(survivalTime % 60);
        const timeStr = m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '16px monospace';
        ctx.fillText(timeStr, CANVAS_WIDTH / 2, 20);
    }

    if (killCount !== undefined) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FF6666';
        ctx.font = '14px monospace';
        ctx.fillText('Kills: ' + killCount, CANVAS_WIDTH - 10, 44);
    }

    ctx.textAlign = 'left';

    if (player.weapon !== 'normal' && player.weaponTimer > 0) {
        const weaponLabel = player.weapon === 'shotgun' ? 'SHOTGUN' : 'FIRE';
        const weaponColor = player.weapon === 'shotgun' ? '#FF8844' : '#44DDFF';
        ctx.fillStyle = weaponColor;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(weaponLabel + ' ' + Math.ceil(player.weaponTimer) + 's', 10, 46);
    }

    if (enemyCount >= 8) {
        const pulse = 0.4 + Math.sin(gameTime * 6) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#FF3333';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!! ' + enemyCount + ' ENEMIES !!', CANVAS_WIDTH / 2, 40);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'left';
    }
}

// === STORY HUD (Mario-style top bar) ===
function drawStoryHUD(storyData, score, killCount) {
    const { lives, coinCount, timeRemaining, levelName } = storyData;
    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 36);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';

    // MARIO × 3
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('MARIO', 14, 14);
    ctx.fillStyle = '#FFE890';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(String(score).padStart(6, '0'), 14, 30);

    // COINS
    drawHUDCoin(180, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('×' + String(coinCount).padStart(2, '0'), 196, 14);

    // WORLD
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('WORLD', CANVAS_WIDTH / 2, 14);
    ctx.font = 'bold 18px monospace';
    ctx.fillText(levelName.replace('World ', ''), CANVAS_WIDTH / 2, 30);

    // TIME
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('TIME', CANVAS_WIDTH - 14, 14);
    const t = Math.max(0, Math.ceil(timeRemaining));
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = t < 50 ? '#FF4040' : '#FFFFFF';
    ctx.fillText(String(t).padStart(3, '0'), CANVAS_WIDTH - 14, 30);

    // LIVES (top-left under MARIO)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText('×' + lives, 96, 14);
    drawTinyMario(80, 6);

    // HP bar (smaller, lower-left)
    const hpBarW = 140;
    const hpBarH = 10;
    const hpBarX = 14;
    const hpBarY = CANVAS_HEIGHT - 22;
    // Note: player not passed here in storyData; HUD without player ref uses full bar
}

function drawHUDCoin(x, y) {
    ctx.fillStyle = COLOR_COIN;
    ctx.fillRect(x, y - 8, 10, 16);
    ctx.fillStyle = COLOR_COIN_LIGHT;
    ctx.fillRect(x + 1, y - 7, 3, 14);
    ctx.fillStyle = COLOR_COIN_DARK;
    ctx.fillRect(x, y - 8, 10, 1);
    ctx.fillRect(x, y + 7, 10, 1);
}

function drawTinyMario(x, y) {
    // Tiny mario icon for life count
    ctx.fillStyle = '#E8281C';
    ctx.fillRect(x, y, 8, 3);
    ctx.fillRect(x + 2, y - 2, 4, 2);
    ctx.fillStyle = '#F8B070';
    ctx.fillRect(x, y + 3, 8, 3);
    ctx.fillStyle = '#0058F8';
    ctx.fillRect(x, y + 6, 8, 4);
    ctx.fillStyle = '#7C2810';
    ctx.fillRect(x, y + 10, 3, 2);
    ctx.fillRect(x + 5, y + 10, 3, 2);
}
