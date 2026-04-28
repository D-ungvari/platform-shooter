// World 1-3 — Sky parkour
// 380 tiles wide × 18 tall. No ground floor. Cloud platforms only. Death below.

const W = 380;
const H = 18;

function makeGrid() { return Array.from({ length: H }, () => new Array(W).fill(' ')); }
function setTile(g, c, r, t) { if (c >= 0 && c < W && r >= 0 && r < H) g[r][c] = t; }
function fillRect(g, c0, r0, c1, r1, t) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) setTile(g, c, r, t);
}

function cloud(g, c, r, len) {
    // Use stone tiles to act as solid cloud platforms (rendered as cloud later)
    for (let i = 0; i < len; i++) setTile(g, c + i, r, '#');
}

function build() {
    const g = makeGrid();

    // === SECTION 0: SAFE START PAD ===
    cloud(g, 0, 14, 8);
    setTile(g, 4, 11, 'M'); // mushroom

    // === SECTION 1: STEPPING CLOUDS (10-50) ===
    cloud(g, 12, 13, 3);
    cloud(g, 17, 12, 3);
    cloud(g, 22, 11, 3);
    cloud(g, 27, 12, 3);
    cloud(g, 32, 13, 3);
    setTile(g, 18, 9, 'c');
    setTile(g, 23, 8, 'c');
    setTile(g, 28, 9, 'c');
    cloud(g, 38, 12, 3);
    cloud(g, 43, 11, 3);
    cloud(g, 48, 13, 4);

    // === SECTION 2: HORIZONTAL MOVERS (55-110) ===
    cloud(g, 55, 13, 3);
    setTile(g, 60, 12, '~'); // moving horizontal anchor (3 wide)
    cloud(g, 70, 13, 3);
    setTile(g, 76, 12, '~');
    cloud(g, 86, 13, 3);
    setTile(g, 92, 12, '~');
    cloud(g, 102, 13, 4);
    setTile(g, 102, 11, 'Q');
    setTile(g, 105, 11, 'Q');

    // === SECTION 3: VERTICAL MOVERS + COIN ARCH (115-160) ===
    cloud(g, 115, 14, 3);
    setTile(g, 120, 10, '!'); // vertical mover
    cloud(g, 130, 14, 2);
    setTile(g, 134, 8, '!');
    cloud(g, 144, 14, 2);
    setTile(g, 148, 6, '!');
    cloud(g, 158, 12, 4);
    // Coin arch
    for (let c = 160; c <= 168; c++) setTile(g, c, 5, 'c');
    setTile(g, 162, 8, 'F');

    // === SECTION 4: CRUMBLE CHAIN (165-220) ===
    cloud(g, 168, 14, 3);
    setTile(g, 174, 12, 'x');
    setTile(g, 178, 11, 'x');
    setTile(g, 182, 10, 'x');
    setTile(g, 186, 11, 'x');
    setTile(g, 190, 12, 'x');
    setTile(g, 194, 11, 'x');
    setTile(g, 198, 10, 'x');
    setTile(g, 202, 9, 'x');
    setTile(g, 206, 10, 'x');
    setTile(g, 210, 11, 'x');
    setTile(g, 214, 12, 'x');
    cloud(g, 218, 13, 3);

    // === SECTION 5: PARATROOPA SWARM (225-270) ===
    cloud(g, 225, 13, 4);
    cloud(g, 232, 11, 3);
    cloud(g, 238, 13, 3);
    cloud(g, 244, 11, 3);
    cloud(g, 250, 13, 3);
    cloud(g, 256, 11, 4);
    cloud(g, 264, 13, 4);

    // === SECTION 6: PRECISION JUMPS (275-320) ===
    cloud(g, 275, 13, 1); // single tile platform!
    cloud(g, 278, 12, 1);
    cloud(g, 281, 11, 1);
    cloud(g, 284, 12, 1);
    cloud(g, 287, 13, 1);
    cloud(g, 290, 12, 1);
    cloud(g, 293, 11, 1);
    cloud(g, 296, 10, 1);
    cloud(g, 299, 11, 1);
    cloud(g, 302, 12, 1);
    cloud(g, 305, 13, 1);
    cloud(g, 308, 12, 2);
    cloud(g, 313, 11, 2);
    cloud(g, 318, 12, 3);

    // === SECTION 7: DOUBLE-MOVER FINALE (325-360) ===
    cloud(g, 325, 13, 2);
    setTile(g, 330, 11, '~');
    setTile(g, 340, 9, '!');
    cloud(g, 350, 11, 4);
    setTile(g, 351, 9, 'S'); // star

    // === SECTION 8: FLAGPOLE ===
    cloud(g, 358, 12, 8);
    setTile(g, 365, 4, 'T');
    for (let r = 5; r < 12; r++) setTile(g, 365, r, '|');
    setTile(g, 374, 11, 'C');

    return g.map(row => row.join(''));
}

export const LEVEL_3 = {
    name: 'World 1-3',
    theme: 'sky',
    width: W,
    height: H,
    grid: build(),
    spawn: { x: 2 * 32, y: 12 * 32 },
    enemies: [
        { tx: 24, ty: 9, type: 'flyer' },
        { tx: 35, ty: 9, type: 'flyer' },
        { tx: 50, ty: 8, type: 'flyer' },
        { tx: 65, ty: 8, type: 'flyer' },
        { tx: 80, ty: 8, type: 'flyer' },
        { tx: 95, ty: 8, type: 'flyer' },
        { tx: 110, ty: 9, type: 'flyer' },
        { tx: 125, ty: 8, type: 'flyer' },
        { tx: 145, ty: 6, type: 'flyer' },
        { tx: 160, ty: 6, type: 'flyer' },
        { tx: 180, ty: 8, type: 'flyer' },
        { tx: 195, ty: 7, type: 'flyer' },
        { tx: 210, ty: 8, type: 'flyer' },
        { tx: 230, ty: 11, type: 'runner' },
        { tx: 235, ty: 11, type: 'flyer' },
        { tx: 240, ty: 8, type: 'flyer' },
        { tx: 246, ty: 9, type: 'flyer' },
        { tx: 252, ty: 8, type: 'flyer' },
        { tx: 258, ty: 9, type: 'flyer' },
        { tx: 266, ty: 11, type: 'flyer' },
        { tx: 290, ty: 8, type: 'flyer' },
        { tx: 305, ty: 8, type: 'flyer' },
        { tx: 320, ty: 8, type: 'flyer' },
        { tx: 340, ty: 6, type: 'flyer' },
        { tx: 350, ty: 9, type: 'flyer' },
    ],
};
