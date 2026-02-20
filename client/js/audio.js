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

export function playPlayerDeath() {
    playNoise(0.3, 0.2);
    playTone(200, 0.3, 'sawtooth', 0.15);
    setTimeout(() => playTone(100, 0.4, 'square', 0.12), 100);
    setTimeout(() => playTone(60, 0.5, 'sawtooth', 0.1), 250);
}
