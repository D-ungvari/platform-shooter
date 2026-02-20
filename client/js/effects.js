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

export function spawnHealthPickup(x, y) {
    pickups.push({
        x: x - 8,
        y,
        width: 16,
        height: 16,
        healAmount: 20,
        life: 5.0, // despawn after 5 seconds
        vy: -100,  // pop up then fall
    });
}

export function getPickups() {
    return pickups;
}

export function removePickup(index) {
    pickups.splice(index, 1);
}

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

export function updateEffects(dt) {
    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Popups
    for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y -= 60 * dt;
        p.life -= dt;
        if (p.life <= 0) popups.splice(i, 1);
    }

    // Pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.vy += 600 * dt; // gravity
        p.y += p.vy * dt;
        // Stop at ground (simple floor check at y=540)
        if (p.y > 540) {
            p.y = 540;
            p.vy = 0;
        }
        p.life -= dt;
        if (p.life <= 0) pickups.splice(i, 1);
    }

    // Shake
    if (shakeTimer > 0) {
        shakeTimer -= dt;
    }

    // Announcement
    if (announcement) {
        announcement.life -= dt;
        if (announcement.life <= 0) announcement = null;
    }
}

export function renderEffects(ctx) {
    // Particles
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    // Health pickups
    for (const p of pickups) {
        const pulse = 0.8 + Math.sin(p.life * 8) * 0.2;
        ctx.globalAlpha = Math.min(p.life, 1.0);
        ctx.fillStyle = '#44FF44';
        const s = p.width * pulse;
        const offset = (p.width - s) / 2;
        ctx.fillRect(p.x + offset, p.y + offset, s, s);
        // Cross symbol
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x + 6, p.y + 3, 4, 10);
        ctx.fillRect(p.x + 3, p.y + 6, 10, 4);
        ctx.globalAlpha = 1.0;
    }

    // Score popups
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    for (const p of popups) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFFF00';
        ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'left';

    // Announcement
    if (announcement) {
        const alpha = Math.min(announcement.life, 1.0);
        ctx.globalAlpha = alpha;
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
