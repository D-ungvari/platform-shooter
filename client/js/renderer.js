import {
    CANVAS_WIDTH, CANVAS_HEIGHT, PLATFORMS,
    COLOR_BACKGROUND, COLOR_PLAYER, COLOR_ENEMY,
    COLOR_BULLET, COLOR_PLATFORM, COLOR_GROUND, COLOR_FLYER
} from './constants.js';
import { getMouse } from './input.js';

let ctx;

export function initRenderer(context) {
    ctx = context;
}

export function renderGame(player, enemies, bullets, score) {
    // Clear
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Platforms
    for (let i = 0; i < PLATFORMS.length; i++) {
        const p = PLATFORMS[i];
        ctx.fillStyle = i === 0 ? COLOR_GROUND : COLOR_PLATFORM;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    }

    // Enemies
    for (const e of enemies) {
        ctx.fillStyle = e.type === 'flyer' ? COLOR_FLYER : COLOR_ENEMY;
        ctx.fillRect(e.x, e.y, e.width, e.height);
    }

    // Player
    drawPlayer(player);

    // Bullets
    ctx.fillStyle = COLOR_BULLET;
    for (const b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // HUD
    drawHUD(player, score);
}

function drawPlayer(player) {
    ctx.save();

    // Blink effect when invincible
    if (player.invincible > 0) {
        const blink = Math.floor(player.invincible * 10) % 2 === 0;
        ctx.globalAlpha = blink ? 0.3 : 1.0;
    }

    ctx.fillStyle = COLOR_PLAYER;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.globalAlpha = 1.0;

    // Aim indicator
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
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
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
    ctx.fillStyle = '#FF3333';
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
