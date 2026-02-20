import {
    INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, SPAWN_ACCELERATION,
    CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_WIDTH, ENEMY_HEIGHT,
    FLYER_WIDTH, FLYER_HEIGHT, TANK_WIDTH, TANK_HEIGHT, PLATFORMS
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
        const type = pickEnemyType();
        const pos = getSpawnPosition(type);
        enemies.push(createEnemy(pos.x, pos.y, type));
        spawnTimer = getCurrentInterval();
    }
}

function pickEnemyType() {
    const roll = Math.random();
    if (elapsedTime > 60 && roll < 0.15) return 'tank';
    if (elapsedTime > 30 && roll < 0.35) return 'flyer';
    return 'runner';
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

    const w = type === 'tank' ? TANK_WIDTH : ENEMY_WIDTH;
    const h = type === 'tank' ? TANK_HEIGHT : ENEMY_HEIGHT;
    const x = side === -1 ? -w : CANVAS_WIDTH;
    const groundY = PLATFORMS[0].y;
    const y = groundY - h;
    return { x, y };
}
