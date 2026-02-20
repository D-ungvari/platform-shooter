import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

const BUFFER = 50;

export function moveBullets(bullets, dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Remove if off-screen
        if (b.x < -BUFFER || b.x > CANVAS_WIDTH + BUFFER ||
            b.y < -BUFFER || b.y > CANVAS_HEIGHT + BUFFER) {
            bullets.splice(i, 1);
        }
    }
}
