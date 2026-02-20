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

        // Occasionally spawn pairs after 45s
        if (elapsedTime > 45 && Math.random() < 0.2) {
            const type2 = pickEnemyType();
            const pos2 = getSpawnPosition(type2);
            enemies.push(createEnemy(pos2.x, pos2.y, type2));
        }

        spawnTimer = getCurrentInterval();
    }
}

function pickEnemyType() {
    const roll = Math.random();
    // Smooth ramp: tank chance grows from 0% at 45s to ~20% by 120s
    const tankChance = Math.min(0.20, Math.max(0, (elapsedTime - 45) * 0.003));
    // Flyer chance grows from 0% at 20s to ~30% by 90s
    const flyerChance = Math.min(0.30, Math.max(0, (elapsedTime - 20) * 0.004));

    if (roll < tankChance) return 'tank';
    if (roll < tankChance + flyerChance) return 'flyer';
    return 'runner';
}

function getCurrentInterval() {
    // Smoother curve: fast early ramp, slower late-game squeeze
    const base = INITIAL_SPAWN_INTERVAL - (elapsedTime * SPAWN_ACCELERATION);
    // Additional tightening after 60s (but diminishing)
    const lateBonus = elapsedTime > 60 ? (elapsedTime - 60) * 0.005 : 0;
    return Math.max(MIN_SPAWN_INTERVAL, base - lateBonus);
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

    // 30% chance to spawn from a platform edge (runners only)
    if (type === 'runner' && Math.random() < 0.3) {
        const plat = PLATFORMS[1 + Math.floor(Math.random() * (PLATFORMS.length - 1))];
        const x = side === -1 ? plat.x - w : plat.x + plat.width;
        const y = plat.y - h;
        return { x, y };
    }

    const x = side === -1 ? -w : CANVAS_WIDTH;
    const groundY = PLATFORMS[0].y;
    const y = groundY - h;
    return { x, y };
}
