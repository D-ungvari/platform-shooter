import {
    INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, SPAWN_ACCELERATION,
    CANVAS_WIDTH, ENEMY_WIDTH, ENEMY_HEIGHT
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
        const pos = getSpawnPosition();
        enemies.push(createEnemy(pos.x, pos.y));
        spawnTimer = getCurrentInterval();
    }
}

function getCurrentInterval() {
    return Math.max(MIN_SPAWN_INTERVAL, INITIAL_SPAWN_INTERVAL - (elapsedTime * SPAWN_ACCELERATION));
}

function getSpawnPosition() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side === -1 ? -ENEMY_WIDTH : CANVAS_WIDTH;
    const y = 556 - ENEMY_HEIGHT; // ground level
    return { x, y };
}
