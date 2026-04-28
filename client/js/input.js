const keys = {};
const keysPrev = {};
const mouse = { x: 0, y: 0, down: false, clicked: false };

export function initInput(canvas) {
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'ArrowUp') e.preventDefault();
    });
    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) {
            mouse.down = true;
            mouse.clicked = true;
        }
    });
    canvas.addEventListener('mouseup', e => {
        if (e.button === 0) {
            mouse.down = false;
        }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
}

export function isKeyDown(key) {
    return !!keys[key];
}

export function wasKeyPressed(key) {
    return !!keys[key] && !keysPrev[key];
}

export function wasKeyReleased(key) {
    return !keys[key] && !!keysPrev[key];
}

// Jump key abstraction — w / space / arrowup
export function isJumpDown() {
    return !!(keys['w'] || keys[' '] || keys['arrowup']);
}

export function jumpPressedThisFrame() {
    const now = !!(keys['w'] || keys[' '] || keys['arrowup']);
    const prev = !!(keysPrev['w'] || keysPrev[' '] || keysPrev['arrowup']);
    return now && !prev;
}

export function jumpReleasedThisFrame() {
    const now = !!(keys['w'] || keys[' '] || keys['arrowup']);
    const prev = !!(keysPrev['w'] || keysPrev[' '] || keysPrev['arrowup']);
    return !now && prev;
}

export function getMouse() {
    return mouse;
}

export function getWorldMouse(camera) {
    return {
        x: mouse.x + camera.x,
        y: mouse.y + camera.y,
        down: mouse.down,
        clicked: mouse.clicked,
    };
}

export function resetFrameInput() {
    mouse.clicked = false;
    // Snapshot key state for edge detection on next frame
    for (const k in keys) keysPrev[k] = keys[k];
    // Also clear keys that have been released so prev cleanup works
    for (const k in keysPrev) {
        if (!keys[k]) keysPrev[k] = false;
    }
}
