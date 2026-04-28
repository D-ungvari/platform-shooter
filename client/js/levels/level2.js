// World 1-2 — Underground caves
// 320 tiles wide × 18 tall. Dark theme. Tighter corridors. Ceiling spikes.

const W = 320;
const H = 18;

function makeGrid() { return Array.from({ length: H }, () => new Array(W).fill(' ')); }
function setTile(g, c, r, t) { if (c >= 0 && c < W && r >= 0 && r < H) g[r][c] = t; }
function fillRect(g, c0, r0, c1, r1, t) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) setTile(g, c, r, t);
}

function build() {
    const g = makeGrid();

    // Ceiling row 0 (always solid stone)
    fillRect(g, 0, 0, W - 1, 1, '#');
    // Ground row 16-17
    fillRect(g, 0, 16, W - 1, 17, 'G');

    // === SECTION 1: ENTRY (0-25) — funnel into cave ===
    setTile(g, 8, 13, 'Q');
    setTile(g, 9, 13, 'B');
    setTile(g, 10, 13, 'M');
    // Ceiling drop closing in
    fillRect(g, 12, 2, W - 1, 4, '#');
    setTile(g, 18, 13, 'B');
    setTile(g, 19, 13, 'B');
    setTile(g, 20, 13, 'B');

    // === SECTION 2: SPIKE PIT JUMPS (25-60) ===
    fillRect(g, 26, 16, 30, 17, ' ');
    fillRect(g, 26, 17, 30, 17, 'L'); // lava in pit
    fillRect(g, 33, 17, 33, 17, 'X'); // single spike
    fillRect(g, 36, 16, 40, 17, ' ');
    fillRect(g, 36, 17, 40, 17, 'L');
    setTile(g, 38, 12, 'Q');
    fillRect(g, 44, 16, 47, 17, ' ');
    fillRect(g, 44, 17, 47, 17, 'L');
    setTile(g, 50, 17, 'X');
    setTile(g, 51, 17, 'X');
    fillRect(g, 54, 16, 58, 17, ' ');
    fillRect(g, 54, 17, 58, 17, 'L');

    // === SECTION 3: STONE CORRIDOR + CEILING SPIKES (60-105) ===
    // Lower ceiling
    fillRect(g, 60, 2, 105, 6, '#');
    // Ceiling spikes
    for (let c = 64; c < 102; c += 4) setTile(g, c, 6, 'X');
    // Ground hazards
    setTile(g, 70, 17, 'X');
    setTile(g, 78, 17, 'X');
    setTile(g, 86, 17, 'X');
    setTile(g, 94, 17, 'X');
    // Stepping bricks at mid height
    setTile(g, 68, 11, 'B');
    setTile(g, 76, 11, 'B');
    setTile(g, 84, 11, 'B');
    setTile(g, 92, 11, 'B');

    // === SECTION 4: CRUMBLE BRIDGE (110-145) ===
    fillRect(g, 110, 16, 144, 17, ' ');
    fillRect(g, 110, 17, 144, 17, 'L');
    // Crumble bridge over lava
    for (let c = 112; c <= 143; c += 2) setTile(g, c, 12, 'x');
    // Coins on bridge
    for (let c = 112; c <= 143; c += 2) setTile(g, c, 10, 'c');

    // === SECTION 5: RISING SPIKE GAUNTLET (148-200) ===
    setTile(g, 148, 13, 'M'); // mushroom for relief
    setTile(g, 152, 17, 'X');
    setTile(g, 153, 17, 'X');
    setTile(g, 154, 17, 'X');
    // Step up
    setTile(g, 156, 14, '#');
    setTile(g, 157, 14, '#');
    setTile(g, 158, 13, '#');
    setTile(g, 159, 13, '#');
    setTile(g, 160, 12, '#');
    setTile(g, 161, 12, '#');
    setTile(g, 162, 12, 'F'); // fire flower
    // Ceiling spikes overhead
    setTile(g, 164, 6, 'X');
    setTile(g, 166, 6, 'X');
    setTile(g, 168, 6, 'X');
    setTile(g, 170, 6, 'X');
    fillRect(g, 165, 7, 175, 11, '#'); // overhead block barrier
    // Pit
    fillRect(g, 178, 16, 195, 17, ' ');
    fillRect(g, 178, 17, 195, 17, 'L');
    // Crumble platform path over lava
    setTile(g, 180, 12, 'x');
    setTile(g, 184, 11, 'x');
    setTile(g, 188, 12, 'x');
    setTile(g, 192, 11, 'x');

    // === SECTION 6: DOUBLE TANK ARENA (200-235) ===
    setTile(g, 205, 12, 'B');
    setTile(g, 206, 12, 'Q');
    setTile(g, 207, 12, 'B');
    setTile(g, 215, 8, 'S'); // star reward
    setTile(g, 220, 12, 'B');
    setTile(g, 221, 12, 'B');
    setTile(g, 222, 12, 'B');

    // === SECTION 7: SPIKE CEILING TUNNEL (235-275) ===
    fillRect(g, 235, 2, 275, 4, '#');
    fillRect(g, 235, 5, 275, 7, '#');
    // Ceiling spikes hanging
    for (let c = 237; c < 273; c += 3) setTile(g, c, 7, 'X');
    // Floor with sparse safe spots
    setTile(g, 240, 17, 'X');
    setTile(g, 244, 17, 'X');
    setTile(g, 248, 17, 'X');
    setTile(g, 252, 17, 'X');
    setTile(g, 256, 17, 'X');
    setTile(g, 260, 17, 'X');
    setTile(g, 264, 17, 'X');
    setTile(g, 268, 17, 'X');
    // Stepping bricks (must time precisely)
    setTile(g, 240, 13, 'B');
    setTile(g, 244, 13, 'B');
    setTile(g, 248, 13, 'B');
    setTile(g, 252, 13, 'B');
    setTile(g, 256, 13, 'B');
    setTile(g, 260, 13, 'B');
    setTile(g, 264, 13, 'B');
    setTile(g, 268, 13, 'B');

    // === SECTION 8: BOSS APPROACH (278-305) ===
    setTile(g, 280, 13, 'M');
    setTile(g, 290, 13, 'F');
    setTile(g, 295, 12, 'B');
    setTile(g, 296, 12, 'B');
    setTile(g, 297, 12, 'B');

    // === SECTION 9: FLAGPOLE EXIT (305-319) ===
    // Stairs up to flagpole
    setTile(g, 305, 15, '#');
    setTile(g, 306, 14, '#');
    setTile(g, 306, 15, '#');
    setTile(g, 307, 13, '#');
    setTile(g, 307, 14, '#');
    setTile(g, 307, 15, '#');
    setTile(g, 308, 12, '#');
    setTile(g, 308, 13, '#');
    setTile(g, 308, 14, '#');
    setTile(g, 308, 15, '#');
    setTile(g, 314, 4, 'T');
    for (let r = 5; r < 16; r++) setTile(g, 314, r, '|');
    setTile(g, 317, 13, 'C');

    return g.map(row => row.join(''));
}

export const LEVEL_2 = {
    name: 'World 1-2',
    theme: 'underground',
    width: W,
    height: H,
    grid: build(),
    spawn: { x: 2 * 32, y: 14 * 32 },
    enemies: [
        { tx: 14, ty: 15, type: 'runner' },
        { tx: 22, ty: 15, type: 'runner' },
        { tx: 32, ty: 8, type: 'flyer' },
        { tx: 42, ty: 8, type: 'flyer' },
        { tx: 56, ty: 8, type: 'flyer' },
        { tx: 65, ty: 15, type: 'runner' },
        { tx: 80, ty: 15, type: 'runner' },
        { tx: 88, ty: 15, type: 'runner' },
        { tx: 100, ty: 15, type: 'runner' },
        { tx: 120, ty: 11, type: 'flyer' },
        { tx: 130, ty: 11, type: 'flyer' },
        { tx: 140, ty: 11, type: 'flyer' },
        { tx: 150, ty: 15, type: 'tank' },
        { tx: 165, ty: 15, type: 'runner' },
        { tx: 174, ty: 15, type: 'runner' },
        { tx: 200, ty: 15, type: 'runner' },
        { tx: 210, ty: 15, type: 'tank' },
        { tx: 215, ty: 15, type: 'tank' },
        { tx: 230, ty: 15, type: 'runner' },
        { tx: 250, ty: 14, type: 'runner' },
        { tx: 260, ty: 14, type: 'runner' },
        { tx: 270, ty: 14, type: 'runner' },
        { tx: 285, ty: 15, type: 'tank' },
        { tx: 290, ty: 15, type: 'tank' },
        { tx: 300, ty: 15, type: 'runner' },
    ],
};
