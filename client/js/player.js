import {
    PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, JUMP_FORCE,
    PLAYER_MAX_HEALTH, INVINCIBILITY_DURATION, SHOOT_COOLDOWN,
    BULLET_SPEED, BULLET_RADIUS, BULLET_DAMAGE,
    CANVAS_WIDTH, CANVAS_HEIGHT
} from './constants.js';
import { isKeyDown, getMouse } from './input.js';
import { applyGravity, resolvePlatformCollisions } from './physics.js';
import { playShoot, playJump } from './audio.js';

export function createPlayer() {
    return {
        x: 100,
        y: 500,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        vx: 0,
        vy: 0,
        health: PLAYER_MAX_HEALTH,
        maxHealth: PLAYER_MAX_HEALTH,
        grounded: false,
        facingRight: true,
        invincible: 0,
        shootCooldown: 0,
    };
}

export function updatePlayer(player, dt, bullets) {
    // Horizontal movement (WASD + arrow keys)
    if (isKeyDown('a') || isKeyDown('arrowleft')) {
        player.vx = -PLAYER_SPEED;
    } else if (isKeyDown('d') || isKeyDown('arrowright')) {
        player.vx = PLAYER_SPEED;
    } else {
        player.vx = 0;
    }

    // Jump
    if ((isKeyDown('w') || isKeyDown(' ') || isKeyDown('arrowup')) && player.grounded) {
        player.vy = -JUMP_FORCE;
        player.grounded = false;
        playJump();
    }

    // Gravity
    applyGravity(player, dt);

    // Move
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Platform collisions
    resolvePlatformCollisions(player);

    // Clamp to canvas bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

    // Facing direction based on mouse
    const mouse = getMouse();
    const cx = player.x + player.width / 2;
    player.facingRight = mouse.x >= cx;

    // Shooting — auto-fire while holding mouse button
    player.shootCooldown -= dt;
    if ((mouse.clicked || mouse.down) && player.shootCooldown <= 0) {
        fireBullet(player, mouse, bullets);
        player.shootCooldown = SHOOT_COOLDOWN;
        playShoot();
    }

    // Invincibility timer
    if (player.invincible > 0) {
        player.invincible -= dt;
    }
}

function fireBullet(player, mouse, bullets) {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    bullets.push({
        x: cx,
        y: cy,
        vx: (dx / len) * BULLET_SPEED,
        vy: (dy / len) * BULLET_SPEED,
        radius: BULLET_RADIUS,
        damage: BULLET_DAMAGE,
    });
}

export function damagePlayer(player, amount) {
    if (player.invincible > 0) return;
    player.health -= amount;
    player.invincible = INVINCIBILITY_DURATION;
}
