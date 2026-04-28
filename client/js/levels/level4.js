// World 1-4 — Castle finale
// 280 tiles wide × 18 tall. Brick/stone everywhere. Lava everywhere. Fire bars. 4 mini-bowsers.

const W = 280;
const H = 18;

function makeGrid() { return Array.from({ length: H }, () => new Array(W).fill(' ')); }
function setTile(g, c, r, t) { if (c >= 0 && c < W && r >= 0 && r < H) g[r][c] = t; }
function fillRect(g, c0, r0, c1, r1, t) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) setTile(g, c, r, t);
}

function build() {
    const g = makeGrid();

    // Ceiling
    fillRect(g, 0, 0, W - 1, 1, 'B');
    // Ground
    fillRect(g, 0, 16, W - 1, 17, 'B');
    // Lava floor under everything past col 8
    fillRect(g, 8, 17, W - 8, 17, 'L');

    // === SECTION 1: ENTRY (0-15) ===
    fillRect(g, 0, 16, 7, 17, 'B');
    setTile(g, 4, 13, 'M'); // mushroom

    // === SECTION 2: LAVA + BRICK ISLANDS (15-50) ===
    fillRect(g, 15, 14, 18, 15, 'B');
    fillRect(g, 22, 13, 25, 15, 'B');
    fillRect(g, 29, 14, 32, 15, 'B');
    fillRect(g, 36, 12, 39, 15, 'B');
    fillRect(g, 43, 14, 47, 15, 'B');
    setTile(g, 24, 11, 'Q');
    setTile(g, 38, 10, 'F');

    // === SECTION 3: FIRE BAR HALL (50-95) ===
    fillRect(g, 50, 12, 95, 15, 'B');
    fillRect(g, 50, 17, 95, 17, 'B'); // safe brick floor (no lava under hall)
    setTile(g, 56, 8, '*'); // fire bar pivot
    setTile(g, 64, 6, '*');
    setTile(g, 72, 8, '*');
    setTile(g, 80, 6, '*');
    setTile(g, 88, 8, '*');
    // Coins between bars
    setTile(g, 60, 10, 'c');
    setTile(g, 68, 10, 'c');
    setTile(g, 76, 10, 'c');
    setTile(g, 84, 10, 'c');

    // === SECTION 4: VERTICAL CLIMB (95-130) ===
    // Wall to climb
    fillRect(g, 95, 12, 95, 15, 'B');
    // Stepping bricks zigzag
    fillRect(g, 100, 14, 103, 14, 'B');
    fillRect(g, 107, 12, 110, 12, 'B');
    fillRect(g, 100, 10, 103, 10, 'B');
    fillRect(g, 107, 8, 110, 8, 'B');
    fillRect(g, 100, 6, 103, 6, 'B');
    setTile(g, 102, 4, 'S'); // star at top
    // Spikes on walls
    setTile(g, 99, 14, 'X');
    setTile(g, 104, 12, 'X');
    setTile(g, 99, 10, 'X');
    setTile(g, 104, 8, 'X');
    setTile(g, 99, 6, 'X');
    // Drop down corridor
    fillRect(g, 113, 12, 130, 15, 'B');

    // === SECTION 5: MOVING PLATFORMS OVER LAVA (130-175) ===
    setTile(g, 135, 13, '~');
    setTile(g, 145, 12, '!');
    setTile(g, 155, 13, '~');
    setTile(g, 165, 12, '!');
    fillRect(g, 173, 14, 178, 15, 'B');

    // === SECTION 6: SPIKE GAUNTLET (180-215) ===
    fillRect(g, 178, 14, 215, 15, 'B');
    // Floor spikes
    setTile(g, 184, 14, 'X');
    setTile(g, 188, 14, 'X');
    setTile(g, 194, 14, 'X');
    setTile(g, 200, 14, 'X');
    setTile(g, 206, 14, 'X');
    setTile(g, 210, 14, 'X');
    // Fire bar overhead
    setTile(g, 192, 8, '*');
    setTile(g, 204, 8, '*');
    // Ceiling drops
    fillRect(g, 178, 5, 215, 7, 'B');
    setTile(g, 187, 8, 'X'); // ceiling spike
    setTile(g, 197, 8, 'X');
    setTile(g, 209, 8, 'X');

    // === SECTION 7: BOWSER ARENA (220-260) ===
    fillRect(g, 218, 14, 260, 15, 'B');
    fillRect(g, 220, 11, 222, 11, 'B');
    fillRect(g, 235, 9, 237, 9, 'B');
    fillRect(g, 250, 11, 252, 11, 'B');
    setTile(g, 230, 13, 'M');
    setTile(g, 245, 13, 'F');

    // === SECTION 8: FLAGPOLE (260-275) ===
    fillRect(g, 260, 14, 275, 15, 'B');
    fillRect(g, 261, 13, 263, 13, 'B');
    fillRect(g, 264, 12, 266, 12, 'B');
    fillRect(g, 267, 11, 269, 11, 'B');
    setTile(g, 272, 4, 'T');
    for (let r = 5; r < 14; r++) setTile(g, 272, r, '|');
    setTile(g, 277, 13, 'C');

    return g.map(row => row.join(''));
}

export const LEVEL_4 = {
    name: 'World 1-4',
    theme: 'castle',
    width: W,
    height: H,
    grid: build(),
    spawn: { x: 2 * 32, y: 14 * 32 },
    enemies: [
        { tx: 20, ty: 12, type: 'runner' },
        { tx: 30, ty: 13, type: 'flyer' },
        { tx: 45, ty: 13, type: 'runner' },
        { tx: 55, ty: 11, type: 'runner' },
        { tx: 70, ty: 11, type: 'runner' },
        { tx: 85, ty: 11, type: 'runner' },
        { tx: 90, ty: 11, type: 'tank' },
        { tx: 115, ty: 11, type: 'runner' },
        { tx: 125, ty: 11, type: 'tank' }, // first bowser
        { tx: 173, ty: 13, type: 'runner' },
        { tx: 180, ty: 13, type: 'runner' },
        { tx: 200, ty: 13, type: 'flyer' },
        { tx: 215, ty: 13, type: 'tank' }, // second bowser
        { tx: 225, ty: 13, type: 'runner' },
        { tx: 230, ty: 13, type: 'runner' },
        { tx: 240, ty: 13, type: 'tank' }, // third bowser
        { tx: 248, ty: 13, type: 'runner' },
        { tx: 255, ty: 13, type: 'tank' }, // fourth bowser final boss
    ],
};
