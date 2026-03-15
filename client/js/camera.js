import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

const LERP_SPEED = 5; // higher = snappier follow
const DEADZONE_TOP = CANVAS_HEIGHT * 0.35;
const DEADZONE_BOTTOM = CANVAS_HEIGHT * 0.65;
const VERTICAL_LERP_SPEED = 3;

let camera = { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

export function createCamera(playerX) {
    camera = {
        x: Math.max(0, playerX - CANVAS_WIDTH / 2),
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    };
    return camera;
}

export function updateCamera(player, dt) {
    // Horizontal: smooth lerp to center player
    const targetX = player.x + player.width / 2 - CANVAS_WIDTH / 2;
    const lerpFactor = 1 - Math.exp(-LERP_SPEED * dt);
    camera.x += (targetX - camera.x) * lerpFactor;
    // Clamp: don't scroll left of world origin
    if (camera.x < 0) camera.x = 0;

    // Vertical: deadzone — only move if player outside band
    const playerScreenY = player.y + player.height / 2 - camera.y;
    if (playerScreenY < DEADZONE_TOP) {
        const targetY = player.y + player.height / 2 - DEADZONE_TOP;
        const vLerp = 1 - Math.exp(-VERTICAL_LERP_SPEED * dt);
        camera.y += (targetY - camera.y) * vLerp;
    } else if (playerScreenY > DEADZONE_BOTTOM) {
        const targetY = player.y + player.height / 2 - DEADZONE_BOTTOM;
        const vLerp = 1 - Math.exp(-VERTICAL_LERP_SPEED * dt);
        camera.y += (targetY - camera.y) * vLerp;
    }

    return camera;
}

export function getCamera() {
    return camera;
}

export function resetCamera() {
    camera.x = 0;
    camera.y = 0;
}
