// Canvas
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 576;

// Physics
export const GRAVITY = 1200;

// Player
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 48;
export const PLAYER_SPEED = 300;
export const JUMP_FORCE = 500;
export const PLAYER_MAX_HEALTH = 100;
export const INVINCIBILITY_DURATION = 1.0;

// Shooting
export const SHOOT_COOLDOWN = 0.25;
export const BULLET_SPEED = 600;
export const BULLET_RADIUS = 4;
export const BULLET_DAMAGE = 1;

// Enemy (Runner)
export const ENEMY_WIDTH = 28;
export const ENEMY_HEIGHT = 40;
export const ENEMY_SPEED = 120;
export const ENEMY_HEALTH = 1;
export const ENEMY_CONTACT_DAMAGE = 20;
export const ENEMY_SCORE_VALUE = 100;

// Enemy (Flyer)
export const FLYER_WIDTH = 24;
export const FLYER_HEIGHT = 24;
export const FLYER_SPEED = 90;
export const FLYER_HEALTH = 1;
export const FLYER_CONTACT_DAMAGE = 15;
export const FLYER_SCORE_VALUE = 150;
export const COLOR_FLYER = '#FF88FF';

// Spawning
export const INITIAL_SPAWN_INTERVAL = 2.0;
export const MIN_SPAWN_INTERVAL = 0.4;
export const SPAWN_ACCELERATION = 0.02;

// Colors
export const COLOR_BACKGROUND = '#1a1a2e';
export const COLOR_PLAYER = '#4488FF';
export const COLOR_ENEMY = '#FF4444';
export const COLOR_BULLET = '#FFFF00';
export const COLOR_PLATFORM = '#666666';
export const COLOR_GROUND = '#444444';

// Platforms
export const PLATFORMS = [
    { x: 0, y: 556, width: 1024, height: 20 },
    { x: 150, y: 440, width: 200, height: 16 },
    { x: 400, y: 320, width: 200, height: 16 },
    { x: 650, y: 200, width: 200, height: 16 },
];
