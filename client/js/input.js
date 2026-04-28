const keys = {};
const keysPrev = {};
const mouse = { x: 0, y: 0, down: false, clicked: false };

export function initInput(canvas) {
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
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

// Jump key — w / space / arrowup
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

// Run key — Shift OR right mouse (treat as held for fluid play)
export function isRunDown() {
    return !!(keys['shift']);
}

// Crouch key — S / down arrow
export function isCrouchDown() {
    return !!(keys['s'] || keys['arrowdown']);
}

export function crouchPressedThisFrame() {
    const now = !!(keys['s'] || keys['arrowdown']);
    const prev = !!(keysPrev['s'] || keysPrev['arrowdown']);
    return now && !prev;
}

// Fire key (kept on left mouse so existing aim works; also map E)
export function isFirePressed() {
    return mouse.clicked || !!(keys['e'] && !keysPrev['e']);
}
export function isFireDown() {
    return mouse.down || !!keys['e'];
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
    for (const k in keys) keysPrev[k] = keys[k];
    for (const k in keysPrev) {
        if (!keys[k]) keysPrev[k] = false;
    }
}
