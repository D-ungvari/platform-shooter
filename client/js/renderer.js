import {
    CANVAS_WIDTH, CANVAS_HEIGHT, PLATFORMS,
    COLOR_BACKGROUND, COLOR_PLAYER, COLOR_ENEMY,
    COLOR_BULLET, COLOR_PLATFORM, COLOR_GROUND, COLOR_FLYER, COLOR_TANK
} from './constants.js';
import { getMouse } from './input.js';

let ctx;
let muzzleFlash = 0;
let gameTime = 0;

// Background stars
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

// Parallax mountain silhouettes
const mountains = [];
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

// Moon
const moonX = CANVAS_WIDTH * 0.8;
const moonY = 70;

export function initRenderer(context) {
    ctx = context;
}

export function triggerMuzzleFlash() {
    muzzleFlash = 0.05;
}

export function renderGame(player, enemies, bullets, score, dt, killCount, survivalTime) {
    gameTime += dt || 1 / 60;

    // Background — darkens/reddens with time
    const timeRatio = survivalTime !== undefined ? Math.min(survivalTime / 180, 1) : 0;
    const bgR = 10 + Math.floor(timeRatio * 20);
    const bgG = 10 - Math.floor(timeRatio * 6);
    const bgB = 30 - Math.floor(timeRatio * 12);
    ctx.fillStyle = `rgb(${bgR}, ${Math.max(0, bgG)}, ${Math.max(4, bgB)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Moon
    ctx.fillStyle = '#DDDDBB';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${bgR}, ${Math.max(0, bgG)}, ${Math.max(4, bgB)})`;
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY - 5, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Stars
    for (const star of bgStars) {
        const twinkle = 0.5 + Math.sin(gameTime * star.speed + star.x) * 0.5;
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Far mountains
    const farColor = `rgb(${20 + Math.floor(timeRatio * 15)}, ${18 - Math.floor(timeRatio * 5)}, ${35 - Math.floor(timeRatio * 10)})`;
    drawMountainLayer(farMountains, farColor, gameTime);

    // Near mountains
    const nearColor = `rgb(${30 + Math.floor(timeRatio * 15)}, ${26 - Math.floor(timeRatio * 8)}, ${40 - Math.floor(timeRatio * 12)})`;
    drawMountainLayer(nearMountains, nearColor, gameTime);

    // Platforms
    for (let i = 0; i < PLATFORMS.length; i++) {
        const p = PLATFORMS[i];
        if (i === 0) {
            // Ground — gradient
            const grd = ctx.createLinearGradient(0, p.y, 0, p.y + p.height);
            grd.addColorStop(0, '#556655');
            grd.addColorStop(1, '#334433');
            ctx.fillStyle = grd;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            // Grass edge
            ctx.fillStyle = '#66884466';
            ctx.fillRect(p.x, p.y, p.width, 3);
        } else {
            // Floating platforms with rounded look
            ctx.fillStyle = '#555566';
            roundRect(p.x, p.y, p.width, p.height, 4);
            // Top highlight
            ctx.fillStyle = '#777788';
            ctx.fillRect(p.x + 4, p.y, p.width - 8, 2);
            // Bottom shadow
            ctx.fillStyle = '#333344';
            ctx.fillRect(p.x + 4, p.y + p.height - 2, p.width - 8, 2);
        }
    }

    // Enemies
    for (const e of enemies) {
        drawEnemy(e);
    }

    // Off-screen enemy indicators
    for (const e of enemies) {
        const ecx = e.x + e.width / 2;
        const ecy = e.y + e.height / 2;
        if (ecx < -5 || ecx > CANVAS_WIDTH + 5 || ecy < -5 || ecy > CANVAS_HEIGHT + 5) {
            const ix = Math.max(14, Math.min(CANVAS_WIDTH - 14, ecx));
            const iy = Math.max(14, Math.min(CANVAS_HEIGHT - 14, ecy));
            const color = ENEMY_COLORS[e.type] || COLOR_ENEMY;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6 + Math.sin(gameTime * 8) * 0.2;
            // Arrow triangle pointing inward
            ctx.beginPath();
            if (ecx < 0) { // left
                ctx.moveTo(ix + 6, iy);
                ctx.lineTo(ix - 4, iy - 5);
                ctx.lineTo(ix - 4, iy + 5);
            } else if (ecx > CANVAS_WIDTH) { // right
                ctx.moveTo(ix - 6, iy);
                ctx.lineTo(ix + 4, iy - 5);
                ctx.lineTo(ix + 4, iy + 5);
            } else { // top
                ctx.moveTo(ix, iy + 6);
                ctx.lineTo(ix - 5, iy - 4);
                ctx.lineTo(ix + 5, iy - 4);
            }
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // Player
    drawPlayer(player);

    // Bullets with glow
    for (const b of bullets) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = COLOR_BULLET;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLOR_BULLET;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Muzzle flash
    if (muzzleFlash > 0) {
        muzzleFlash -= 1 / 60;
        const mouse = getMouse();
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
    }

    // HUD
    drawHUD(player, score, killCount, survivalTime, enemies.length);
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

// --- Enemy drawing ---

const ENEMY_COLORS = {
    runner: COLOR_ENEMY,
    flyer: COLOR_FLYER,
    tank: COLOR_TANK,
};

function drawEnemy(e) {
    ctx.save();
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height / 2;

    if (e.type === 'runner') {
        drawRunner(e, cx, cy);
    } else if (e.type === 'flyer') {
        drawFlyer(e, cx, cy);
    } else if (e.type === 'tank') {
        drawTank(e, cx, cy);
    }

    // Health bar for multi-HP enemies
    if (e.maxHealth > 1 && e.health > 0) {
        const barW = e.width + 4;
        const barH = 3;
        const barX = e.x - 2;
        const barY = e.y - 8;
        const ratio = e.health / e.maxHealth;
        ctx.fillStyle = '#222';
        roundRect(barX, barY, barW, barH, 1);
        ctx.fillStyle = ratio > 0.5 ? '#FF6633' : '#FF3333';
        ctx.fillRect(barX + 1, barY, (barW - 2) * ratio, barH);
    }

    ctx.restore();
}

function drawRunner(e, cx, cy) {
    const facing = e.vx >= 0 ? 1 : -1;
    const bob = Math.sin(gameTime * 10 + e.x) * 2;
    const legPhase = Math.sin(gameTime * 12 + e.x);

    // Legs
    ctx.fillStyle = '#AA2222';
    const legW = 5, legH = 14;
    const legSpread = legPhase * 4;
    ctx.fillRect(cx - 7 + legSpread, cy + 8 + bob, legW, legH);
    ctx.fillRect(cx + 2 - legSpread, cy + 8 + bob, legW, legH);
    // Feet
    ctx.fillStyle = '#882222';
    ctx.fillRect(cx - 8 + legSpread, cy + 20 + bob, legW + 2, 3);
    ctx.fillRect(cx + 1 - legSpread, cy + 20 + bob, legW + 2, 3);

    // Body
    ctx.fillStyle = COLOR_ENEMY;
    roundRect(cx - 10, cy - 8 + bob, 20, 18, 4);

    // Head
    ctx.fillStyle = '#DD3333';
    ctx.beginPath();
    ctx.arc(cx, cy - 14 + bob, 10, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#FFAA44';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 22 + bob);
    ctx.lineTo(cx - 10, cy - 30 + bob);
    ctx.lineTo(cx - 3, cy - 22 + bob);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 22 + bob);
    ctx.lineTo(cx + 10, cy - 30 + bob);
    ctx.lineTo(cx + 3, cy - 22 + bob);
    ctx.fill();

    // Eyes
    const eyeOff = facing * 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 4 + eyeOff, cy - 15 + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4 + eyeOff, cy - 15 + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx - 3 + eyeOff + facing, cy - 15 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5 + eyeOff + facing, cy - 15 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Angry brow
    ctx.strokeStyle = '#882222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 19 + bob);
    ctx.lineTo(cx - 2, cy - 17 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 19 + bob);
    ctx.lineTo(cx + 2, cy - 17 + bob);
    ctx.stroke();
}

function drawFlyer(e, cx, cy) {
    const wingFlap = Math.sin(gameTime * 16 + e.y) * 0.4;
    const hover = Math.sin(gameTime * 4 + e.x) * 3;
    const y = cy + hover;

    // Wings
    ctx.fillStyle = '#CC66CC';
    ctx.save();
    // Left wing
    ctx.beginPath();
    ctx.moveTo(cx - 4, y);
    ctx.quadraticCurveTo(cx - 20, y - 18 * (1 + wingFlap), cx - 22, y - 4);
    ctx.quadraticCurveTo(cx - 16, y + 2, cx - 4, y + 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(cx + 4, y);
    ctx.quadraticCurveTo(cx + 20, y - 18 * (1 + wingFlap), cx + 22, y - 4);
    ctx.quadraticCurveTo(cx + 16, y + 2, cx + 4, y + 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = COLOR_FLYER;
    ctx.beginPath();
    ctx.ellipse(cx, y, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner body highlight
    ctx.fillStyle = '#FFAAFF';
    ctx.beginPath();
    ctx.ellipse(cx, y - 2, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes — big and glowing
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 4, y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4, y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = '#880088';
    ctx.beginPath();
    ctx.arc(cx - 4, y - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4, y - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Glow aura
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = COLOR_FLYER;
    ctx.beginPath();
    ctx.arc(cx, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

function drawTank(e, cx, cy) {
    const bob = Math.sin(gameTime * 5 + e.x) * 1;
    const facing = e.vx >= 0 ? 1 : -1;

    // Legs (thick)
    ctx.fillStyle = '#995500';
    ctx.fillRect(cx - 14, cy + 10 + bob, 10, 16);
    ctx.fillRect(cx + 4, cy + 10 + bob, 10, 16);
    // Boots
    ctx.fillStyle = '#664400';
    roundRect(cx - 16, cy + 24 + bob, 14, 5, 2);
    roundRect(cx + 2, cy + 24 + bob, 14, 5, 2);

    // Body — armored torso
    ctx.fillStyle = COLOR_TANK;
    roundRect(cx - 16, cy - 12 + bob, 32, 24, 6);

    // Armor plate across chest
    ctx.fillStyle = '#CC6600';
    roundRect(cx - 12, cy - 8 + bob, 24, 8, 3);
    // Belt
    ctx.fillStyle = '#664400';
    ctx.fillRect(cx - 14, cy + 8 + bob, 28, 4);
    // Belt buckle
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(cx - 3, cy + 8 + bob, 6, 4);

    // Arms
    ctx.fillStyle = '#DD7700';
    // Left arm
    ctx.fillRect(cx - 20 + bob, cy - 6 + bob, 6, 18);
    // Right arm
    ctx.fillRect(cx + 14 - bob, cy - 6 + bob, 6, 18);
    // Fists
    ctx.fillStyle = '#FFAA44';
    roundRect(cx - 21 + bob, cy + 10 + bob, 8, 6, 2);
    roundRect(cx + 13 - bob, cy + 10 + bob, 8, 6, 2);

    // Head — square with helmet
    ctx.fillStyle = '#BB6600';
    roundRect(cx - 12, cy - 26 + bob, 24, 16, 5);
    // Helmet top
    ctx.fillStyle = '#996600';
    roundRect(cx - 14, cy - 28 + bob, 28, 8, 4);
    // Visor slit
    ctx.fillStyle = '#332200';
    ctx.fillRect(cx - 9, cy - 21 + bob, 18, 4);
    // Eyes behind visor
    ctx.fillStyle = '#FF4400';
    ctx.fillRect(cx - 6 + facing, cy - 20 + bob, 4, 2);
    ctx.fillRect(cx + 3 + facing, cy - 20 + bob, 4, 2);
}

// --- Player drawing ---

function drawPlayer(player) {
    ctx.save();

    if (player.invincible > 0) {
        const blink = Math.floor(player.invincible * 10) % 2 === 0;
        ctx.globalAlpha = blink ? 0.3 : 1.0;
    }

    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const facing = player.facingRight ? 1 : -1;
    const isMoving = Math.abs(player.vx) > 10;
    const isAirborne = !player.grounded;
    const legPhase = isMoving ? Math.sin(gameTime * 14) : 0;
    const breathe = Math.sin(gameTime * 3) * 0.5;

    // Gun arm — draw behind or in front depending on direction
    const mouse = getMouse();
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const aimAngle = Math.atan2(dy, dx);

    // Legs
    ctx.fillStyle = '#2255AA';
    const legW = 6, legH = 16;
    if (isAirborne) {
        // Legs tucked
        ctx.fillRect(cx - 8, cy + 10, legW, legH - 4);
        ctx.fillRect(cx + 2, cy + 10, legW, legH - 4);
    } else {
        const spread = legPhase * 5;
        ctx.fillRect(cx - 8 + spread, cy + 10, legW, legH);
        ctx.fillRect(cx + 2 - spread, cy + 10, legW, legH);
    }
    // Boots
    ctx.fillStyle = '#1a3a77';
    if (!isAirborne) {
        const spread = legPhase * 5;
        roundRect(cx - 9 + spread, cy + 24, legW + 3, 4, 2);
        roundRect(cx + 1 - spread, cy + 24, legW + 3, 4, 2);
    }

    // Body
    ctx.fillStyle = COLOR_PLAYER;
    roundRect(cx - 11, cy - 8 + breathe, 22, 20, 5);

    // Body armor stripe
    ctx.fillStyle = '#3366BB';
    ctx.fillRect(cx - 8, cy - 2 + breathe, 16, 3);

    // Arms
    ctx.fillStyle = '#3377CC';
    // Back arm
    ctx.fillRect(cx - 13 * facing, cy - 4 + breathe, 5, 14);

    // Gun arm pointing at mouse
    ctx.save();
    ctx.translate(cx, cy + 2);
    ctx.rotate(aimAngle);
    // Arm
    ctx.fillStyle = '#3377CC';
    ctx.fillRect(0, -3, 14, 6);
    // Gun
    ctx.fillStyle = '#888899';
    roundRect(10, -4, 16, 8, 2);
    // Gun barrel
    ctx.fillStyle = '#666677';
    ctx.fillRect(24, -2, 8, 4);
    // Gun detail
    ctx.fillStyle = '#AAAABB';
    ctx.fillRect(12, -3, 3, 6);
    ctx.restore();

    // Head
    ctx.fillStyle = '#3388EE';
    ctx.beginPath();
    ctx.arc(cx, cy - 16 + breathe, 11, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#2266CC';
    ctx.beginPath();
    ctx.arc(cx, cy - 18 + breathe, 12, Math.PI, Math.PI * 2);
    ctx.fill();
    // Helmet rim
    ctx.fillStyle = '#1a4fa0';
    ctx.fillRect(cx - 12, cy - 18 + breathe, 24, 3);

    // Visor
    ctx.fillStyle = '#88CCFF';
    const visorX = cx + facing * 2;
    roundRect(visorX - 7, cy - 20 + breathe, 11, 6, 2);
    // Visor shine
    ctx.fillStyle = '#BBDDFF';
    ctx.fillRect(visorX - 5, cy - 19 + breathe, 3, 2);

    // Eyes behind visor
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 3 + facing * 2, cy - 16 + breathe, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3 + facing * 2, cy - 16 + breathe, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#112244';
    ctx.beginPath();
    ctx.arc(cx - 3 + facing * 3, cy - 16 + breathe, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3 + facing * 3, cy - 16 + breathe, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;
    ctx.restore();
}

// --- HUD ---

function drawHUD(player, score, killCount, survivalTime, enemyCount) {
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

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Score: ' + score, CANVAS_WIDTH - 10, 26);

    // Survival timer (top center)
    if (survivalTime !== undefined) {
        const m = Math.floor(survivalTime / 60);
        const s = Math.floor(survivalTime % 60);
        const timeStr = m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '16px monospace';
        ctx.fillText(timeStr, CANVAS_WIDTH / 2, 20);
    }

    // Kill count
    if (killCount !== undefined) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FF6666';
        ctx.font = '14px monospace';
        ctx.fillText('Kills: ' + killCount, CANVAS_WIDTH - 10, 44);
    }

    ctx.textAlign = 'left';

    // Weapon powerup indicator
    if (player.weapon !== 'normal' && player.weaponTimer > 0) {
        const weaponLabel = player.weapon === 'shotgun' ? 'SHOTGUN' : 'RAPID';
        const weaponColor = player.weapon === 'shotgun' ? '#FF8844' : '#44DDFF';
        ctx.fillStyle = weaponColor;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(weaponLabel + ' ' + Math.ceil(player.weaponTimer) + 's', 10, 46);
    }

    // Enemy swarm warning
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
