import { initGame } from './game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

initGame();

// Responsive scaling
function scaleCanvas() {
    const container = document.getElementById('game-container');
    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;
    const scale = Math.min(maxW / CANVAS_WIDTH, maxH / CANVAS_HEIGHT, 1);
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'center center';
}

scaleCanvas();
window.addEventListener('resize', scaleCanvas);
