import {
    ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SPEED,
    ENEMY_HEALTH, ENEMY_CONTACT_DAMAGE, ENEMY_SCORE_VALUE
} from './constants.js';
import { applyGravity, resolvePlatformCollisions } from './physics.js';

export function createEnemy(x, y) {
    return {
        x,
        y,
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        vx: 0,
        vy: 0,
        health: ENEMY_HEALTH,
        speed: ENEMY_SPEED,
        damage: ENEMY_CONTACT_DAMAGE,
        scoreValue: ENEMY_SCORE_VALUE,
        grounded: false,
    };
}

export function updateEnemies(enemies, player, dt) {
    for (const enemy of enemies) {
        // Move toward player
        const playerCx = player.x + player.width / 2;
        const enemyCx = enemy.x + enemy.width / 2;
        if (playerCx < enemyCx) {
            enemy.vx = -enemy.speed;
        } else {
            enemy.vx = enemy.speed;
        }

        applyGravity(enemy, dt);

        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;

        resolvePlatformCollisions(enemy);
    }
}
