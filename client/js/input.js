const keys = {};
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
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
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

export function getMouse() {
    return mouse;
}

export function resetFrameInput() {
    mouse.clicked = false;
}
