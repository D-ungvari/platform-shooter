import {
    PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, JUMP_FORCE,
    PLAYER_MAX_HEALTH, INVINCIBILITY_DURATION, SHOOT_COOLDOWN,
    BULLET_SPEED, BULLET_RADIUS, BULLET_DAMAGE,
    CANVAS_WIDTH, CANVAS_HEIGHT, GAME_MODE,
    POWERUP_SPEED_MULT, POWERUP_SPEED_DURATION,
    POWERUP_JUMP_MULT, POWERUP_JUMP_DURATION,
    POWERUP_DOUBLE_SPREAD, POWERUP_DOUBLE_DURATION,
    POWERUP_SHIELD_HITS,
    POWERUP_GIANT_SCALE, POWERUP_GIANT_DAMAGE_MULT, POWERUP_GIANT_DURATION,
    COYOTE_TIME, JUMP_BUFFER_TIME, VAR_JUMP_CUT
} from './constants.js';
import {
    isKeyDown, getMouse, getWorldMouse,
    isJumpDown, jumpPressedThisFrame, jumpReleasedThisFrame
} from './input.js';
import { applyGravity, resolvePlatformCollisions } from './physics.js';
import { playShoot, playJump } from './audio.js';
import { triggerMuzzleFlash } from './renderer.js';

const POWERUP_DURATIONS = {
    speed: POWERUP_SPEED_DURATION,
    superJump: POWERUP_JUMP_DURATION,
    doubleShot: POWERUP_DOUBLE_DURATION,
    giant: POWERUP_GIANT_DURATION,
};

export function createPlayer(mode) {
    return {
        x: 96,
        y: 200,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        baseWidth: PLAYER_WIDTH,
        baseHeight: PLAYER_HEIGHT,
        vx: 0,
        vy: 0,
        health: PLAYER_MAX_HEALTH,
        maxHealth: PLAYER_MAX_HEALTH,
        grounded: false,
        wasGrounded: false,
        facingRight: true,
        invincible: 0,
        shootCooldown: 0,
        weapon: 'normal',
        weaponTimer: 0,
        activePowerUps: {},
        shieldHits: 0,
        coyoteTimer: 0,
        jumpBuffer: 0,
        jumpHeld: false,
        squashY: 1,    // squash/stretch Y scale
        squashX: 1,
        runFrame: 0,
        animTime: 0,
    };
}

export function hasPowerUp(player, type) {
    return (player.activePowerUps[type] || 0) > 0;
}

export function applyPowerUp(player, type) {
    if (type === 'shield') {
        player.shieldHits = POWERUP_SHIELD_HITS;
        player.activePowerUps.shield = 999;
        return;
    }
    const dur = POWERUP_DURATIONS[type];
    if (dur) {
        player.activePowerUps[type] = dur;
    }
    if (type === 'giant' && player.width === player.baseWidth) {
        const oldH = player.height;
        player.width = Math.round(player.baseWidth * POWERUP_GIANT_SCALE);
        player.height = Math.round(player.baseHeight * POWERUP_GIANT_SCALE);
        player.x -= (player.width - player.baseWidth) / 2;
        player.y -= (player.height - oldH);
    }
}

function updatePowerUps(player, dt) {
    for (const type in player.activePowerUps) {
        if (type === 'shield') {
            if (player.shieldHits <= 0) {
                delete player.activePowerUps.shield;
            }
            continue;
        }
        player.activePowerUps[type] -= dt;
        if (player.activePowerUps[type] <= 0) {
            delete player.activePowerUps[type];
            if (type === 'giant' && player.width !== player.baseWidth) {
                const oldH = player.height;
                player.width = player.baseWidth;
                player.height = player.baseHeight;
                player.y += (oldH - player.height);
            }
        }
    }
}

export function updatePlayer(player, dt, bullets, mode, camera, platforms) {
    const speedMult = hasPowerUp(player, 'speed') ? POWERUP_SPEED_MULT : 1;
    if (isKeyDown('a') || isKeyDown('arrowleft')) {
        player.vx = -PLAYER_SPEED * speedMult;
    } else if (isKeyDown('d') || isKeyDown('arrowright')) {
        player.vx = PLAYER_SPEED * speedMult;
    } else {
        player.vx = 0;
    }

    // === JUMP: coyote + buffer + variable height ===
    player.wasGrounded = player.grounded;

    // Update coyote timer (decay when off ground)
    if (player.grounded) {
        player.coyoteTimer = COYOTE_TIME;
    } else {
        player.coyoteTimer -= dt;
    }

    // Update jump buffer
    if (jumpPressedThisFrame()) {
        player.jumpBuffer = JUMP_BUFFER_TIME;
    } else {
        player.jumpBuffer -= dt;
    }

    // Trigger jump if buffer + coyote both fresh
    if (player.jumpBuffer > 0 && player.coyoteTimer > 0) {
        const jumpMult = hasPowerUp(player, 'superJump') ? POWERUP_JUMP_MULT : 1;
        player.vy = -JUMP_FORCE * jumpMult;
        player.grounded = false;
        player.coyoteTimer = 0;
        player.jumpBuffer = 0;
        player.squashY = 0.85;
        player.squashX = 1.15;
        playJump();
    }

    // Variable jump: release jump early → cut upward velocity
    if (jumpReleasedThisFrame() && player.vy < 0) {
        player.vy *= VAR_JUMP_CUT;
    }

    // Gravity
    applyGravity(player, dt);

    // Move
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    resolvePlatformCollisions(player, platforms);

    // Landing squash
    if (!player.wasGrounded && player.grounded) {
        player.squashY = 1.2;
        player.squashX = 0.85;
    }

    // Squash recovery
    player.squashY += (1 - player.squashY) * Math.min(1, dt * 14);
    player.squashX += (1 - player.squashX) * Math.min(1, dt * 14);

    if (player.x < 0) player.x = 0;

    const mouse = getWorldMouse(camera);
    const cx = player.x + player.width / 2;
    player.facingRight = mouse.x >= cx;

    if (player.weaponTimer > 0) {
        player.weaponTimer -= dt;
        if (player.weaponTimer <= 0) {
            player.weapon = 'normal';
        }
    }

    const screenMouse = getMouse();
    const cooldown = player.weapon === 'rapid' ? SHOOT_COOLDOWN * 0.4 : SHOOT_COOLDOWN;
    player.shootCooldown -= dt;
    if ((screenMouse.clicked || screenMouse.down) && player.shootCooldown <= 0) {
        fireBullet(player, mouse, bullets);
        player.shootCooldown = cooldown;
        playShoot();
        triggerMuzzleFlash();
    }

    if (player.invincible > 0) {
        player.invincible -= dt;
    }

    updatePowerUps(player, dt);

    // Animation timer
    player.animTime += dt;
    if (player.grounded && Math.abs(player.vx) > 10) {
        player.runFrame = Math.floor(player.animTime * 12) % 4;
    } else {
        player.runFrame = 0;
    }
}

function fireBullet(player, mouse, bullets) {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = dx / len;
    const ny = dy / len;
    const dmg = hasPowerUp(player, 'giant') ? BULLET_DAMAGE * POWERUP_GIANT_DAMAGE_MULT : BULLET_DAMAGE;

    if (player.weapon === 'shotgun') {
        const pellets = hasPowerUp(player, 'doubleShot') ? 7 : 5;
        const half = Math.floor(pellets / 2);
        for (let i = -half; i <= half; i++) {
            const spread = i * 0.12;
            const cos = Math.cos(spread);
            const sin = Math.sin(spread);
            const bx = nx * cos - ny * sin;
            const by = nx * sin + ny * cos;
            bullets.push({
                x: cx, y: cy,
                vx: bx * BULLET_SPEED * 0.9,
                vy: by * BULLET_SPEED * 0.9,
                radius: BULLET_RADIUS * 0.8,
                damage: dmg,
            });
        }
    } else if (hasPowerUp(player, 'doubleShot')) {
        for (const dir of [-1, 1]) {
            const spread = dir * POWERUP_DOUBLE_SPREAD / 2;
            const cos = Math.cos(spread);
            const sin = Math.sin(spread);
            const bx = nx * cos - ny * sin;
            const by = nx * sin + ny * cos;
            bullets.push({
                x: cx, y: cy,
                vx: bx * BULLET_SPEED,
                vy: by * BULLET_SPEED,
                radius: BULLET_RADIUS,
                damage: dmg,
            });
        }
    } else {
        bullets.push({
            x: cx, y: cy,
            vx: nx * BULLET_SPEED,
            vy: ny * BULLET_SPEED,
            radius: BULLET_RADIUS,
            damage: dmg,
        });
    }
}

export function giveWeapon(player, type, duration) {
    player.weapon = type;
    player.weaponTimer = duration;
}

export function damagePlayer(player, amount) {
    if (player.invincible > 0) return;
    if (player.shieldHits > 0) {
        player.shieldHits--;
        player.invincible = 0.3;
        return;
    }
    player.health -= amount;
    player.invincible = INVINCIBILITY_DURATION;
}
