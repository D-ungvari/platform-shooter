let audioCtx = null;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playTone(freq, duration, type = 'square', volume = 0.15) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, volume = 0.1) {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
}

export function playShoot() {
    playNoise(0.05, 0.08);
    playTone(800, 0.06, 'square', 0.08);
}

export function playEnemyDeath() {
    playTone(300, 0.1, 'square', 0.12);
    playTone(200, 0.15, 'sawtooth', 0.08);
}

export function playPlayerHit() {
    playTone(150, 0.2, 'sawtooth', 0.15);
    playNoise(0.15, 0.12);
}

export function playJump() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
}

export function playPickup() {
    playTone(600, 0.06, 'sine', 0.1);
    setTimeout(() => playTone(800, 0.08, 'sine', 0.1), 60);
}

export function playPowerUp() {
    playTone(600, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(900, 0.1, 'sine', 0.1), 80);
}

export function playShieldHit() {
    playTone(1200, 0.08, 'triangle', 0.1);
    playNoise(0.05, 0.06);
}

export function playBlockBreak() {
    playTone(200, 0.1, 'square', 0.1);
    playNoise(0.1, 0.08);
}

export function playBounce() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
}

export function playCrumble() {
    playTone(80, 0.3, 'sawtooth', 0.06);
}

export function playCheckpoint() {
    playTone(400, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(600, 0.1, 'sine', 0.08), 100);
    setTimeout(() => playTone(800, 0.12, 'sine', 0.08), 200);
}

export function playStomp() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

export function playCoin() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(988, ctx.currentTime);
    osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}

export function playBumpBlock() {
    playTone(140, 0.06, 'square', 0.1);
    playTone(80, 0.12, 'sawtooth', 0.06);
}

export function playFlag() {
    const ctx = getCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
        setTimeout(() => playTone(n, 0.09, 'square', 0.1), i * 50);
    });
}

export function playCourseClear() {
    const ctx = getCtx();
    // Course-clear arpeggio (mario-style)
    const melody = [
        [523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.18],
        [784, 0.12], [831, 0.12], [988, 0.12], [1319, 0.4],
    ];
    let t = 0;
    for (const [freq, dur] of melody) {
        setTimeout(() => playTone(freq, dur, 'square', 0.1), t * 1000);
        t += dur * 0.85;
    }
}

export function playOneUp() {
    const notes = [659, 784, 1047, 1319, 1568];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.08, 'square', 0.09), i * 60));
}

export function playPlayerDeath() {
    playNoise(0.3, 0.2);
    playTone(200, 0.3, 'sawtooth', 0.15);
    setTimeout(() => playTone(100, 0.4, 'square', 0.12), 100);
    setTimeout(() => playTone(60, 0.5, 'sawtooth', 0.1), 250);
}
