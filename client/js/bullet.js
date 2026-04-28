import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_MODE } from './constants.js';

const BUFFER = 50;

export function moveBullets(bullets, dt, mode, camera) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (mode === GAME_MODE.ADVENTURE || mode === GAME_MODE.STORY) {
            // Adventure: despawn bullets off-camera
            if (b.x < camera.x - BUFFER || b.x > camera.x + CANVAS_WIDTH + BUFFER ||
                b.y < camera.y - BUFFER || b.y > camera.y + CANVAS_HEIGHT + BUFFER) {
                bullets.splice(i, 1);
            }
        } else {
            // Arena: horizontal screen wrapping
            if (b.x < -BUFFER) b.x += CANVAS_WIDTH + BUFFER * 2;
            else if (b.x > CANVAS_WIDTH + BUFFER) b.x -= CANVAS_WIDTH + BUFFER * 2;

            // Remove if off-screen vertically
            if (b.y < -BUFFER || b.y > CANVAS_HEIGHT + BUFFER) {
                bullets.splice(i, 1);
            }
        }
    }
}
