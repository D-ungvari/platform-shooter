import {
    CANVAS_WIDTH, CANVAS_HEIGHT, PLATFORMS,
    COLOR_BACKGROUND, COLOR_PLAYER, COLOR_ENEMY,
    COLOR_BULLET, COLOR_PLATFORM, COLOR_GROUND, COLOR_FLYER
} from './constants.js';
import { getMouse } from './input.js';

let ctx;
let muzzleFlash = 0;

export function initRenderer(context) {
    ctx = context;
}

export function triggerMuzzleFlash() {
    muzzleFlash = 0.05;
}

export function renderGame(player, enemies, bullets, score) {
    // Clear
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Platforms with edge highlights
    for (let i = 0; i < PLATFORMS.length; i++) {
        const p = PLATFORMS[i];
        ctx.fillStyle = i === 0 ? COLOR_GROUND : COLOR_PLATFORM;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        // Top edge highlight
        ctx.fillStyle = i === 0 ? '#555555' : '#888888';
        ctx.fillRect(p.x, p.y, p.width, 2);
    }

    // Enemies
    for (const e of enemies) {
        drawEnemy(e);
    }

    // Player
    drawPlayer(player);

    // Bullets with glow
    for (const b of bullets) {
        // Glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = COLOR_BULLET;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        // Core
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
        muzzleFlash -= 1 / 60; // approximate
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
    drawHUD(player, score);
}

function drawEnemy(e) {
    const color = e.type === 'flyer' ? COLOR_FLYER : COLOR_ENEMY;
    ctx.fillStyle = color;
    ctx.fillRect(e.x, e.y, e.width, e.height);

    if (e.type === 'flyer') {
        // Wings (triangles on sides)
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        ctx.fillStyle = '#CC66CC';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(e.x, cy);
        ctx.lineTo(e.x - 6, cy - 8);
        ctx.lineTo(e.x - 6, cy + 8);
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(e.x + e.width, cy);
        ctx.lineTo(e.x + e.width + 6, cy - 8);
        ctx.lineTo(e.x + e.width + 6, cy + 8);
        ctx.fill();
    }

    // Eyes
    const eyeY = e.y + e.height * 0.3;
    const eyeSize = e.type === 'flyer' ? 3 : 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(e.x + e.width * 0.2, eyeY, eyeSize, eyeSize);
    ctx.fillRect(e.x + e.width * 0.6, eyeY, eyeSize, eyeSize);
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.fillRect(e.x + e.width * 0.25, eyeY + 1, 2, 2);
    ctx.fillRect(e.x + e.width * 0.65, eyeY + 1, 2, 2);
}

function drawPlayer(player) {
    ctx.save();

    // Blink effect when invincible
    if (player.invincible > 0) {
        const blink = Math.floor(player.invincible * 10) % 2 === 0;
        ctx.globalAlpha = blink ? 0.3 : 1.0;
    }

    // Body
    ctx.fillStyle = COLOR_PLAYER;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Visor/helmet stripe
    ctx.fillStyle = '#2266CC';
    ctx.fillRect(player.x + 2, player.y + 2, player.width - 4, 12);

    // Eyes
    const eyeY = player.y + 5;
    ctx.fillStyle = '#ffffff';
    if (player.facingRight) {
        ctx.fillRect(player.x + 14, eyeY, 6, 5);
        ctx.fillRect(player.x + 22, eyeY, 6, 5);
    } else {
        ctx.fillRect(player.x + 4, eyeY, 6, 5);
        ctx.fillRect(player.x + 12, eyeY, 6, 5);
    }

    ctx.globalAlpha = 1.0;

    // Aim indicator (gun barrel line)
    const mouse = getMouse();
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
        const aimLen = 40;
        const ax = cx + (dx / len) * aimLen;
        const ay = cy + (dy / len) * aimLen;
        ctx.strokeStyle = '#88AAFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);
        ctx.stroke();
    }

    ctx.restore();
}

function drawHUD(player, score) {
    // Health bar label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HP', 10, 8);

    // Health bar
    const barW = 200;
    const barH = 16;
    const barX = 10;
    const barY = 12;
    const healthRatio = Math.max(0, player.health / player.maxHealth);

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    // Color shifts from green to red based on health
    const r = Math.floor(255 * (1 - healthRatio));
    const g = Math.floor(200 * healthRatio);
    ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
    ctx.fillRect(barX, barY, barW * healthRatio, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Score: ' + score, CANVAS_WIDTH - 10, 26);
    ctx.textAlign = 'left';
}
