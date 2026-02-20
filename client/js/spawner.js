import {
    INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, SPAWN_ACCELERATION,
    CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_WIDTH, ENEMY_HEIGHT,
    FLYER_WIDTH, FLYER_HEIGHT, PLATFORMS
} from './constants.js';
import { createEnemy } from './enemy.js';

let spawnTimer;
let elapsedTime;

export function resetSpawner() {
    spawnTimer = INITIAL_SPAWN_INTERVAL;
    elapsedTime = 0;
}

export function updateSpawner(dt, enemies) {
    elapsedTime += dt;
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
        // After 30s, 30% chance to spawn a flyer
        const spawnFlyer = elapsedTime > 30 && Math.random() < 0.3;
        const type = spawnFlyer ? 'flyer' : 'runner';
        const pos = getSpawnPosition(type);
        enemies.push(createEnemy(pos.x, pos.y, type));
        spawnTimer = getCurrentInterval();
    }
}

function getCurrentInterval() {
    return Math.max(MIN_SPAWN_INTERVAL, INITIAL_SPAWN_INTERVAL - (elapsedTime * SPAWN_ACCELERATION));
}

function getSpawnPosition(type) {
    const side = Math.random() < 0.5 ? -1 : 1;

    if (type === 'flyer') {
        const x = side === -1 ? -FLYER_WIDTH : CANVAS_WIDTH;
        const y = 50 + Math.random() * (CANVAS_HEIGHT * 0.5);
        return { x, y };
    }

    const x = side === -1 ? -ENEMY_WIDTH : CANVAS_WIDTH;
    const groundY = PLATFORMS[0].y;
    const y = groundY - ENEMY_HEIGHT;
    return { x, y };
}
