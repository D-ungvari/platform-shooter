import {
    CANVAS_WIDTH, CANVAS_HEIGHT, PLATFORMS,
    COLOR_BACKGROUND, COLOR_PLAYER, COLOR_ENEMY,
    COLOR_BULLET, COLOR_PLATFORM, COLOR_GROUND, COLOR_FLYER, COLOR_TANK
} from './constants.js';
import { getMouse } from './input.js';

let ctx;
let muzzleFlash = 0;
let gameTime = 0;

// Background stars (parallax)
const bgStars = [];
for (let i = 0; i < 60; i++) {
    bgStars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT * 0.7,
        size: 1 + Math.random() * 2,
        speed: 5 + Math.random() * 15,
        brightness: 0.2 + Math.random() * 0.5,
    });
}

export function initRenderer(context) {
    ctx = context;
}

export function triggerMuzzleFlash() {
    muzzleFlash = 0.05;
}

export function renderGame(player, enemies, bullets, score, dt) {
    gameTime += dt || 1 / 60;

    // Clear
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background stars
    for (const star of bgStars) {
        const twinkle = 0.5 + Math.sin(gameTime * star.speed + star.x) * 0.5;
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1.0;

    // Platforms with edge highlights
    for (let i = 0; i < PLATFORMS.length; i++) {
        const p = PLATFORMS[i];
        ctx.fillStyle = i === 0 ? COLOR_GROUND : COLOR_PLATFORM;
        ctx.fillRect(p.x, p.y, p.width, p.height);
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
        ctx.globalAlpha = 0.3;
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
    drawHUD(player, score);
}

const ENEMY_COLORS = {
    runner: COLOR_ENEMY,
    flyer: COLOR_FLYER,
    tank: COLOR_TANK,
};

function drawEnemy(e) {
    const color = ENEMY_COLORS[e.type] || COLOR_ENEMY;
    ctx.fillStyle = color;
    ctx.fillRect(e.x, e.y, e.width, e.height);

    if (e.type === 'flyer') {
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        ctx.fillStyle = '#CC66CC';
        ctx.beginPath();
        ctx.moveTo(e.x, cy);
        ctx.lineTo(e.x - 6, cy - 8);
        ctx.lineTo(e.x - 6, cy + 8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.x + e.width, cy);
        ctx.lineTo(e.x + e.width + 6, cy - 8);
        ctx.lineTo(e.x + e.width + 6, cy + 8);
        ctx.fill();
    }

    if (e.type === 'tank') {
        // Armor plate
        ctx.fillStyle = '#CC6600';
        ctx.fillRect(e.x + 4, e.y + 4, e.width - 8, 8);
        // Shield emblem
        ctx.fillStyle = '#FFAA00';
        ctx.fillRect(e.x + e.width / 2 - 4, e.y + 6, 8, 4);
    }

    // Eyes
    const eyeY = e.y + e.height * 0.3;
    const eyeSize = e.type === 'flyer' ? 3 : e.type === 'tank' ? 5 : 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(e.x + e.width * 0.2, eyeY, eyeSize, eyeSize);
    ctx.fillRect(e.x + e.width * 0.6, eyeY, eyeSize, eyeSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(e.x + e.width * 0.25, eyeY + 1, 2, 2);
    ctx.fillRect(e.x + e.width * 0.65, eyeY + 1, 2, 2);

    // Health bar for multi-HP enemies
    if (e.maxHealth > 1 && e.health > 0) {
        const barW = e.width;
        const barH = 3;
        const barX = e.x;
        const barY = e.y - 6;
        const ratio = e.health / e.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#FF3333';
        ctx.fillRect(barX, barY, barW * ratio, barH);
    }
}

function drawPlayer(player) {
    ctx.save();

    if (player.invincible > 0) {
        const blink = Math.floor(player.invincible * 10) % 2 === 0;
        ctx.globalAlpha = blink ? 0.3 : 1.0;
    }

    ctx.fillStyle = COLOR_PLAYER;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#2266CC';
    ctx.fillRect(player.x + 2, player.y + 2, player.width - 4, 12);

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
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HP', 10, 8);

    const barW = 200;
    const barH = 16;
    const barX = 10;
    const barY = 12;
    const healthRatio = Math.max(0, player.health / player.maxHealth);

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    const r = Math.floor(255 * (1 - healthRatio));
    const g = Math.floor(200 * healthRatio);
    ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
    ctx.fillRect(barX, barY, barW * healthRatio, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Score: ' + score, CANVAS_WIDTH - 10, 26);
    ctx.textAlign = 'left';
}
