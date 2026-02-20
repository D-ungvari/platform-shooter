import {
    ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SPEED,
    ENEMY_HEALTH, ENEMY_CONTACT_DAMAGE, ENEMY_SCORE_VALUE,
    FLYER_WIDTH, FLYER_HEIGHT, FLYER_SPEED,
    FLYER_HEALTH, FLYER_CONTACT_DAMAGE, FLYER_SCORE_VALUE,
    TANK_WIDTH, TANK_HEIGHT, TANK_SPEED,
    TANK_HEALTH, TANK_CONTACT_DAMAGE, TANK_SCORE_VALUE,
    JUMP_FORCE
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

export function updateEnemies(enemies, player, dt) {
    const playerCx = player.x + player.width / 2;
    const playerCy = player.y + player.height / 2;

    for (const enemy of enemies) {
        const enemyCx = enemy.x + enemy.width / 2;
        const enemyCy = enemy.y + enemy.height / 2;

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
            // Runner and Tank: walk toward player
            if (playerCx < enemyCx) {
                enemy.vx = -enemy.speed;
            } else {
                enemy.vx = enemy.speed;
            }

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
            resolvePlatformCollisions(enemy);
        }
    }
}
