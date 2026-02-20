import { GRAVITY, PLATFORMS } from './constants.js';

export function collides(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

export function applyGravity(entity, dt) {
    if (!entity.grounded) {
        entity.vy += GRAVITY * dt;
    }
}

export function resolvePlatformCollisions(entity) {
    entity.grounded = false;

    for (const plat of PLATFORMS) {
        if (!collides(entity, plat)) continue;

        const overlapLeft = (entity.x + entity.width) - plat.x;
        const overlapRight = (plat.x + plat.width) - entity.x;
        const overlapTop = (entity.y + entity.height) - plat.y;
        const overlapBottom = (plat.y + plat.height) - entity.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapY < minOverlapX) {
            // Resolve vertically
            if (overlapTop < overlapBottom) {
                // Landing on top
                if (entity.vy >= 0) {
                    entity.y = plat.y - entity.height;
                    entity.vy = 0;
                    entity.grounded = true;
                }
            } else {
                // Hitting from below
                if (entity.vy < 0) {
                    entity.y = plat.y + plat.height;
                    entity.vy = 0;
                }
            }
        } else {
            // Resolve horizontally
            if (overlapLeft < overlapRight) {
                entity.x = plat.x - entity.width;
            } else {
                entity.x = plat.x + plat.width;
            }
            entity.vx = 0;
        }
    }
}
