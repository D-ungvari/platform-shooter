import {
    ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SPEED,
    ENEMY_HEALTH, ENEMY_CONTACT_DAMAGE, ENEMY_SCORE_VALUE,
    FLYER_WIDTH, FLYER_HEIGHT, FLYER_SPEED,
    FLYER_HEALTH, FLYER_CONTACT_DAMAGE, FLYER_SCORE_VALUE
} from './constants.js';
import { applyGravity, resolvePlatformCollisions } from './physics.js';

export function createEnemy(x, y, type = 'runner') {
    if (type === 'flyer') {
        return {
            x, y,
            width: FLYER_WIDTH,
            height: FLYER_HEIGHT,
            vx: 0,
            vy: 0,
            health: FLYER_HEALTH,
            speed: FLYER_SPEED,
            damage: FLYER_CONTACT_DAMAGE,
            scoreValue: FLYER_SCORE_VALUE,
            grounded: false,
            type: 'flyer',
        };
    }
    return {
        x, y,
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        vx: 0,
        vy: 0,
        health: ENEMY_HEALTH,
        speed: ENEMY_SPEED,
        damage: ENEMY_CONTACT_DAMAGE,
        scoreValue: ENEMY_SCORE_VALUE,
        grounded: false,
        type: 'runner',
    };
}

export function updateEnemies(enemies, player, dt) {
    const playerCx = player.x + player.width / 2;
    const playerCy = player.y + player.height / 2;

    for (const enemy of enemies) {
        const enemyCx = enemy.x + enemy.width / 2;

        if (enemy.type === 'flyer') {
            // Fly toward player diagonally
            const dx = playerCx - enemyCx;
            const dy = playerCy - (enemy.y + enemy.height / 2);
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                enemy.vx = (dx / len) * enemy.speed;
                enemy.vy = (dy / len) * enemy.speed;
            }
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
        } else {
            // Runner: walk toward player horizontally
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
}
