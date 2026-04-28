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

export function spawnCoinSparkle(x, y) {
    for (let i = 0; i < 6; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const speed = 100 + Math.random() * 80;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 50,
            life: 0.4 + Math.random() * 0.2,
            maxLife: 0.5,
            size: 2 + Math.random() * 2,
            color: '#FFE890',
        });
    }
}

export function spawnSquishParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
        const angle = (Math.random() - 0.5) * Math.PI;
        const speed = 60 + Math.random() * 80;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
            vy: -Math.abs(Math.sin(angle)) * speed - 50,
            life: 0.3 + Math.random() * 0.15,
            maxLife: 0.4,
            size: 2 + Math.random() * 2,
            color,
        });
    }
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
    health: '#E8281C',
    oneup: '#00A800',
    shotgun: '#FF8844',
    rapid: '#FF6020',
    speed: '#FFFF44',
    superJump: '#44FF88',
    doubleShot: '#FF44FF',
    shield: '#F8B800',
    giant: '#F8B800',
};

const PICKUP_ICONS = {
    health: '+',
    oneup: '1UP',
    shotgun: 'S',
    rapid: 'F',
    speed: '>>',
    superJump: '^',
    doubleShot: '2x',
    shield: '*',
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

    // Pickups (Mario-style icons)
    for (const p of pickups) {
        ctx.globalAlpha = Math.min(p.life, 1.0);
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        if (p.type === 'health') {
            drawMushroom(ctx, p.x, p.y, '#E8281C', '#FFFFFF');
        } else if (p.type === 'oneup') {
            drawMushroom(ctx, p.x, p.y, '#00A800', '#FFFFFF');
        } else if (p.type === 'rapid') {
            drawFireFlower(ctx, p.x, p.y);
        } else if (p.type === 'shield' || p.type === 'giant') {
            drawSuperStar(ctx, p.x, p.y);
        } else {
            // Generic pulse box
            const pulse = 0.8 + Math.sin(p.life * 8) * 0.2;
            ctx.fillStyle = PICKUP_COLORS[p.type] || '#ffffff';
            const s = p.width * pulse;
            const off = (p.width - s) / 2;
            ctx.fillRect(p.x + off, p.y + off, s, s);
            ctx.fillStyle = '#ffffff';
            const icon = PICKUP_ICONS[p.type] || '?';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(icon, cx, cy + 4);
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

function drawMushroom(ctx, x, y, capColor, spotColor) {
    // Cap
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // Spots
    ctx.fillStyle = spotColor;
    ctx.fillRect(x + 3, y + 4, 3, 3);
    ctx.fillRect(x + 10, y + 4, 3, 3);
    ctx.fillRect(x + 7, y + 1, 2, 2);
    // Cap rim shadow
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y + 8, 16, 1);
    // Stem
    ctx.fillStyle = '#FFE890';
    ctx.fillRect(x + 4, y + 9, 8, 6);
    ctx.fillStyle = '#A88800';
    ctx.fillRect(x + 4, y + 14, 8, 1);
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 5, y + 11, 2, 2);
    ctx.fillRect(x + 9, y + 11, 2, 2);
}

function drawFireFlower(ctx, x, y) {
    // Petals (red)
    ctx.fillStyle = '#E8281C';
    ctx.fillRect(x + 3, y + 2, 10, 4);
    ctx.fillRect(x + 1, y + 4, 14, 4);
    ctx.fillRect(x + 3, y + 8, 10, 2);
    // Center (yellow)
    ctx.fillStyle = '#F8B800';
    ctx.fillRect(x + 5, y + 4, 6, 4);
    ctx.fillStyle = '#FFE890';
    ctx.fillRect(x + 6, y + 5, 2, 2);
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 4, y + 5, 1, 2);
    ctx.fillRect(x + 11, y + 5, 1, 2);
    // Stem
    ctx.fillStyle = '#00A800';
    ctx.fillRect(x + 7, y + 10, 2, 6);
    // Leaf
    ctx.fillStyle = '#80F800';
    ctx.fillRect(x + 9, y + 12, 4, 2);
}

function drawSuperStar(ctx, x, y) {
    // Yellow star w/ face
    ctx.fillStyle = '#F8B800';
    ctx.beginPath();
    const cx = x + 8, cy = y + 8;
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 8 : 4;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#FFE890';
    ctx.fillRect(cx - 4, cy - 6, 3, 3);
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 3, cy - 1, 2, 3);
    ctx.fillRect(cx + 1, cy - 1, 2, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 3, cy, 1, 2);
    ctx.fillRect(cx + 2, cy, 1, 2);
    // Smile
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 2, cy + 3, 4, 1);
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
