import { initGame } from './game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

initGame();

function scaleCanvas() {
    const container = document.getElementById('game-container');
    const scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    container.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

scaleCanvas();
window.addEventListener('resize', scaleCanvas);

// Click anywhere to enter true fullscreen on first user gesture
document.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
    }
}, { once: true });
