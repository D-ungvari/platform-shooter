import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

const BUFFER = 50;

export function moveBullets(bullets, dt, mode, camera) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < camera.x - BUFFER || b.x > camera.x + CANVAS_WIDTH + BUFFER ||
            b.y < camera.y - BUFFER || b.y > camera.y + CANVAS_HEIGHT + BUFFER) {
            bullets.splice(i, 1);
        }
    }
}
