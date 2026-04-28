import {
    PLAYER_WIDTH, PLAYER_HEIGHT_SMALL, PLAYER_HEIGHT_SUPER,
    PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_ACCEL, PLAYER_DECEL, PLAYER_AIR_ACCEL,
    JUMP_FORCE, JUMP_FORCE_BONUS_PER_SPEED,
    PLAYER_MAX_HEALTH, INVINCIBILITY_DURATION,
    FIREBALL_SPEED, FIREBALL_RADIUS, FIREBALL_COOLDOWN, FIREBALL_LIFE,
    POWER_SMALL, POWER_SUPER, POWER_FIRE, STAR_DURATION,
    GROUND_POUND_VEL,
    COYOTE_TIME, JUMP_BUFFER_TIME, VAR_JUMP_CUT
} from './constants.js';
import {
    isKeyDown, getMouse, getWorldMouse,
    jumpPressedThisFrame, jumpReleasedThisFrame,
    isRunDown, isCrouchDown, crouchPressedThisFrame, isFirePressed
} from './input.js';
import { applyGravity, resolvePlatformCollisions } from './physics.js';
import { playJump, playFireball } from './audio.js';
import { triggerMuzzleFlash } from './renderer.js';

export function createPlayer(mode) {
    return {
        x: 96,
        y: 200,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT_SMALL,
        baseWidth: PLAYER_WIDTH,
        vx: 0,
        vy: 0,
        health: PLAYER_MAX_HEALTH,
        maxHealth: PLAYER_MAX_HEALTH,
        grounded: false,
        wasGrounded: false,
        facingRight: true,
        invincible: 0,
        shootCooldown: 0,
        powerLevel: POWER_SMALL,
        starTimer: 0,
        crouching: false,
        groundPounding: false,
        groundPoundLanded: 0,
        coyoteTimer: 0,
        jumpBuffer: 0,
        jumpHeld: false,
        squashY: 1,
        squashX: 1,
        runFrame: 0,
        animTime: 0,
        growTimer: 0, // freeze input during grow/shrink
        flashSwap: 0,
        ridingPlatform: null,
        headBonk: null,
    };
}

// Set hitbox based on power level (small vs super-tier)
function applyHitboxForPower(player) {
    const targetH = player.powerLevel === POWER_SMALL ? PLAYER_HEIGHT_SMALL : PLAYER_HEIGHT_SUPER;
    if (player.crouching && player.powerLevel !== POWER_SMALL) {
        const crouchH = PLAYER_HEIGHT_SUPER - 12;
        const diff = player.height - crouchH;
        player.height = crouchH;
        player.y += diff;
        return;
    }
    const diff = player.height - targetH;
    if (diff !== 0) {
        player.height = targetH;
        player.y += diff;
    }
}

// Promote one tier (small→super→fire). Returns the level reached.
export function promotePower(player, target) {
    const before = player.powerLevel;
    if (target === 'mushroom') {
        if (player.powerLevel === POWER_SMALL) {
            player.powerLevel = POWER_SUPER;
            player.growTimer = 0.4;
        } else {
            // Already super or fire — score bump only
        }
    } else if (target === 'fireflower') {
        player.powerLevel = POWER_FIRE;
        player.growTimer = 0.4;
    } else if (target === 'star') {
        player.starTimer = STAR_DURATION;
    }
    if (player.powerLevel !== before) {
        // Resize hitbox upward (push player up so feet stay)
        const newH = PLAYER_HEIGHT_SUPER;
        const oldH = player.height;
        if (newH > oldH) {
            player.height = newH;
            player.y -= (newH - oldH);
        }
    }
    return player.powerLevel;
}

// Demote one tier on hit. Fire→Super→Small→death.
// Returns true if the hit kills (was small).
export function demoteOnHit(player) {
    if (player.invincible > 0 || player.starTimer > 0) return false;
    if (player.powerLevel === POWER_FIRE) {
        player.powerLevel = POWER_SUPER;
        player.invincible = INVINCIBILITY_DURATION;
        return false;
    }
    if (player.powerLevel === POWER_SUPER) {
        player.powerLevel = POWER_SMALL;
        const oldH = player.height;
        const newH = PLAYER_HEIGHT_SMALL;
        player.height = newH;
        player.y += (oldH - newH);
        player.invincible = INVINCIBILITY_DURATION;
        return false;
    }
    // Small Davio: kill
    player.health = 0;
    return true;
}

export function hasPowerUp(player, type) {
    if (type === 'shield' || type === 'star') return player.starTimer > 0;
    return false;
}

// Legacy entry points used by game.js pickup loop
export function applyPowerUp(player, type) {
    if (type === 'star' || type === 'shield') {
        promotePower(player, 'star');
    } else if (type === 'giant') {
        promotePower(player, 'mushroom');
    }
}

export function giveWeapon(player, type, _duration) {
    if (type === 'rapid' || type === 'fireflower') {
        promotePower(player, 'fireflower');
    }
}

export function updatePlayer(player, dt, bullets, mode, camera, platforms) {
    if (player.starTimer > 0) player.starTimer -= dt;
    if (player.growTimer > 0) {
        player.growTimer -= dt;
        // Brief flash + freeze horizontal input
        player.vx = 0;
        applyGravity(player, dt);
        player.y += player.vy * dt;
        resolvePlatformCollisions(player, platforms);
        return;
    }

    const isSuperTier = player.powerLevel !== POWER_SMALL;

    // === HORIZONTAL: walk/run with accel ===
    const running = isRunDown();
    const maxSpeed = running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    let inputDir = 0;
    if (isKeyDown('a') || isKeyDown('arrowleft')) inputDir = -1;
    else if (isKeyDown('d') || isKeyDown('arrowright')) inputDir = 1;

    // Crouch suppresses horizontal input on ground for super
    const wantsCrouch = isCrouchDown() && isSuperTier && player.grounded;
    if (wantsCrouch) inputDir = 0;
    if (player.crouching !== wantsCrouch) {
        player.crouching = wantsCrouch;
        applyHitboxForPower(player);
    }

    const accel = player.grounded ? PLAYER_ACCEL : PLAYER_AIR_ACCEL;
    if (inputDir !== 0) {
        const target = inputDir * maxSpeed;
        if (Math.sign(player.vx) !== inputDir && Math.abs(player.vx) > 30) {
            // skidding (reverse) — apply heavy decel
            player.vx += inputDir * PLAYER_DECEL * dt;
            player.skidding = player.grounded;
        } else {
            player.vx += inputDir * accel * dt;
            if (Math.abs(player.vx) > maxSpeed) player.vx = Math.sign(player.vx) * maxSpeed;
            player.skidding = false;
        }
    } else if (player.grounded) {
        // Decel toward 0
        const dec = PLAYER_DECEL * dt;
        if (Math.abs(player.vx) <= dec) player.vx = 0;
        else player.vx -= Math.sign(player.vx) * dec;
        player.skidding = false;
    }

    // === JUMP: coyote + buffer + variable + speed bonus ===
    player.wasGrounded = player.grounded;

    if (player.grounded) {
        player.coyoteTimer = COYOTE_TIME;
    } else {
        player.coyoteTimer -= dt;
    }

    if (jumpPressedThisFrame()) {
        player.jumpBuffer = JUMP_BUFFER_TIME;
    } else {
        player.jumpBuffer -= dt;
    }

    if (player.jumpBuffer > 0 && player.coyoteTimer > 0 && !player.groundPounding) {
        const speedBonus = Math.abs(player.vx) * JUMP_FORCE_BONUS_PER_SPEED;
        player.vy = -(JUMP_FORCE + speedBonus);
        player.grounded = false;
        player.coyoteTimer = 0;
        player.jumpBuffer = 0;
        player.squashY = 0.85;
        player.squashX = 1.15;
        playJump();
    }

    if (jumpReleasedThisFrame() && player.vy < 0) {
        player.vy *= VAR_JUMP_CUT;
    }

    // === GROUND POUND: down-press while airborne, super+ only ===
    if (!player.grounded && isSuperTier && crouchPressedThisFrame() && !player.groundPounding) {
        player.groundPounding = true;
        player.vx = 0;
        player.vy = GROUND_POUND_VEL;
    }
    if (player.groundPounding && player.grounded) {
        player.groundPounding = false;
        player.groundPoundLanded = 1.0; // signal flag for game.js
        player.squashY = 0.7;
        player.squashX = 1.3;
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

    player.squashY += (1 - player.squashY) * Math.min(1, dt * 14);
    player.squashX += (1 - player.squashX) * Math.min(1, dt * 14);

    if (player.x < 0) player.x = 0;

    const mouse = getWorldMouse(camera);
    const cx = player.x + player.width / 2;
    if (Math.abs(player.vx) > 20) player.facingRight = player.vx > 0;
    else player.facingRight = mouse.x >= cx;

    // === FIRE FIREBALL (POWER_FIRE only) ===
    player.shootCooldown -= dt;
    const screenMouse = getMouse();
    if (player.powerLevel === POWER_FIRE && player.shootCooldown <= 0 &&
        (screenMouse.clicked || screenMouse.down || isKeyDown('e'))) {
        fireFireball(player, bullets);
        player.shootCooldown = FIREBALL_COOLDOWN;
        playFireball();
        triggerMuzzleFlash();
    }

    if (player.invincible > 0) player.invincible -= dt;
    if (player.groundPoundLanded > 0) player.groundPoundLanded -= dt;

    // Animation
    player.animTime += dt;
    if (player.grounded && Math.abs(player.vx) > 10) {
        const animSpeed = Math.min(20, 6 + Math.abs(player.vx) / 25);
        player.runFrame = Math.floor(player.animTime * animSpeed) % 4;
    } else {
        player.runFrame = 0;
    }
}

function fireFireball(player, bullets) {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height * 0.4;
    const dir = player.facingRight ? 1 : -1;
    bullets.push({
        kind: 'fireball',
        x: cx + dir * 12,
        y: cy,
        vx: dir * FIREBALL_SPEED,
        vy: 0,
        radius: FIREBALL_RADIUS,
        damage: 1,
        life: FIREBALL_LIFE,
        bounces: 0,
        spin: 0,
    });
}

export function damagePlayer(player, _amount) {
    // Defer to demoteOnHit — handles all damage now
    return demoteOnHit(player);
}
