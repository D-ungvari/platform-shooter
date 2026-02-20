import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

const BUFFER = 50;

export function moveBullets(bullets, dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Horizontal screen wrapping
        if (b.x < -BUFFER) b.x += CANVAS_WIDTH + BUFFER * 2;
        else if (b.x > CANVAS_WIDTH + BUFFER) b.x -= CANVAS_WIDTH + BUFFER * 2;

        // Remove if off-screen vertically
        if (b.y < -BUFFER || b.y > CANVAS_HEIGHT + BUFFER) {
            bullets.splice(i, 1);
        }
    }
}
