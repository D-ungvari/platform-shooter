import {
    CANVAS_WIDTH, CANVAS_HEIGHT, TILE,
    COLOR_SKY, COLOR_CLOUD, COLOR_CLOUD_SHADOW,
    COLOR_HILL, COLOR_HILL_DARK, COLOR_BUSH, COLOR_BUSH_DARK,
    COLOR_GRASS, COLOR_GRASS_DARK, COLOR_DIRT, COLOR_DIRT_DARK, COLOR_DIRT_SPECK,
    COLOR_BRICK, COLOR_BRICK_LIGHT, COLOR_BRICK_DARK,
    COLOR_QBLOCK, COLOR_QBLOCK_DARK, COLOR_QBLOCK_LIGHT, COLOR_QBLOCK_USED,
    COLOR_PIPE, COLOR_PIPE_LIGHT, COLOR_PIPE_DARK,
    COLOR_FLAG, COLOR_FLAG_POLE, COLOR_FLAG_BALL, COLOR_FLAG_CLOTH,
    COLOR_CASTLE, COLOR_CASTLE_DARK, COLOR_COIN, COLOR_COIN_LIGHT, COLOR_COIN_DARK,
    COLOR_PLAYER, COLOR_ENEMY, COLOR_BULLET, COLOR_FLYER, COLOR_TANK,
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
export function initRenderer(context) {
    ctx = context;
    ctx.imageSmoothingEnabled = false;
}

export function triggerMuzzleFlash() {
    muzzleFlash = 0.05;
}

export function renderGame(player, enemies, bullets, score, dt, killCount, survivalTime, mode, camera, platforms, blocks, zoneData, extGameTime, storyData) {
    gameTime = extGameTime || (gameTime + (dt || 1 / 60));
    const cam = camera || { x: 0, y: 0 };
    const theme = (storyData && storyData.theme) ? storyData.theme : 'overworld';

    drawMarioBackground(cam, true, theme);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    if (storyData) {
        drawStoryWorld(storyData, cam);
    }

    // Enemies (skip hidden piranhas)
    for (const e of enemies) {
        if (e.type === 'piranha' && e.phase === 'hidden') continue;
        drawEnemy(e);
    }

    drawPlayer(player, true, cam);

    for (const b of bullets) {
        drawFireball(b);
    }

    if (muzzleFlash > 0) {
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

    if (storyData) {
        drawStoryHUD(storyData, score, killCount, player);
    }
}

// === MARIO BACKGROUND ===
function drawMarioBackground(cam, isStory, theme = 'overworld') {
    const camX = isStory ? cam.x : 0;
    if (theme === 'underground') {
        // Dark cave background
        const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        grd.addColorStop(0, '#000020');
        grd.addColorStop(1, '#080010');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Distant rock silhouettes
        ctx.fillStyle = '#101030';
        for (let i = 0; i < 8; i++) {
            const rx = (i * 200 - (camX * 0.2) % 200 + CANVAS_WIDTH) % CANVAS_WIDTH;
            ctx.beginPath();
            ctx.moveTo(rx, CANVAS_HEIGHT);
            ctx.lineTo(rx + 100, 200 + (i % 3) * 50);
            ctx.lineTo(rx + 200, CANVAS_HEIGHT);
            ctx.closePath();
            ctx.fill();
        }
        return;
    }
    if (theme === 'castle') {
        const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        grd.addColorStop(0, '#100008');
        grd.addColorStop(0.5, '#380808');
        grd.addColorStop(1, '#180000');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Brick wall pattern
        ctx.fillStyle = '#1C0808';
        for (let r = 0; r < 18; r++) {
            const off = (r % 2) * 16;
            for (let c = -1; c < 18; c++) {
                ctx.fillRect(c * 32 + off - (camX * 0.1) % 32, r * 32, 30, 30);
            }
        }
        return;
    }
    if (theme === 'sky') {
        const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        grd.addColorStop(0, '#80C0FC');
        grd.addColorStop(1, '#FFE890');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Lots of clouds, no hills
        drawCloudsParallax(camX, 0.3);
        drawCloudsParallax(camX, 0.6);
        return;
    }
    // OVERWORLD default
    const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grd.addColorStop(0, '#5C94FC');
    grd.addColorStop(0.85, '#A0C4FC');
    grd.addColorStop(1, '#C0E0FC');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawHillsParallax(camX, 0.3, COLOR_HILL_DARK, 1.0);
    drawHillsParallax(camX, 0.5, COLOR_HILL, 0.8);
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

// === STORY WORLD DRAW ===
function drawStoryWorld(storyData, cam) {
    const { decoTiles, pipeTiles, qBlocks, coins, flag, castle, hazards, movingPlatforms, crumbleTilesList, bricks } = storyData;
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
        // brick deco skipped — bricks rendered from bricks array below
    }

    // Breakable bricks (with bump + broken state)
    if (bricks) {
        for (const b of bricks) {
            if (b.broken) continue;
            if (b.x + b.width < camLeft || b.x > camRight) continue;
            const bumpY = b.bumpT > 0 ? -Math.sin(b.bumpT * Math.PI / 0.25) * 8 : 0;
            drawBrickTile(b.x, b.y + bumpY);
        }
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

    // Moving platforms
    if (movingPlatforms) {
        for (const m of movingPlatforms) {
            drawMovingPlatform(m);
        }
    }

    // Crumble tiles redrawn on top of decoTiles to show shake/broken state
    if (crumbleTilesList) {
        for (const c of crumbleTilesList) {
            if (c.state === 'broken') continue; // hide
            drawCrumbleTile(c);
        }
    }

    // Hazards
    if (hazards) {
        for (const h of hazards) {
            if (h.type === 'spike') drawSpike(h.x, h.y);
            else if (h.type === 'lava') drawLava(h.x, h.y);
            else if (h.type === 'firebar') drawFireBar(h);
        }
    }

    // Flag pole
    if (flag) {
        drawFlagpole(flag);
    }
}

function drawMovingPlatform(m) {
    const x = m.x, y = m.y, w = m.width, h = m.height;
    // Cloud-style floating platform (sky theme) or stone (default)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#E8F0FF';
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.fillStyle = '#C8D8F0';
    ctx.fillRect(x, y, 4, h);
    ctx.fillRect(x + w - 4, y, 4, h);
    // Bumps
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 16 + i * 32, y + 4, 8, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
    }
    // Subtle direction arrow
    ctx.fillStyle = 'rgba(0,80,200,0.5)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(m.moveAxis === 'h' ? '<>' : 'v^', x + w / 2, y + h - 4);
    ctx.textAlign = 'left';
}

function drawCrumbleTile(c) {
    const shake = c.state === 'shaking' ? (Math.random() - 0.5) * 3 : 0;
    const x = c.x + shake, y = c.y + shake;
    ctx.fillStyle = '#A8784C';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#7C4828';
    ctx.fillRect(x, y, TILE, 2);
    ctx.fillRect(x, y, 2, TILE);
    ctx.fillStyle = '#5C2818';
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
    ctx.fillRect(x + TILE - 2, y, 2, TILE);
    // Cracks
    ctx.strokeStyle = '#3C1808';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 4);
    ctx.lineTo(x + 12, y + 14);
    ctx.lineTo(x + 8, y + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 8);
    ctx.lineTo(x + 18, y + 18);
    ctx.lineTo(x + 24, y + 26);
    ctx.stroke();
}

function drawSpike(x, y) {
    ctx.fillStyle = '#888888';
    for (let i = 0; i < 4; i++) {
        const sx = x + i * 8;
        ctx.beginPath();
        ctx.moveTo(sx, y + TILE);
        ctx.lineTo(sx + 4, y + 4);
        ctx.lineTo(sx + 8, y + TILE);
        ctx.closePath();
        ctx.fill();
    }
    // Highlights
    ctx.fillStyle = '#CCCCCC';
    for (let i = 0; i < 4; i++) {
        const sx = x + i * 8;
        ctx.fillRect(sx + 3, y + 8, 1, 16);
    }
    // Base
    ctx.fillStyle = '#444444';
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
}

function drawLava(x, y) {
    const wave = Math.sin(gameTime * 4 + x * 0.05) * 2;
    // Glow
    ctx.fillStyle = 'rgba(248, 80, 0, 0.4)';
    ctx.fillRect(x - 2, y - 4, TILE + 4, TILE + 4);
    // Lava body
    const grd = ctx.createLinearGradient(0, y, 0, y + TILE);
    grd.addColorStop(0, '#FFE830');
    grd.addColorStop(0.5, '#FF6020');
    grd.addColorStop(1, '#A02000');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y + 4 + wave, TILE, TILE - 4);
    // Surface bubbles
    ctx.fillStyle = '#FFE890';
    ctx.beginPath();
    ctx.arc(x + 8, y + 6 + wave, 2, 0, Math.PI * 2);
    ctx.arc(x + 22, y + 8 + wave, 1.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawFireBar(h) {
    const angle = gameTime * h.speed + h.phase;
    // Pivot
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Fireball chain
    for (let i = 1; i <= h.length; i++) {
        const fx = h.x + Math.cos(angle) * i * 16;
        const fy = h.y + Math.sin(angle) * i * 16;
        ctx.fillStyle = 'rgba(255, 96, 32, 0.4)';
        ctx.beginPath();
        ctx.arc(fx, fy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF8000';
        ctx.beginPath();
        ctx.arc(fx, fy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFE830';
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
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
    } else if (e.type === 'koopa') {
        drawKoopa(e, cx, cy);
    } else if (e.type === 'piranha') {
        drawPiranha(e, cx, cy);
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

function drawKoopa(e, cx, cy) {
    const top = e.y;
    const facing = e.vx >= 0 ? 1 : -1;
    if (e.shellState === 'shell' || e.shellState === 'sliding') {
        // Just shell on ground
        const shellY = top + e.height - 24;
        const spin = e.shellState === 'sliding' ? gameTime * 16 : 0;
        ctx.save();
        ctx.translate(cx, shellY + 12);
        ctx.rotate(spin);
        ctx.fillStyle = '#00A800';
        ctx.beginPath();
        ctx.arc(0, 0, 12, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-12, 0, 24, 8);
        ctx.fillStyle = '#005800';
        ctx.fillRect(-12, 6, 24, 2);
        // Shell rim (yellow)
        ctx.fillStyle = '#FFE890';
        ctx.fillRect(-12, 8, 24, 2);
        // Pattern hexagons
        ctx.fillStyle = '#80F800';
        ctx.fillRect(-6, -6, 4, 4);
        ctx.fillRect(2, -8, 4, 4);
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
        return;
    }
    // Walking
    const walkPhase = Math.floor(gameTime * 6) % 2;
    // Feet
    ctx.fillStyle = '#F8B070';
    if (walkPhase === 0) {
        ctx.fillRect(cx - 10, top + e.height - 4, 6, 4);
        ctx.fillRect(cx + 4, top + e.height - 4, 6, 4);
    } else {
        ctx.fillRect(cx - 12, top + e.height - 4, 6, 4);
        ctx.fillRect(cx + 6, top + e.height - 4, 6, 4);
    }
    // Shell on back
    ctx.fillStyle = '#00A800';
    ctx.beginPath();
    ctx.arc(cx, top + 12, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - 12, top + 12, 24, 14);
    ctx.fillStyle = '#FFE890';
    ctx.fillRect(cx - 12, top + 24, 24, 2);
    ctx.fillStyle = '#80F800';
    ctx.fillRect(cx - 6, top + 6, 4, 4);
    ctx.fillRect(cx + 2, top + 4, 4, 4);
    // Head (yellow)
    ctx.fillStyle = '#F8D830';
    ctx.fillRect(cx - 6 + facing * 2, top + 14, 12, 10);
    ctx.fillStyle = '#A88800';
    ctx.fillRect(cx - 6 + facing * 2, top + 22, 12, 2);
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 4 + facing * 2, top + 16, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 3 + facing * 3, top + 17, 2, 3);
    // Beak
    ctx.fillStyle = '#F8B070';
    ctx.fillRect(cx + (facing === 1 ? 4 : -8), top + 20, 4, 2);
}

function drawPiranha(e, cx, cy) {
    const top = e.y;
    const w = e.width;
    const h = e.height;
    // Stem
    ctx.fillStyle = '#00A800';
    ctx.fillRect(cx - 3, top + h * 0.5, 6, h * 0.5);
    // Head body (red w/ white spots)
    ctx.fillStyle = '#E8281C';
    ctx.beginPath();
    ctx.arc(cx, top + h * 0.32, h * 0.32, 0, Math.PI * 2);
    ctx.fill();
    // Spots
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 6, top + 4, 3, 3);
    ctx.fillRect(cx + 4, top + 8, 3, 3);
    ctx.fillRect(cx - 2, top + 12, 3, 3);
    // Mouth open
    const open = (Math.sin(gameTime * 6) + 1) / 2;
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 8, top + h * 0.36, 16, 2 + open * 6);
    // Teeth
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 7 + i * 4, top + h * 0.36);
        ctx.lineTo(cx - 5 + i * 4, top + h * 0.36 + 4);
        ctx.lineTo(cx - 3 + i * 4, top + h * 0.36);
        ctx.closePath();
        ctx.fill();
    }
}

// === PLAYER (Davio) ===
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
    const powerLevel = player.powerLevel || 0;
    const crouching = !!player.crouching;
    const groundPounding = !!player.groundPounding;
    const skidding = !!player.skidding;

    // Squash/stretch
    const sx = player.squashX || 1;
    const sy = player.squashY || 1;
    const baseX = Math.round(player.x);
    const baseY = Math.round(player.y);
    const w = player.width * sx;
    const h = player.height * sy;
    const ox = baseX + (player.width - w) / 2;
    const oy = baseY + (player.height - h);
    const cxw = baseX + player.width / 2;
    const cyw = baseY + player.height / 2;

    // Star power: cycle palette rapidly
    const starActive = (player.starTimer || 0) > 0;
    if (starActive) {
        const palettes = [
            ['#E8281C', '#0058F8'],
            ['#F8B800', '#00A800'],
            ['#FFFFFF', '#E8281C'],
            ['#0058F8', '#F8B800'],
        ];
        const idx = Math.floor(gameTime * 24) % palettes.length;
        drawDavio(ox, oy, w, h, facing, isAirborne, isMoving, runFrame, powerLevel, crouching, groundPounding, skidding, palettes[idx][0], palettes[idx][1]);
    } else {
        drawDavio(ox, oy, w, h, facing, isAirborne, isMoving, runFrame, powerLevel, crouching, groundPounding, skidding);
    }

    ctx.globalAlpha = 1.0;

    if (starActive) {
        // Sparkle trail
        for (let i = 0; i < 4; i++) {
            const a = gameTime * 6 + i * Math.PI / 2;
            const r = Math.max(player.width, player.height) * 0.6;
            const sxx = cxw + Math.cos(a) * r;
            const syy = cyw + Math.sin(a) * r;
            ctx.fillStyle = (Math.floor(gameTime * 16 + i) % 2 === 0) ? '#FFE830' : '#FFFFFF';
            drawStar(sxx, syy, 4, 5);
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

// Davio sprite (chunky pixel-art) — 3 power tiers
function drawDavio(x, y, w, h, facing, airborne, moving, runFrame, powerLevel, crouching, groundPounding, skidding, capOverride, shirtOverride) {
    if (powerLevel === 0) {
        drawSmallDavio(x, y, w, h, facing, airborne, moving, runFrame, capOverride);
        return;
    }
    drawSuperDavio(x, y, w, h, facing, airborne, moving, runFrame, powerLevel, crouching, groundPounding, skidding, capOverride, shirtOverride);
}

function drawSmallDavio(x, y, w, h, facing, airborne, moving, runFrame, capOverride) {
    const cx = x + w / 2;
    const top = y;
    const skin = '#F8B070';
    const skinDark = '#C84C0C';
    const red = capOverride || '#E8281C';
    const blue = '#0058F8';
    const brown = '#7C2810';
    const white = '#FFFFFF';
    const yellow = '#F8B800';

    // Cap
    ctx.fillStyle = red;
    ctx.fillRect(cx - w * 0.42, top + h * 0.05, w * 0.84, h * 0.22);
    if (facing === 1) {
        ctx.fillRect(cx - w * 0.10, top + h * 0.22, w * 0.50, h * 0.10);
    } else {
        ctx.fillRect(cx - w * 0.40, top + h * 0.22, w * 0.50, h * 0.10);
    }
    // "D" emblem
    ctx.fillStyle = white;
    ctx.fillRect(cx - w * 0.10, top + h * 0.10, w * 0.20, h * 0.10);
    ctx.fillStyle = red;
    ctx.fillRect(cx - w * 0.04, top + h * 0.13, w * 0.10, h * 0.04);
    // Sideburns
    ctx.fillStyle = brown;
    ctx.fillRect(cx - w * 0.42, top + h * 0.27, w * 0.10, h * 0.12);
    ctx.fillRect(cx + w * 0.32, top + h * 0.27, w * 0.10, h * 0.12);
    // Face
    ctx.fillStyle = skin;
    ctx.fillRect(cx - w * 0.32, top + h * 0.27, w * 0.64, h * 0.20);
    // Eye
    ctx.fillStyle = white;
    const eyeX = cx + (facing === 1 ? w * 0.06 : -w * 0.16);
    ctx.fillRect(eyeX, top + h * 0.30, w * 0.10, h * 0.10);
    ctx.fillStyle = '#000000';
    ctx.fillRect(eyeX + (facing === 1 ? w * 0.04 : 0), top + h * 0.32, w * 0.04, h * 0.06);
    // Mustache
    ctx.fillStyle = brown;
    ctx.fillRect(cx - w * 0.20, top + h * 0.40, w * 0.40, h * 0.06);
    // Body (overalls — short)
    ctx.fillStyle = blue;
    ctx.fillRect(cx - w * 0.30, top + h * 0.50, w * 0.60, h * 0.32);
    // Buttons
    ctx.fillStyle = yellow;
    ctx.fillRect(cx - w * 0.18, top + h * 0.58, w * 0.06, h * 0.06);
    ctx.fillRect(cx + w * 0.12, top + h * 0.58, w * 0.06, h * 0.06);
    // Hands
    ctx.fillStyle = white;
    ctx.fillRect(cx - w * 0.42, top + h * 0.58, w * 0.12, h * 0.10);
    ctx.fillRect(cx + w * 0.30, top + h * 0.58, w * 0.12, h * 0.10);
    // Boots
    ctx.fillStyle = brown;
    if (airborne || !moving) {
        ctx.fillRect(cx - w * 0.30, top + h * 0.82, w * 0.26, h * 0.18);
        ctx.fillRect(cx + w * 0.04, top + h * 0.82, w * 0.26, h * 0.18);
    } else {
        const offsets = [{ l: 0, r: 0 }, { l: 0.05, r: -0.05 }, { l: 0, r: 0 }, { l: -0.05, r: 0.05 }];
        const o = offsets[runFrame];
        ctx.fillRect(cx - w * 0.30 + w * o.l, top + h * 0.82, w * 0.26, h * 0.18);
        ctx.fillRect(cx + w * 0.04 + w * o.r, top + h * 0.82, w * 0.26, h * 0.18);
    }
}

function drawSuperDavio(x, y, w, h, facing, airborne, moving, runFrame, powerLevel, crouching, groundPounding, skidding, capOverride, shirtOverride) {
    const cx = x + w / 2;
    const top = y;
    const skin = '#F8B070';
    const skinDark = '#C84C0C';
    // Fire-Davio: white cap, red shirt + white overalls
    const isFire = powerLevel === 2;
    const red = capOverride || (isFire ? '#FFFFFF' : '#E8281C');
    const redDark = isFire ? '#C8C8C8' : '#A0140C';
    const blue = shirtOverride || (isFire ? '#FFFFFF' : '#0058F8');
    const blueDark = isFire ? '#A8A8A8' : '#003078';
    const shirt = isFire ? '#E8281C' : '#E8281C';
    const shirtDark = isFire ? '#A0140C' : '#A0140C';
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

    // Body — overalls over shirt
    // Shirt sleeves
    ctx.fillStyle = shirt;
    ctx.fillRect(cx - w * 0.42, top + h * 0.40, w * 0.20, h * 0.20);
    ctx.fillRect(cx + w * 0.22, top + h * 0.40, w * 0.20, h * 0.20);
    ctx.fillStyle = shirtDark;
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

}

// === STORY HUD (Mario-style top bar) ===
function drawStoryHUD(storyData, score, killCount, player) {
    const { lives, coinCount, timeRemaining, levelName } = storyData;
    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 36);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';

    // DAVIO × 3
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('DAVIO', 14, 14);
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

    // Power-up indicator (lower-left)
    if (player) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px monospace';
        const labels = ['SMALL', 'SUPER', 'FIRE'];
        const colors = ['#FFFFFF', '#80F8FF', '#FF8000'];
        const lbl = labels[player.powerLevel || 0];
        ctx.fillStyle = colors[player.powerLevel || 0];
        ctx.fillText(lbl, 14, CANVAS_HEIGHT - 12);
        if (player.starTimer > 0) {
            ctx.fillStyle = '#FFE830';
            ctx.fillText('★ STAR ' + Math.ceil(player.starTimer) + 's', 80, CANVAS_HEIGHT - 12);
        }
    }
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
    // Tiny davio icon for life count
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
