// Game modes — story only
export const GAME_MODE = { STORY: 'story' };

// Canvas
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 576;

// Tile size
export const TILE = 32;

// Physics
export const GRAVITY = 1200;

// Davio
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT_SMALL = 28;
export const PLAYER_HEIGHT_SUPER = 48;
export const PLAYER_HEIGHT = PLAYER_HEIGHT_SMALL;
export const PLAYER_WALK_SPEED = 180;
export const PLAYER_RUN_SPEED = 300;
export const PLAYER_ACCEL = 1500;
export const PLAYER_DECEL = 1200;
export const PLAYER_AIR_ACCEL = 900;
export const JUMP_FORCE = 560;
export const JUMP_FORCE_BONUS_PER_SPEED = 0.18; // extra jump per px/s of horizontal speed
export const PLAYER_MAX_HEALTH = 100;
export const INVINCIBILITY_DURATION = 1.5;
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER_TIME = 0.12;
export const VAR_JUMP_CUT = 0.45;
export const STOMP_BOUNCE = 380;
export const GROUND_POUND_VEL = 900;
export const GROUND_POUND_RADIUS = 80;
export const STAR_DURATION = 9.0;

// Power levels
export const POWER_SMALL = 0;
export const POWER_SUPER = 1;
export const POWER_FIRE = 2;

// Fireballs
export const FIREBALL_SPEED = 360;
export const FIREBALL_RADIUS = 6;
export const FIREBALL_GRAVITY = 900;
export const FIREBALL_BOUNCE = 0.7;
export const FIREBALL_MAX_BOUNCES = 3;
export const FIREBALL_LIFE = 2.0;
export const FIREBALL_COOLDOWN = 0.25;

// Enemy (Goomba / runner)
export const ENEMY_WIDTH = 28;
export const ENEMY_HEIGHT = 28;
export const ENEMY_SPEED = 60;
export const ENEMY_HEALTH = 1;
export const ENEMY_CONTACT_DAMAGE = 100;
export const ENEMY_SCORE_VALUE = 100;

// Enemy (Paratroopa / flyer)
export const FLYER_WIDTH = 28;
export const FLYER_HEIGHT = 28;
export const FLYER_SPEED = 90;
export const FLYER_HEALTH = 1;
export const FLYER_CONTACT_DAMAGE = 100;
export const FLYER_SCORE_VALUE = 200;
export const COLOR_FLYER = '#FF3030';

// Enemy (Bowser-mini / tank)
export const TANK_WIDTH = 44;
export const TANK_HEIGHT = 44;
export const TANK_SPEED = 50;
export const TANK_HEALTH = 5;
export const TANK_CONTACT_DAMAGE = 100;
export const TANK_SCORE_VALUE = 5000;
export const COLOR_TANK = '#00A800';

// Enemy (Koopa Troopa)
export const KOOPA_WIDTH = 28;
export const KOOPA_HEIGHT = 36;
export const KOOPA_SPEED = 60;
export const KOOPA_HEALTH = 1;
export const KOOPA_CONTACT_DAMAGE = 100;
export const KOOPA_SCORE_VALUE = 200;
export const KOOPA_SHELL_SPEED = 360;
export const KOOPA_SHELL_REVIVE = 6.0;

// Enemy (Piranha Plant)
export const PIRANHA_WIDTH = 24;
export const PIRANHA_HEIGHT = 36;
export const PIRANHA_HEALTH = 1;
export const PIRANHA_DAMAGE = 100;
export const PIRANHA_SCORE_VALUE = 200;
export const PIRANHA_CYCLE = 4.0;
export const PIRANHA_RISE_TIME = 0.6;

// Stomp combo scoring (SMB1 progression)
export const STOMP_COMBO_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
export const COINS_PER_LIFE = 100;

// === MARIO/DAVIO PALETTE ===
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

// Legacy aliases
export const COLOR_BACKGROUND = COLOR_SKY;
export const COLOR_PLAYER = '#E8281C';
export const COLOR_ENEMY = '#9C4810';
export const COLOR_BULLET = '#FF8000';
export const COLOR_PLATFORM = COLOR_DIRT;
export const COLOR_GROUND = COLOR_DIRT_DARK;

// Story
export const STORY_LIVES = 3;
export const STORY_TIME_LIMIT = 400;
export const COIN_VALUE = 200; // SMB1: coin = 200 points
