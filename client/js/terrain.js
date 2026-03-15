import { CANVAS_WIDTH, CANVAS_HEIGHT, CHUNK_WIDTH, CRUMBLE_DELAY, CRUMBLE_RESPAWN } from './constants.js';

const MAX_GAP_X = 260;
const MAX_REACH_Y = 130;
const MIN_PLATFORM_W = 100;
const MAX_PLATFORM_W = 250;
const PLATFORM_H = 16;
const GROUND_Y = 556;
const GROUND_H = 20;
const BLOCK_SIZE = 24;

// Seed-based RNG (mulberry32)
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

let terrain = null;

export function createTerrain() {
    terrain = {
        chunks: new Map(),
        seed: Date.now(),
    };
    ensureChunks(0);
    return terrain;
}

export function updateTerrain(cameraX) {
    if (!terrain) return;
    const currentChunk = Math.floor(cameraX / CHUNK_WIDTH);
    ensureChunks(currentChunk);
    cleanupChunks(currentChunk);
}

function ensureChunks(currentChunk) {
    for (let i = currentChunk - 1; i <= currentChunk + 2; i++) {
        if (i < 0) continue;
        if (!terrain.chunks.has(i)) {
            terrain.chunks.set(i, generateChunk(i));
        }
    }
}

function cleanupChunks(currentChunk) {
    for (const [index] of terrain.chunks) {
        if (index < currentChunk - 2) {
            terrain.chunks.delete(index);
        }
    }
}

function generateChunk(index) {
    const rng = mulberry32(terrain.seed + index * 7919);
    const startX = index * CHUNK_WIDTH;
    const platforms = [];
    const blocks = [];

    // Ground platform
    platforms.push({
        x: startX, y: GROUND_Y, width: CHUNK_WIDTH, height: GROUND_H, type: 'ground',
    });

    const difficulty = Math.min(1, Math.max(0, (index - 3) / 15));

    // Rest zone check
    const restInterval = 4 + Math.floor(rng() * 3);
    const isRestZone = index > 0 && index % restInterval === 0;

    if (isRestZone) {
        const platCount = 2 + Math.floor(rng() * 2);
        for (let i = 0; i < platCount; i++) {
            const w = 180 + rng() * 100;
            const x = startX + 200 + i * (CHUNK_WIDTH - 400) / platCount;
            const y = GROUND_Y - 100 - rng() * 80;
            platforms.push({ x, y, width: w, height: PLATFORM_H, type: 'solid' });
        }
        return { index, platforms, blocks };
    }

    // Normal chunk
    const platCount = 4 + Math.floor(rng() * 4 * (0.7 + difficulty * 0.3));
    const minW = MIN_PLATFORM_W - difficulty * 40;
    const maxW = MAX_PLATFORM_W - difficulty * 60;

    let lastX = startX;
    let lastY = GROUND_Y;

    if (index > 0 && terrain.chunks.has(index - 1)) {
        const prevChunk = terrain.chunks.get(index - 1);
        const prevFloating = prevChunk.platforms.filter(p => p.type !== 'ground');
        if (prevFloating.length > 0) {
            const last = prevFloating[prevFloating.length - 1];
            lastX = last.x + last.width;
            lastY = last.y;
        }
    }

    for (let i = 0; i < platCount; i++) {
        const w = minW + rng() * (maxW - minW);
        const gapX = 60 + rng() * (MAX_GAP_X - 60) * (0.5 + difficulty * 0.5);

        let x = lastX + gapX;
        if (x + w > startX + CHUNK_WIDTH - 50) break;

        const minPlatY = Math.max(80, lastY - MAX_REACH_Y);
        const maxPlatY = Math.min(GROUND_Y - 60, lastY + 60);
        let y;
        if (minPlatY >= maxPlatY) {
            y = GROUND_Y - 100 - rng() * 200;
        } else {
            y = minPlatY + rng() * (maxPlatY - minPlatY);
        }
        y = Math.min(y, GROUND_Y - 60);
        y = Math.max(y, 80);

        // Assign special platform types based on difficulty
        let type = 'solid';
        if (index >= 5) {
            const typeRoll = rng();
            if (index >= 15 && typeRoll < 0.08) {
                type = 'moving';
            } else if (index >= 15 && typeRoll < 0.16) {
                type = 'bounce';
            } else if (typeRoll < 0.12 + difficulty * 0.05) {
                type = 'crumbling';
            }
        }

        const plat = {
            x, y,
            width: Math.round(w),
            height: PLATFORM_H,
            type,
        };

        // Add type-specific data
        if (type === 'crumbling') {
            plat.crumbleState = 'idle'; // idle | shaking | broken
            plat.crumbleTimer = 0;
            plat.respawnTimer = 0;
        } else if (type === 'moving') {
            plat.originX = x;
            plat.originY = y;
            plat.moveAxis = rng() < 0.6 ? 'h' : 'v';
            plat.moveRange = 60 + rng() * 60;
            plat.moveSpeed = 1.5 + rng() * 1.5;
            plat.movePhase = rng() * Math.PI * 2;
            plat.prevX = x;
            plat.prevY = y;
        }

        platforms.push(plat);

        // Destructible block above solid platforms (30% chance)
        if (type === 'solid' && rng() < 0.3 && y > 120) {
            const blockX = x + Math.round(w) / 2 - BLOCK_SIZE / 2;
            const blockY = y - 40 - rng() * 20;
            blocks.push({
                x: blockX, y: blockY,
                width: BLOCK_SIZE, height: BLOCK_SIZE,
                type: 'destructible',
                broken: false,
                worldY: blockY, // for drop rarity calculation
            });
        }

        lastX = x;
        lastY = y;
    }

    return { index, platforms, blocks };
}

export function getVisiblePlatforms(cameraX) {
    if (!terrain) return [];
    const currentChunk = Math.floor(cameraX / CHUNK_WIDTH);
    const result = [];
    for (let i = currentChunk - 1; i <= currentChunk + 1; i++) {
        if (terrain.chunks.has(i)) {
            result.push(...terrain.chunks.get(i).platforms);
        }
    }
    return result;
}

export function getVisibleBlocks(cameraX) {
    if (!terrain) return [];
    const currentChunk = Math.floor(cameraX / CHUNK_WIDTH);
    const result = [];
    for (let i = currentChunk - 1; i <= currentChunk + 1; i++) {
        if (terrain.chunks.has(i)) {
            const chunk = terrain.chunks.get(i);
            if (chunk.blocks) {
                result.push(...chunk.blocks.filter(b => !b.broken));
            }
        }
    }
    return result;
}

export function getTerrain() {
    return terrain;
}

export function resetTerrain() {
    terrain = null;
}
