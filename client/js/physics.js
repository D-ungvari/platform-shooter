import { GRAVITY, PLATFORMS, JUMP_FORCE, BOUNCE_FORCE_MULT } from './constants.js';

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

export function resolvePlatformCollisions(entity, platforms) {
    const plats = platforms || PLATFORMS;
    entity.grounded = false;
    entity.ridingPlatform = null;
    entity.headBonk = null;

    for (const plat of plats) {
        // Skip broken crumbling platforms
        if (plat.crumbleState === 'broken') continue;

        if (!collides(entity, plat)) continue;

        const overlapLeft = (entity.x + entity.width) - plat.x;
        const overlapRight = (plat.x + plat.width) - entity.x;
        const overlapTop = (entity.y + entity.height) - plat.y;
        const overlapBottom = (plat.y + plat.height) - entity.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapY < minOverlapX) {
            if (overlapTop < overlapBottom) {
                // Landing on top
                if (entity.vy >= 0) {
                    entity.y = plat.y - entity.height;
                    if (plat.type === 'bounce') {
                        entity.vy = -JUMP_FORCE * BOUNCE_FORCE_MULT;
                        entity.grounded = false;
                        entity.bouncedThisFrame = true;
                    } else {
                        entity.vy = 0;
                        entity.grounded = true;
                        if (plat.type === 'moving') {
                            entity.ridingPlatform = plat;
                        }
                    }
                }
            } else {
                // Hitting from below
                if (entity.vy < 0) {
                    entity.y = plat.y + plat.height;
                    entity.vy = 0;
                    entity.headBonk = plat;
                }
            }
        } else {
            if (overlapLeft < overlapRight) {
                entity.x = plat.x - entity.width;
            } else {
                entity.x = plat.x + plat.width;
            }
            entity.vx = 0;
        }
    }
}

// Check if entity's head hit a destructible block from below
export function checkBlockCollisions(entity, blocks) {
    const hitBlocks = [];
    for (const block of blocks) {
        if (block.broken) continue;
        if (!collides(entity, block)) continue;

        const overlapTop = (entity.y + entity.height) - block.y;
        const overlapBottom = (block.y + block.height) - entity.y;

        // Hit from below: entity head enters block bottom
        if (overlapBottom < overlapTop && entity.vy < 0) {
            entity.y = block.y + block.height;
            entity.vy = 0;
            hitBlocks.push(block);
        }
    }
    return hitBlocks;
}
