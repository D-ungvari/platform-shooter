import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    FIREBALL_GRAVITY, FIREBALL_BOUNCE, FIREBALL_MAX_BOUNCES, FIREBALL_LIFE
} from './constants.js';
import { collides } from './physics.js';

const BUFFER = 50;

export function moveBullets(bullets, dt, mode, camera, platforms) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        // Fireballs have gravity + bounce on platforms
        if (b.kind === 'fireball') {
            b.vy += FIREBALL_GRAVITY * dt;
            b.life -= dt;

            const nx = b.x + b.vx * dt;
            const ny = b.y + b.vy * dt;

            // Platform collision check (for ground bounce + wall kill)
            let hitGround = false;
            let hitWall = false;
            const r = b.radius;
            const box = { x: nx - r, y: ny - r, width: r * 2, height: r * 2 };
            if (platforms) {
                for (const plat of platforms) {
                    if (plat.crumbleState === 'broken') continue;
                    if (!collides(box, plat)) continue;
                    // Determine side of impact
                    const prevBox = { x: b.x - r, y: b.y - r, width: r * 2, height: r * 2 };
                    const wasAbove = (b.y + r) <= plat.y + 1;
                    const wasBelow = (b.y - r) >= plat.y + plat.height - 1;
                    if (wasAbove && b.vy >= 0) {
                        b.y = plat.y - r;
                        b.vy = -Math.abs(b.vy) * FIREBALL_BOUNCE;
                        hitGround = true;
                    } else if (wasBelow && b.vy < 0) {
                        b.vy = 0;
                        hitWall = true;
                    } else {
                        hitWall = true;
                    }
                    break;
                }
            }

            if (hitWall) {
                bullets.splice(i, 1);
                continue;
            }
            if (hitGround) {
                b.bounces++;
                b.x += b.vx * dt;
                if (b.bounces > FIREBALL_MAX_BOUNCES) {
                    bullets.splice(i, 1);
                    continue;
                }
            } else {
                b.x = nx;
                b.y = ny;
            }

            if (b.life <= 0 ||
                b.x < camera.x - BUFFER || b.x > camera.x + CANVAS_WIDTH + BUFFER ||
                b.y > camera.y + CANVAS_HEIGHT + BUFFER) {
                bullets.splice(i, 1);
            }
            continue;
        }

        // Default straight-line bullet (legacy)
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < camera.x - BUFFER || b.x > camera.x + CANVAS_WIDTH + BUFFER ||
            b.y < camera.y - BUFFER || b.y > camera.y + CANVAS_HEIGHT + BUFFER) {
            bullets.splice(i, 1);
        }
    }
}
