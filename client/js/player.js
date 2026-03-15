import {
    PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, JUMP_FORCE,
    PLAYER_MAX_HEALTH, INVINCIBILITY_DURATION, SHOOT_COOLDOWN,
    BULLET_SPEED, BULLET_RADIUS, BULLET_DAMAGE,
    CANVAS_WIDTH, CANVAS_HEIGHT, PLATFORMS, GAME_MODE,
    POWERUP_SPEED_MULT, POWERUP_SPEED_DURATION,
    POWERUP_JUMP_MULT, POWERUP_JUMP_DURATION,
    POWERUP_DOUBLE_SPREAD, POWERUP_DOUBLE_DURATION,
    POWERUP_SHIELD_HITS,
    POWERUP_GIANT_SCALE, POWERUP_GIANT_DAMAGE_MULT, POWERUP_GIANT_DURATION
} from './constants.js';
import { isKeyDown, getMouse, getWorldMouse } from './input.js';
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
    const startX = mode === GAME_MODE.ADVENTURE ? 200 : CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
    return {
        x: startX,
        y: PLATFORMS[0].y - PLAYER_HEIGHT,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        baseWidth: PLAYER_WIDTH,
        baseHeight: PLAYER_HEIGHT,
        vx: 0,
        vy: 0,
        health: PLAYER_MAX_HEALTH,
        maxHealth: PLAYER_MAX_HEALTH,
        grounded: false,
        facingRight: true,
        invincible: 0,
        shootCooldown: 0,
        weapon: 'normal',
        weaponTimer: 0,
        activePowerUps: {},
        shieldHits: 0,
    };
}

export function hasPowerUp(player, type) {
    return (player.activePowerUps[type] || 0) > 0;
}

export function applyPowerUp(player, type) {
    if (type === 'shield') {
        player.shieldHits = POWERUP_SHIELD_HITS;
        player.activePowerUps.shield = 999; // no duration, depletes on hits
        return;
    }
    const dur = POWERUP_DURATIONS[type];
    if (dur) {
        player.activePowerUps[type] = dur;
    }
    // Giant mode: scale up
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
            // Giant mode: scale back down
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
    // Horizontal movement (WASD + arrow keys)
    const speedMult = hasPowerUp(player, 'speed') ? POWERUP_SPEED_MULT : 1;
    if (isKeyDown('a') || isKeyDown('arrowleft')) {
        player.vx = -PLAYER_SPEED * speedMult;
    } else if (isKeyDown('d') || isKeyDown('arrowright')) {
        player.vx = PLAYER_SPEED * speedMult;
    } else {
        player.vx = 0;
    }

    // Jump
    if ((isKeyDown('w') || isKeyDown(' ') || isKeyDown('arrowup')) && player.grounded) {
        const jumpMult = hasPowerUp(player, 'superJump') ? POWERUP_JUMP_MULT : 1;
        player.vy = -JUMP_FORCE * jumpMult;
        player.grounded = false;
        playJump();
    }

    // Gravity
    applyGravity(player, dt);

    // Move
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Platform collisions
    resolvePlatformCollisions(player, platforms);

    if (mode === GAME_MODE.ADVENTURE) {
        if (player.x < 0) player.x = 0;
    } else {
        if (player.x + player.width < 0) player.x = CANVAS_WIDTH;
        if (player.x > CANVAS_WIDTH) player.x = -player.width;
    }

    // Facing direction based on mouse
    const mouse = mode === GAME_MODE.ADVENTURE ? getWorldMouse(camera) : getMouse();
    const cx = player.x + player.width / 2;
    player.facingRight = mouse.x >= cx;

    // Weapon timer
    if (player.weaponTimer > 0) {
        player.weaponTimer -= dt;
        if (player.weaponTimer <= 0) {
            player.weapon = 'normal';
        }
    }

    // Shooting
    const screenMouse = getMouse();
    const cooldown = player.weapon === 'rapid' ? SHOOT_COOLDOWN * 0.4 : SHOOT_COOLDOWN;
    player.shootCooldown -= dt;
    if ((screenMouse.clicked || screenMouse.down) && player.shootCooldown <= 0) {
        fireBullet(player, mouse, bullets);
        player.shootCooldown = cooldown;
        playShoot();
        triggerMuzzleFlash();
    }

    // Invincibility timer
    if (player.invincible > 0) {
        player.invincible -= dt;
    }

    // Power-up timers
    updatePowerUps(player, dt);
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
        // Two bullets with slight spread
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
    // Shield absorbs hit
    if (player.shieldHits > 0) {
        player.shieldHits--;
        player.invincible = 0.3;
        return;
    }
    player.health -= amount;
    player.invincible = INVINCIBILITY_DURATION;
}
