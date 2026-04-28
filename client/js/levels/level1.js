// World 1-1 — overworld classic
// Grid: 250 tiles wide × 18 tall. Tile = 32px. World = 8000 × 576.
// Tile legend:
//   ' '  empty / sky
//   'G'  ground (grass+dirt block, solid)
//   '#'  stone (solid)
//   'B'  brick (solid, breakable from below)
//   'Q'  ?-block w/ coin
//   'M'  ?-block w/ mushroom (health)
//   'F'  ?-block w/ fire flower (rapid)
//   'S'  ?-block w/ star (shield)
//   'q'  spent ?-block
//   '['  pipe top-left   ']' pipe top-right
//   '('  pipe body-left  ')' pipe body-right
//   'c'  coin (loose)
//   'o'  bush (decoration)
//   '|'  flag pole, 'T' flag top, 'C' castle anchor

const W = 250;
const H = 18;

function makeGrid() {
    return Array.from({ length: H }, () => new Array(W).fill(' '));
}

function setTile(g, c, r, t) {
    if (c < 0 || c >= W || r < 0 || r >= H) return;
    g[r][c] = t;
}

function fillRect(g, c0, r0, c1, r1, t) {
    for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) setTile(g, c, r, t);
}

function placeGround(g, c0, c1) {
    fillRect(g, c0, 16, c1, 17, 'G');
}

function placePipe(g, c, height) {
    // 2-wide pipe, height tiles tall, sitting on ground (top of pipe at row 16-height)
    const top = 16 - height;
    setTile(g, c, top, '[');
    setTile(g, c + 1, top, ']');
    for (let r = top + 1; r < 16; r++) {
        setTile(g, c, r, '(');
        setTile(g, c + 1, r, ')');
    }
}

function placeBush(g, c) {
    setTile(g, c, 15, 'o');
}

function placeStairs(g, c0, height, dir = 1) {
    // Builds a staircase of stone blocks rising to height. dir=1 right-going up, -1 left-going up.
    for (let i = 0; i < height; i++) {
        const col = dir === 1 ? c0 + i : c0 - i;
        for (let r = 16 - 1 - i; r < 16; r++) setTile(g, col, r, '#');
    }
}

function build() {
    const g = makeGrid();

    // Continuous ground row across most of world
    placeGround(g, 0, W - 1);

    // === SECTION 1: TUTORIAL (cols 0-30) ===
    // Open plain w/ first goombas + first ?-block
    placeBush(g, 11);
    placeBush(g, 12);
    setTile(g, 16, 12, 'Q'); // first coin block
    setTile(g, 21, 12, 'M'); // mushroom block
    setTile(g, 22, 12, 'B');
    setTile(g, 23, 12, 'B');
    setTile(g, 24, 12, 'Q'); // coin
    setTile(g, 25, 12, 'B');
    setTile(g, 23, 8, 'B');  // higher row of bricks
    setTile(g, 24, 8, 'F');  // fire flower

    // === SECTION 2: FIRST PIT + PIPES (30-65) ===
    placeBush(g, 32);
    placePipe(g, 36, 2);    // 2-tall pipe
    placeBush(g, 41);
    placePipe(g, 44, 3);    // 3-tall pipe
    placePipe(g, 50, 4);    // 4-tall pipe
    placePipe(g, 56, 4);    // 4-tall pipe
    // first pit
    fillRect(g, 67, 16, 69, 17, ' ');

    // === SECTION 3: BRICK FIELDS + COINS (70-110) ===
    placeBush(g, 72);
    // floating coin row
    for (let c = 75; c <= 80; c++) setTile(g, c, 10, 'c');
    setTile(g, 76, 12, 'B');
    setTile(g, 77, 12, 'Q');
    setTile(g, 78, 12, 'B');
    setTile(g, 79, 12, 'Q');
    setTile(g, 80, 12, 'B');
    // pit
    fillRect(g, 86, 16, 88, 17, ' ');
    // brick staircase
    placeStairs(g, 91, 4, 1);
    placeStairs(g, 100, 4, -1);
    setTile(g, 95, 8, 'c');
    setTile(g, 96, 8, 'c');
    setTile(g, 97, 8, 'c');
    setTile(g, 98, 8, 'c');

    // === SECTION 4: PIT GAUNTLET (110-150) ===
    fillRect(g, 110, 16, 112, 17, ' ');
    // floating brick island
    setTile(g, 115, 12, 'B');
    setTile(g, 116, 12, 'M');  // mushroom
    setTile(g, 117, 12, 'B');
    fillRect(g, 119, 16, 121, 17, ' ');
    placePipe(g, 124, 3);
    fillRect(g, 130, 16, 132, 17, ' ');
    // floating coin arch
    setTile(g, 134, 9, 'B');
    setTile(g, 135, 9, 'B');
    setTile(g, 136, 9, 'B');
    setTile(g, 137, 9, 'B');
    setTile(g, 134, 12, 'c');
    setTile(g, 135, 12, 'c');
    setTile(g, 136, 12, 'c');
    setTile(g, 137, 12, 'c');
    fillRect(g, 140, 16, 143, 17, ' ');
    placePipe(g, 146, 4);

    // === SECTION 5: STONE FORTRESS (155-200) ===
    placeBush(g, 156);
    // Wall of stone w/ secret coins behind brick
    for (let c = 158; c <= 162; c++) setTile(g, c, 12, '#');
    for (let c = 158; c <= 162; c++) setTile(g, c, 13, '#');
    // Above wall: ?-blocks
    setTile(g, 159, 8, 'F'); // fire flower
    setTile(g, 160, 8, 'B');
    setTile(g, 161, 8, 'S'); // star
    // Ladder of bricks
    setTile(g, 165, 12, 'B');
    setTile(g, 166, 11, 'B');
    setTile(g, 167, 10, 'B');
    setTile(g, 168, 9, 'B');
    setTile(g, 169, 8, 'B');
    setTile(g, 170, 8, 'Q');
    setTile(g, 171, 8, 'B');
    setTile(g, 172, 8, 'B');
    // Pit
    fillRect(g, 175, 16, 178, 17, ' ');
    placePipe(g, 181, 5);
    placePipe(g, 187, 5);
    placePipe(g, 193, 5);

    // === SECTION 6: BOSS APPROACH (200-235) ===
    placeBush(g, 202);
    // Brick gauntlet
    for (let c = 204; c <= 207; c++) setTile(g, c, 9, 'B');
    setTile(g, 205, 9, 'M');
    setTile(g, 209, 12, 'B');
    setTile(g, 210, 12, 'B');
    setTile(g, 211, 12, 'B');
    fillRect(g, 215, 16, 217, 17, ' ');
    // Bowser arena: open plain
    placeStairs(g, 220, 4, 1);
    setTile(g, 225, 8, 'S'); // star ?-block at top of stair

    // === SECTION 7: FLAGPOLE + CASTLE (236-249) ===
    // Final staircase up to flagpole
    placeStairs(g, 236, 8, 1);
    // Flagpole at col 245
    setTile(g, 245, 4, 'T');
    for (let r = 5; r < 16; r++) setTile(g, 245, r, '|');
    // Castle silhouette deco at col 247-249
    setTile(g, 248, 13, 'C');

    return g.map(row => row.join(''));
}

export const LEVEL_1 = {
    name: 'World 1-1',
    theme: 'overworld',
    width: W,
    height: H,
    grid: build(),
    spawn: { x: 3 * 32, y: 14 * 32 },
    enemies: [
        // [x in tiles, y in tiles (top), type]
        { tx: 18, ty: 15, type: 'runner' },
        { tx: 27, ty: 15, type: 'runner' },
        { tx: 38, ty: 14, type: 'piranha' }, // pipe at col 36 — piranha rises from pipe top (row 14, height 2)
        { tx: 44, ty: 13, type: 'piranha' }, // 3-tall pipe at col 44 (top row 13)
        { tx: 48, ty: 15, type: 'koopa' },
        { tx: 60, ty: 8, type: 'flyer' },
        { tx: 73, ty: 15, type: 'runner' },
        { tx: 81, ty: 15, type: 'koopa' },
        { tx: 95, ty: 15, type: 'runner' },
        { tx: 105, ty: 8, type: 'flyer' },
        { tx: 113, ty: 8, type: 'flyer' },
        { tx: 124, ty: 13, type: 'piranha' }, // pipe col 124 height 3 (top row 13)
        { tx: 127, ty: 15, type: 'runner' },
        { tx: 138, ty: 8, type: 'flyer' },
        { tx: 148, ty: 15, type: 'koopa' },
        { tx: 156, ty: 15, type: 'runner' },
        { tx: 157, ty: 15, type: 'runner' },
        { tx: 163, ty: 11, type: 'flyer' },
        { tx: 173, ty: 15, type: 'runner' },
        { tx: 181, ty: 11, type: 'piranha' }, // pipe col 181 height 5 (top row 11)
        { tx: 184, ty: 8, type: 'flyer' },
        { tx: 191, ty: 8, type: 'flyer' },
        { tx: 200, ty: 15, type: 'koopa' },
        { tx: 201, ty: 15, type: 'koopa' },
        { tx: 213, ty: 15, type: 'tank' },
        { tx: 224, ty: 15, type: 'runner' },
        { tx: 230, ty: 15, type: 'tank' }, // boss
        { tx: 232, ty: 15, type: 'tank' }, // boss
    ],
};
