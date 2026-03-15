import {
    INITIAL_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, SPAWN_ACCELERATION,
    CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_WIDTH, ENEMY_HEIGHT,
    FLYER_WIDTH, FLYER_HEIGHT, TANK_WIDTH, TANK_HEIGHT, PLATFORMS,
    GAME_MODE
} from './constants.js';
import { createEnemy } from './enemy.js';

let spawnTimer;
let elapsedTime;

export function resetSpawner() {
    spawnTimer = INITIAL_SPAWN_INTERVAL;
    elapsedTime = 0;
}

export function updateSpawner(dt, enemies, mode, camera, adventurePlatforms) {
    elapsedTime += dt;
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
        const type = pickEnemyType();
        const pos = mode === GAME_MODE.ADVENTURE
            ? getAdventureSpawnPosition(type, camera, adventurePlatforms)
            : getSpawnPosition(type);
        enemies.push(createEnemy(pos.x, pos.y, type));

        // Occasionally spawn pairs after 45s
        if (elapsedTime > 45 && Math.random() < 0.2) {
            const type2 = pickEnemyType();
            const pos2 = mode === GAME_MODE.ADVENTURE
                ? getAdventureSpawnPosition(type2, camera, adventurePlatforms)
                : getSpawnPosition(type2);
            enemies.push(createEnemy(pos2.x, pos2.y, type2));
        }

        spawnTimer = getCurrentInterval();
    }
}

function pickEnemyType() {
    const roll = Math.random();
    const tankChance = Math.min(0.20, Math.max(0, (elapsedTime - 45) * 0.003));
    const flyerChance = Math.min(0.30, Math.max(0, (elapsedTime - 20) * 0.004));

    if (roll < tankChance) return 'tank';
    if (roll < tankChance + flyerChance) return 'flyer';
    return 'runner';
}

function getCurrentInterval() {
    const base = INITIAL_SPAWN_INTERVAL - (elapsedTime * SPAWN_ACCELERATION);
    const lateBonus = elapsedTime > 60 ? (elapsedTime - 60) * 0.005 : 0;
    return Math.max(MIN_SPAWN_INTERVAL, base - lateBonus);
}

// Arena mode spawn positions (original)
function getSpawnPosition(type) {
    const side = Math.random() < 0.5 ? -1 : 1;

    if (type === 'flyer') {
        const x = side === -1 ? -FLYER_WIDTH : CANVAS_WIDTH;
        const y = 50 + Math.random() * (CANVAS_HEIGHT * 0.5);
        return { x, y };
    }

    const w = type === 'tank' ? TANK_WIDTH : ENEMY_WIDTH;
    const h = type === 'tank' ? TANK_HEIGHT : ENEMY_HEIGHT;

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

// Adventure mode spawn positions — spawn ahead of camera, some behind
function getAdventureSpawnPosition(type, camera, platforms) {
    // 80% ahead, 20% behind
    const ahead = Math.random() < 0.8;
    const w = type === 'tank' ? TANK_WIDTH : type === 'flyer' ? FLYER_WIDTH : ENEMY_WIDTH;
    const h = type === 'tank' ? TANK_HEIGHT : type === 'flyer' ? FLYER_HEIGHT : ENEMY_HEIGHT;

    if (type === 'flyer') {
        const x = ahead
            ? camera.x + CANVAS_WIDTH + Math.random() * CANVAS_WIDTH * 0.5
            : camera.x - w - Math.random() * 100;
        const y = camera.y + 50 + Math.random() * (CANVAS_HEIGHT * 0.5);
        return { x, y };
    }

    // Ground enemies: find a valid y from nearby platforms
    const spawnX = ahead
        ? camera.x + CANVAS_WIDTH + Math.random() * CANVAS_WIDTH * 0.5
        : camera.x - w - Math.random() * 100;

    // Find the ground platform y (default 556 which is the standard ground)
    let groundY = 556;
    if (platforms && platforms.length > 0) {
        // Find ground/floor platforms near spawnX
        for (const p of platforms) {
            if (p.width >= 500 && Math.abs(p.x + p.width / 2 - spawnX) < p.width) {
                groundY = p.y;
                break;
            }
        }
    }

    // 30% chance for runner to spawn on a floating platform
    if (type === 'runner' && Math.random() < 0.3 && platforms) {
        const nearby = platforms.filter(p =>
            p.width < 500 && p.x < spawnX + 200 && p.x + p.width > spawnX - 200
        );
        if (nearby.length > 0) {
            const plat = nearby[Math.floor(Math.random() * nearby.length)];
            return { x: plat.x + Math.random() * (plat.width - w), y: plat.y - h };
        }
    }

    return { x: spawnX, y: groundY - h };
}
