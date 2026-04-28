import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

const LERP_SPEED = 6;
const VERTICAL_LERP_SPEED = 4;
const DEADZONE_TOP = CANVAS_HEIGHT * 0.4;
const DEADZONE_BOTTOM = CANVAS_HEIGHT * 0.6;
const LOOK_AHEAD = 80;

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

export function updateCamera(player, dt, level) {
    // Look-ahead based on velocity direction
    const lookAhead = player.facingRight ? LOOK_AHEAD : -LOOK_AHEAD;
    const targetX = player.x + player.width / 2 - CANVAS_WIDTH / 2 + lookAhead;
    const lerpFactor = 1 - Math.exp(-LERP_SPEED * dt);
    camera.x += (targetX - camera.x) * lerpFactor;

    // Horizontal clamp
    if (camera.x < 0) camera.x = 0;
    if (level && level.worldWidth) {
        const maxX = level.worldWidth - CANVAS_WIDTH;
        if (camera.x > maxX) camera.x = maxX;
    }

    // Vertical: clamp to ground for finite levels
    if (level && level.worldHeight) {
        const groundCamY = level.worldHeight - CANVAS_HEIGHT;
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
        if (camera.y < 0) camera.y = 0;
        if (camera.y > groundCamY) camera.y = groundCamY;
    } else {
        // Adventure mode: original deadzone behavior
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
