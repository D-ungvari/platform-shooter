import { CANVAS_WIDTH } from './constants.js';

const particles = [];
const popups = [];
const pickups = [];
let shakeTimer = 0;
let shakeIntensity = 0;
let announcement = null;

export function spawnKillParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 200;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.4 + Math.random() * 0.3,
            maxLife: 0.4 + Math.random() * 0.3,
            size: 2 + Math.random() * 3,
            color,
        });
    }
}

export function spawnScorePopup(x, y, text) {
    popups.push({
        x, y,
        text: '+' + text,
        life: 0.8,
        maxLife: 0.8,
    });
}

export function spawnPickup(x, y, type) {
    pickups.push({
        x: x - 8,
        y,
        width: 16,
        height: 16,
        type,
        healAmount: type === 'health' ? 20 : 0,
        life: 6.0,
        vy: -100,
    });
}

export function spawnLandingDust(x, y) {
    for (let i = 0; i < 4; i++) {
        const dir = i < 2 ? -1 : 1;
        particles.push({
            x, y,
            vx: dir * (30 + Math.random() * 50),
            vy: -(10 + Math.random() * 20),
            life: 0.2 + Math.random() * 0.15,
            maxLife: 0.3,
            size: 2 + Math.random() * 2,
            color: '#888888',
        });
    }
}

export function spawnHealthPickup(x, y) { spawnPickup(x, y, 'health'); }

export function getPickups() { return pickups; }
export function removePickup(index) { pickups.splice(index, 1); }

export function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeTimer = duration;
}

export function getShakeOffset() {
    if (shakeTimer <= 0) return { x: 0, y: 0 };
    return {
        x: (Math.random() - 0.5) * shakeIntensity * 2,
        y: (Math.random() - 0.5) * shakeIntensity * 2,
    };
}

export function showAnnouncement(text) {
    announcement = { text, life: 2.0, maxLife: 2.0 };
}

export function updateEffects(dt, platforms) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y -= 60 * dt;
        p.life -= dt;
        if (p.life <= 0) popups.splice(i, 1);
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.vy += 600 * dt;
        p.y += p.vy * dt;
        // Find nearest platform below the pickup
        let landY = 540;
        if (platforms) {
            for (const plat of platforms) {
                if (p.x + p.width > plat.x && p.x < plat.x + plat.width) {
                    const platTop = plat.y - p.height;
                    if (platTop >= p.y - 2 && platTop < landY) {
                        landY = platTop;
                    }
                }
            }
        }
        if (p.y > landY) { p.y = landY; p.vy = 0; }
        p.life -= dt;
        if (p.life <= 0) pickups.splice(i, 1);
    }

    if (shakeTimer > 0) shakeTimer -= dt;

    if (announcement) {
        announcement.life -= dt;
        if (announcement.life <= 0) announcement = null;
    }
}

const PICKUP_COLORS = {
    health: '#44FF44',
    shotgun: '#FF8844',
    rapid: '#44DDFF',
    speed: '#FFFF44',
    superJump: '#44FF88',
    doubleShot: '#FF44FF',
    shield: '#88BBFF',
    giant: '#FF8844',
};

const PICKUP_ICONS = {
    health: '+',
    shotgun: 'S',
    rapid: 'R',
    speed: '>>',
    superJump: '^',
    doubleShot: '2x',
    shield: 'O',
    giant: '*',
};

// World-space effects: particles, pickups, score popups (rendered inside camera transform)
export function renderWorldEffects(ctx) {
    // Particles
    for (const p of particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    // Pickups
    for (const p of pickups) {
        const pulse = 0.8 + Math.sin(p.life * 8) * 0.2;
        ctx.globalAlpha = Math.min(p.life, 1.0);
        const color = PICKUP_COLORS[p.type] || '#ffffff';
        ctx.fillStyle = color;
        const s = p.width * pulse;
        const offset = (p.width - s) / 2;
        ctx.fillRect(p.x + offset, p.y + offset, s, s);

        // Icon
        ctx.fillStyle = '#ffffff';
        if (p.type === 'health') {
            ctx.fillRect(p.x + 6, p.y + 3, 4, 10);
            ctx.fillRect(p.x + 3, p.y + 6, 10, 4);
        } else {
            const icon = PICKUP_ICONS[p.type] || '?';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(icon, p.x + 8, p.y + 12);
            ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1.0;
    }

    // Score popups
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    for (const p of popups) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = '#FFFF00';
        ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'left';
}

// Screen-space effects: announcements (rendered outside camera transform)
export function renderScreenEffects(ctx) {
    if (announcement) {
        ctx.globalAlpha = Math.min(announcement.life, 1.0);
        ctx.fillStyle = '#FFFF00';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(announcement.text, CANVAS_WIDTH / 2, 80);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1.0;
    }
}

export function resetEffects() {
    particles.length = 0;
    popups.length = 0;
    pickups.length = 0;
    shakeTimer = 0;
    shakeIntensity = 0;
    announcement = null;
}
