import {
    ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SPEED,
    ENEMY_HEALTH, ENEMY_CONTACT_DAMAGE, ENEMY_SCORE_VALUE,
    FLYER_WIDTH, FLYER_HEIGHT, FLYER_SPEED,
    FLYER_HEALTH, FLYER_CONTACT_DAMAGE, FLYER_SCORE_VALUE,
    TANK_WIDTH, TANK_HEIGHT, TANK_SPEED,
    TANK_HEALTH, TANK_CONTACT_DAMAGE, TANK_SCORE_VALUE,
    JUMP_FORCE, CANVAS_WIDTH, GAME_MODE
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
};

export function createEnemy(x, y, type = 'runner') {
    const def = ENEMY_DEFS[type] || ENEMY_DEFS.runner;
    return {
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
}

// Get shortest horizontal direction to player, accounting for screen wrap
function wrapDx(enemyCx, playerCx) {
    let dx = playerCx - enemyCx;
    if (dx > CANVAS_WIDTH / 2) dx -= CANVAS_WIDTH;
    if (dx < -CANVAS_WIDTH / 2) dx += CANVAS_WIDTH;
    return dx;
}

export function updateEnemies(enemies, player, dt, mode, camera, platforms) {
    const playerCx = player.x + player.width / 2;
    const playerCy = player.y + player.height / 2;
    const isAdventure = mode === GAME_MODE.ADVENTURE;
    const isStory = mode === GAME_MODE.STORY;
    const isWorld = isAdventure || isStory;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const enemyCx = enemy.x + enemy.width / 2;
        const enemyCy = enemy.y + enemy.height / 2;

        if (enemy.type === 'flyer') {
            const dx = isWorld ? (playerCx - enemyCx) : wrapDx(enemyCx, playerCx);
            const dy = playerCy - enemyCy;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                enemy.vx = (dx / len) * enemy.speed;
                enemy.vy = (dy / len) * enemy.speed;
            }
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
        } else {
            // Runner and Tank: walk toward player
            const dx = isWorld ? (playerCx - enemyCx) : wrapDx(enemyCx, playerCx);
            enemy.vx = dx < 0 ? -enemy.speed : enemy.speed;

            // Runners jump toward player if player is significantly above
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

        if (isWorld) {
            // World modes: despawn enemies far behind camera
            if (!enemy.fromLevel && enemy.x + enemy.width < camera.x - CANVAS_WIDTH * 2) {
                enemies.splice(i, 1);
            }
        } else {
            // Arena: screen wrapping
            if (enemy.x + enemy.width < -20) enemy.x = CANVAS_WIDTH + 10;
            if (enemy.x > CANVAS_WIDTH + 20) enemy.x = -enemy.width - 10;
        }
    }
}
