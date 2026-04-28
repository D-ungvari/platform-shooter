import { TILE, CANVAS_HEIGHT } from './constants.js';

// Tile-based level loader. Converts a string-grid level into:
// - solid platforms (rectangles for collision)
// - decorative tiles (bricks, ?-blocks, pipes, flag, etc.)
// - hand-placed enemies, coins, pickups, decorations

let currentLevel = null;

export function loadLevel(levelData) {
    const tilesW = levelData.width;
    const tilesH = levelData.height;
    const grid = levelData.grid;

    const platforms = [];
    const decoTiles = [];
    const coins = [];
    const blocks = []; // ?-blocks
    const pipes = [];
    const hazards = []; // spikes, lava, fire bars
    const movingPlatforms = [];
    const crumbleTiles = [];
    let flag = null;
    let castle = null;

    // Helper: read tile at col/row
    const at = (c, r) => {
        if (c < 0 || c >= tilesW || r < 0 || r >= tilesH) return ' ';
        return grid[r] ? (grid[r][c] || ' ') : ' ';
    };

    // First pass: collect runs of solid tiles into wider rect platforms.
    // Solid tiles include 'x' (crumble — solid until triggered)
    const SOLID = new Set(['G', 'B', 'Q', 'q', 'P', 'p', '[', ']', '-', '=', '#', 'x']);
    const visited = Array.from({ length: tilesH }, () => new Array(tilesW).fill(false));

    for (let r = 0; r < tilesH; r++) {
        for (let c = 0; c < tilesW; c++) {
            const t = at(c, r);
            if (!SOLID.has(t)) continue;
            if (visited[r][c]) continue;

            // Greedy horizontal run of same-row solid tiles
            let runEnd = c;
            while (runEnd + 1 < tilesW && SOLID.has(at(runEnd + 1, r)) && !visited[r][runEnd + 1]) runEnd++;
            for (let k = c; k <= runEnd; k++) visited[r][k] = true;

            platforms.push({
                x: c * TILE,
                y: r * TILE,
                width: (runEnd - c + 1) * TILE,
                height: TILE,
                type: 'solid',
                tileType: t,
            });
        }
    }

    // Second pass: capture decorative + special tiles individually
    for (let r = 0; r < tilesH; r++) {
        for (let c = 0; c < tilesW; c++) {
            const t = at(c, r);
            const x = c * TILE;
            const y = r * TILE;

            if (t === 'Q') {
                blocks.push({ x, y, width: TILE, height: TILE, type: 'qblock', used: false, contents: 'coin', bumpT: 0 });
            } else if (t === 'M') {
                // ?-block containing mushroom
                blocks.push({ x, y, width: TILE, height: TILE, type: 'qblock', used: false, contents: 'mushroom', bumpT: 0 });
                platforms.push({ x, y, width: TILE, height: TILE, type: 'solid', tileType: 'Q' });
            } else if (t === 'F') {
                // Fire flower
                blocks.push({ x, y, width: TILE, height: TILE, type: 'qblock', used: false, contents: 'fireflower', bumpT: 0 });
                platforms.push({ x, y, width: TILE, height: TILE, type: 'solid', tileType: 'Q' });
            } else if (t === 'S') {
                // Star
                blocks.push({ x, y, width: TILE, height: TILE, type: 'qblock', used: false, contents: 'star', bumpT: 0 });
                platforms.push({ x, y, width: TILE, height: TILE, type: 'solid', tileType: 'Q' });
            } else if (t === 'B') {
                decoTiles.push({ x, y, width: TILE, height: TILE, type: 'brick' });
            } else if (t === 'G') {
                decoTiles.push({ x, y, width: TILE, height: TILE, type: 'ground', isTop: at(c, r - 1) !== 'G' && at(c, r - 1) !== '#' });
            } else if (t === '#') {
                decoTiles.push({ x, y, width: TILE, height: TILE, type: 'stone' });
            } else if (t === 'c') {
                coins.push({ x: x + TILE / 2, y: y + TILE / 2, picked: false, t: Math.random() * Math.PI * 2 });
            } else if (t === 'o') {
                // bush decoration (non-solid)
                decoTiles.push({ x, y, width: TILE, height: TILE, type: 'bush' });
            } else if (t === '|') {
                if (!flag) flag = { x: x + TILE / 2 - 4, y, width: 8, top: y, base: (r + 1) * TILE };
                flag.top = Math.min(flag.top, y);
            } else if (t === 'T') {
                // flag top
                flag = flag || { x: x + TILE / 2 - 4, y, width: 8, top: y, base: y + TILE };
                flag.top = y;
                flag.cloth = { x: x + TILE / 2, y: y + 6, w: TILE, h: TILE - 12 };
            } else if (t === 'C') {
                castle = { x, y };
            } else if (t === 'X') {
                // Spikes: not solid, deal damage on contact
                hazards.push({ x, y, width: TILE, height: TILE, type: 'spike' });
            } else if (t === 'L') {
                // Lava: instant death zone (also rendered)
                hazards.push({ x, y, width: TILE, height: TILE, type: 'lava' });
            } else if (t === '*') {
                // Fire bar pivot — generates rotating spike chain
                hazards.push({ x: x + TILE / 2, y: y + TILE / 2, type: 'firebar', length: 4, phase: Math.random() * Math.PI * 2, speed: 2 });
            } else if (t === 'x') {
                // Crumble brick (also solid via SOLID set above)
                crumbleTiles.push({ x, y, state: 'idle', timer: 0, respawn: 0, originY: y });
                decoTiles.push({ x, y, width: TILE, height: TILE, type: 'crumble' });
            } else if (t === '~') {
                // Moving platform horizontal anchor (3 tiles wide)
                movingPlatforms.push({
                    x, y,
                    width: TILE * 3,
                    height: TILE / 2,
                    originX: x, originY: y,
                    moveAxis: 'h', moveRange: 96, moveSpeed: 1.5, movePhase: Math.random() * Math.PI * 2,
                    prevX: x, prevY: y,
                });
            } else if (t === '!') {
                // Moving platform vertical
                movingPlatforms.push({
                    x, y,
                    width: TILE * 3,
                    height: TILE / 2,
                    originX: x, originY: y,
                    moveAxis: 'v', moveRange: 96, moveSpeed: 1.2, movePhase: Math.random() * Math.PI * 2,
                    prevX: x, prevY: y,
                });
            }
        }
    }

    // Pipes: detect 2-wide top markers '[' next to ']'
    // (already counted as solid platforms, but record for special draw)
    for (let r = 0; r < tilesH; r++) {
        for (let c = 0; c < tilesW; c++) {
            if (at(c, r) === '[' && at(c + 1, r) === ']') {
                // Determine pipe height
                let h = 1;
                while (at(c, r + h) === '(' && at(c + 1, r + h) === ')') h++;
                pipes.push({ x: c * TILE, y: r * TILE, width: TILE * 2, height: h * TILE });
            }
        }
    }

    // Build a flag-pole structure if flag detected
    if (flag) {
        // Find pole height: search downward for pole base in grid
        let poleBaseY = flag.top;
        for (let r = Math.floor(flag.top / TILE); r < tilesH; r++) {
            const t = at(Math.floor((flag.x + 4) / TILE), r);
            if (t === '|' || t === 'T') poleBaseY = (r + 1) * TILE;
        }
        flag.base = poleBaseY;
        flag.height = poleBaseY - flag.top;
    }

    currentLevel = {
        ...levelData,
        worldWidth: tilesW * TILE,
        worldHeight: tilesH * TILE,
        platforms,
        decoTiles,
        coins,
        blocks,
        pipes,
        hazards,
        movingPlatforms,
        crumbleTiles,
        flag,
        castle,
        theme: levelData.theme || 'overworld',
        enemies: levelData.enemies || [],
        groundY: tilesH * TILE - TILE * 2,
    };
    return currentLevel;
}

export function getCurrentLevel() {
    return currentLevel;
}

export function resetLevel() {
    currentLevel = null;
}
