// Game modes — story only (arena + adventure removed)
export const GAME_MODE = { STORY: 'story' };

// Canvas
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 576;

// Tile size for story mode
export const TILE = 32;

// Physics
export const GRAVITY = 1200;

// Player
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 44;
export const PLAYER_SPEED = 300;
export const JUMP_FORCE = 620;
export const PLAYER_MAX_HEALTH = 100;
export const INVINCIBILITY_DURATION = 1.0;
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER_TIME = 0.12;
export const VAR_JUMP_CUT = 0.45;
export const STOMP_BOUNCE = 380;

// Shooting
export const SHOOT_COOLDOWN = 0.25;
export const BULLET_SPEED = 600;
export const BULLET_RADIUS = 5;
export const BULLET_DAMAGE = 1;

// Enemy (Runner / Goomba)
export const ENEMY_WIDTH = 28;
export const ENEMY_HEIGHT = 28;
export const ENEMY_SPEED = 90;
export const ENEMY_HEALTH = 1;
export const ENEMY_CONTACT_DAMAGE = 20;
export const ENEMY_SCORE_VALUE = 100;

// Enemy (Flyer / Paratroopa)
export const FLYER_WIDTH = 28;
export const FLYER_HEIGHT = 28;
export const FLYER_SPEED = 90;
export const FLYER_HEALTH = 1;
export const FLYER_CONTACT_DAMAGE = 15;
export const FLYER_SCORE_VALUE = 150;
export const COLOR_FLYER = '#FF3030';

// Enemy (Tank / Mini-Bowser)
export const TANK_WIDTH = 44;
export const TANK_HEIGHT = 44;
export const TANK_SPEED = 50;
export const TANK_HEALTH = 3;
export const TANK_CONTACT_DAMAGE = 30;
export const TANK_SCORE_VALUE = 250;
export const COLOR_TANK = '#00A800';

// Spawning
export const INITIAL_SPAWN_INTERVAL = 2.0;
export const MIN_SPAWN_INTERVAL = 0.4;
export const SPAWN_ACCELERATION = 0.02;

// === MARIO PALETTE ===
export const COLOR_SKY = '#5C94FC';
export const COLOR_CLOUD = '#FFFFFF';
export const COLOR_CLOUD_SHADOW = '#E8F0FF';
export const COLOR_HILL = '#00A844';
export const COLOR_HILL_DARK = '#007830';
export const COLOR_BUSH = '#00A800';
export const COLOR_BUSH_DARK = '#006800';
export const COLOR_GRASS = '#00A800';
export const COLOR_GRASS_DARK = '#007030';
export const COLOR_DIRT = '#B87B43';
export const COLOR_DIRT_DARK = '#7C4828';
export const COLOR_DIRT_SPECK = '#5C2818';
export const COLOR_BRICK = '#C84C0C';
export const COLOR_BRICK_LIGHT = '#F8B070';
export const COLOR_BRICK_DARK = '#7C2810';
export const COLOR_QBLOCK = '#F8B800';
export const COLOR_QBLOCK_DARK = '#C84C0C';
export const COLOR_QBLOCK_LIGHT = '#FFE830';
export const COLOR_QBLOCK_USED = '#A04C00';
export const COLOR_PIPE = '#00A800';
export const COLOR_PIPE_LIGHT = '#80F800';
export const COLOR_PIPE_DARK = '#006800';
export const COLOR_FLAG = '#FFFFFF';
export const COLOR_FLAG_POLE = '#A8A8A8';
export const COLOR_FLAG_BALL = '#F8B800';
export const COLOR_FLAG_CLOTH = '#00A800';
export const COLOR_CASTLE = '#A05030';
export const COLOR_CASTLE_DARK = '#5C2818';
export const COLOR_COIN = '#F8B800';
export const COLOR_COIN_LIGHT = '#FFE890';
export const COLOR_COIN_DARK = '#A86800';

// Legacy alias names kept for compat
export const COLOR_BACKGROUND = COLOR_SKY;
export const COLOR_PLAYER = '#E8281C';
export const COLOR_ENEMY = '#9C4810';
export const COLOR_BULLET = '#FF8000';
export const COLOR_PLATFORM = COLOR_DIRT;
export const COLOR_GROUND = COLOR_DIRT_DARK;

// Power-Ups
export const POWERUP_SPEED_MULT = 1.5;
export const POWERUP_SPEED_DURATION = 8;
export const POWERUP_JUMP_MULT = 1.8;
export const POWERUP_JUMP_DURATION = 10;
export const POWERUP_DOUBLE_SPREAD = 0.175;
export const POWERUP_DOUBLE_DURATION = 10;
export const POWERUP_SHIELD_HITS = 3;
export const POWERUP_GIANT_SCALE = 1.5;
export const POWERUP_GIANT_DAMAGE_MULT = 1.5;
export const POWERUP_GIANT_DURATION = 8;

export const BOUNCE_FORCE_MULT = 2.0;

// Story mode
export const STORY_LIVES = 3;
export const STORY_TIME_LIMIT = 400;
export const COIN_VALUE = 50;
