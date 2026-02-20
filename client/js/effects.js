const particles = [];
const popups = [];
let shakeTimer = 0;
let shakeIntensity = 0;

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

export function updateEffects(dt) {
    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt; // particle gravity
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Popups
    for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y -= 60 * dt; // float up
        p.life -= dt;
        if (p.life <= 0) popups.splice(i, 1);
    }

    // Shake
    if (shakeTimer > 0) {
        shakeTimer -= dt;
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
}

export function resetEffects() {
    particles.length = 0;
    popups.length = 0;
    shakeTimer = 0;
    shakeIntensity = 0;
}
