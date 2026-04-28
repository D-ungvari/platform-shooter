import {
    ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SPEED,
    ENEMY_HEALTH, ENEMY_CONTACT_DAMAGE, ENEMY_SCORE_VALUE,
    FLYER_WIDTH, FLYER_HEIGHT, FLYER_SPEED,
    FLYER_HEALTH, FLYER_CONTACT_DAMAGE, FLYER_SCORE_VALUE,
    TANK_WIDTH, TANK_HEIGHT, TANK_SPEED,
    TANK_HEALTH, TANK_CONTACT_DAMAGE, TANK_SCORE_VALUE,
    KOOPA_WIDTH, KOOPA_HEIGHT, KOOPA_SPEED,
    KOOPA_HEALTH, KOOPA_CONTACT_DAMAGE, KOOPA_SCORE_VALUE,
    KOOPA_SHELL_SPEED, KOOPA_SHELL_REVIVE,
    PIRANHA_WIDTH, PIRANHA_HEIGHT,
    PIRANHA_HEALTH, PIRANHA_DAMAGE, PIRANHA_SCORE_VALUE,
    PIRANHA_CYCLE, PIRANHA_RISE_TIME,
    JUMP_FORCE, CANVAS_WIDTH, TILE
} from './constants.js';
import { applyGravity, resolvePlatformCollisions } from './physics.js';

const ENEMY_DEFS = {
    runner: {
        width: ENEMY_WIDTH, height: ENEMY_HEIGHT, speed: ENEMY_SPEED,
        health: ENEMY_HEALTH, damage: ENEMY_CONTACT_DAMAGE, scoreValue: ENEMY_SCORE_VALUE,
    },
    flyer: {
        width: FLYER_WIDTH, height: FLYER_HEIGHT, speed: FLYER_SPEED,
        health: FLYER_HEALTH, damage: FLYER_CONTACT_DAMAGE, scoreValue: FLYER_SCORE_VALUE,
    },
    tank: {
        width: TANK_WIDTH, height: TANK_HEIGHT, speed: TANK_SPEED,
        health: TANK_HEALTH, damage: TANK_CONTACT_DAMAGE, scoreValue: TANK_SCORE_VALUE,
    },
    koopa: {
        width: KOOPA_WIDTH, height: KOOPA_HEIGHT, speed: KOOPA_SPEED,
        health: KOOPA_HEALTH, damage: KOOPA_CONTACT_DAMAGE, scoreValue: KOOPA_SCORE_VALUE,
    },
    piranha: {
        width: PIRANHA_WIDTH, height: PIRANHA_HEIGHT, speed: 0,
        health: PIRANHA_HEALTH, damage: PIRANHA_DAMAGE, scoreValue: PIRANHA_SCORE_VALUE,
    },
};

export function createEnemy(x, y, type = 'runner') {
    const def = ENEMY_DEFS[type] || ENEMY_DEFS.runner;
    const e = {
        x, y,
        width: def.width,
        height: def.height,
        vx: 0,
        vy: 0,
        health: def.health,
        maxHealth: def.health,
        speed: def.speed,
        damage: def.damage,
        scoreValue: def.scoreValue,
        grounded: false,
        type,
        jumpCooldown: 0,
    };
    if (type === 'koopa') {
        // Koopa state: 'walk', 'shell' (idle), 'sliding'
        e.shellState = 'walk';
        e.shellTimer = 0;
        e.vx = -def.speed;
    }
    if (type === 'piranha') {
        // Center on pipe (pipe is 2 tiles wide; caller passes left-tile col)
        e.x = x + TILE - PIRANHA_WIDTH / 2;
        e.pipeTopY = y; // top of pipe top tile
        e.targetY = e.pipeTopY - PIRANHA_HEIGHT;
        e.cycleT = Math.random() * PIRANHA_CYCLE;
        e.phase = 'hidden';
        e.y = e.pipeTopY; // start fully hidden behind pipe
    }
    return e;
}

export function updateEnemies(enemies, player, dt, mode, camera, platforms) {
    const playerCx = player.x + player.width / 2;
    const playerCy = player.y + player.height / 2;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const enemyCx = enemy.x + enemy.width / 2;
        const enemyCy = enemy.y + enemy.height / 2;

        if (enemy.type === 'piranha') {
            updatePiranha(enemy, dt, player);
            continue;
        }

        if (enemy.type === 'koopa') {
            updateKoopa(enemy, dt, platforms, player);
            continue;
        }

        if (enemy.type === 'flyer') {
            const dx = playerCx - enemyCx;
            const dy = playerCy - enemyCy;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                enemy.vx = (dx / len) * enemy.speed;
                enemy.vy = (dy / len) * enemy.speed;
            }
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
        } else {
            const dx = playerCx - enemyCx;
            enemy.vx = dx < 0 ? -enemy.speed : enemy.speed;

            if (enemy.jumpCooldown > 0) enemy.jumpCooldown -= dt;
            if (enemy.type === 'runner' && enemy.grounded && enemy.jumpCooldown <= 0) {
                const heightDiff = enemyCy - playerCy;
                if (heightDiff > 80) {
                    enemy.vy = -JUMP_FORCE * 0.85;
                    enemy.grounded = false;
                    enemy.jumpCooldown = 1.5 + Math.random();
                }
            }

            applyGravity(enemy, dt);
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
            resolvePlatformCollisions(enemy, platforms);
        }

        if (!enemy.fromLevel && enemy.x + enemy.width < camera.x - CANVAS_WIDTH * 2) {
            enemies.splice(i, 1);
        }
    }
}

function updateKoopa(enemy, dt, platforms, player) {
    enemy.shellTimer -= dt;

    if (enemy.shellState === 'walk') {
        // Walk back and forth, turn at edges
        const playerDir = (player.x + player.width / 2) > (enemy.x + enemy.width / 2) ? 1 : -1;
        if (Math.abs(enemy.vx) < 5) enemy.vx = -enemy.speed * playerDir;
        applyGravity(enemy, dt);
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        const prevX = enemy.x;
        resolvePlatformCollisions(enemy, platforms);
        if (enemy.vx === 0 && Math.abs(prevX - enemy.x) < 0.1) {
            // Hit a wall — flip
            enemy.vx = -enemy.vx === 0 ? enemy.speed : -enemy.vx;
        }
    } else if (enemy.shellState === 'shell') {
        // Idle shell — sits, gravity applies
        enemy.vx = 0;
        applyGravity(enemy, dt);
        enemy.y += enemy.vy * dt;
        resolvePlatformCollisions(enemy, platforms);
        if (enemy.shellTimer <= 0) {
            // Revive
            enemy.shellState = 'walk';
            enemy.height = 36;
            enemy.vx = -enemy.speed;
        }
    } else if (enemy.shellState === 'sliding') {
        applyGravity(enemy, dt);
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        const prevX = enemy.x;
        resolvePlatformCollisions(enemy, platforms);
        if (Math.abs(prevX - enemy.x) > Math.abs(enemy.vx * dt) - 0.5 && enemy.vx !== 0) {
            // Wall bounce
            enemy.vx = -enemy.vx;
        }
    }
}

function updatePiranha(enemy, dt, player) {
    enemy.cycleT += dt;
    const cycle = PIRANHA_CYCLE;
    const rise = PIRANHA_RISE_TIME;

    // Player nearby? Stay hidden.
    const px = player.x + player.width / 2;
    const dx = Math.abs(px - (enemy.x + enemy.width / 2));
    const playerNear = dx < 48;

    const t = enemy.cycleT % cycle;
    const upStart = 0;
    const upEnd = rise;
    const stayEnd = cycle - rise;
    const downEnd = cycle;

    let progress;
    if (t < upEnd) {
        progress = t / rise; // 0→1
    } else if (t < stayEnd) {
        progress = 1;
    } else {
        progress = 1 - (t - stayEnd) / rise; // 1→0
    }

    if (playerNear && progress < 1) {
        // Force descend
        progress = Math.max(0, progress - dt / rise);
        enemy.cycleT = (1 - progress) * rise + stayEnd;
    }

    enemy.y = enemy.pipeTopY - PIRANHA_HEIGHT * progress;
    enemy.phase = progress > 0.05 ? 'visible' : 'hidden';
}
