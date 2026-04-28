# Platform Shooter

Arcade platform shooter with combo scoring, weapon/health pickups, and a leaderboard.

**[Play Now](https://d-ungvari.github.io/platform-shooter/)**

## Screenshots

Gameplay captures coming soon.

<!-- TODO: record gameplay.gif and embed above this line -->

## Controls

| Input | Action |
|-------|--------|
| WASD / Arrow Keys | Move and jump |
| Mouse | Aim |
| Left Click (hold) | Shoot |
| ESC | Pause |

## Features

- **3 enemy types** — Runner, Flyer, Tank with distinct behaviors
- **Combo scoring** — chain kills for score multipliers
- **Weapon and health pickups** dropped by enemies
- **Parallax background** with procedural stars and moon
- **Procedural audio** — Web Audio API, no audio files shipped
- **Optional leaderboard** — Express + PostgreSQL backend; client runs fully offline without it

## Architecture

**Client** (`client/`) — vanilla JavaScript ES6 modules, zero dependencies, no build step.
Modules: `renderer`, `physics`, `spawner`, `enemy`, `bullet`, `player`, `terrain`, `camera`,
`effects`, `audio`, `input`, `ui`, `game`, `constants`, `api`, `main`.

**Backend** (`server/`) — Express.js + PostgreSQL for score persistence. Decoupled from the
client deploy; opt-in via the in-game leaderboard. Routes in `server/routes/scores.js`,
connection pool in `server/db.js`.

**Audio** is generated at runtime with the Web Audio API — no `.wav`/`.mp3` assets in the repo.

## Run Locally

**Client only** (no leaderboard):
```bash
cd client
npx serve .
```

**With leaderboard backend** (optional):
```bash
cd server
cp .env.example .env   # edit DATABASE_URL to point at a running Postgres
npm install
npm start
```
The client reads the API base from `client/js/api.js` (currently hardcoded to
`http://localhost:3001` — see Known Issues).

## Deploy

Client is deployed to GitHub Pages via `.github/workflows/deploy.yml`.

## Known Issues

- `API_BASE` in `client/js/api.js` is hardcoded to `http://localhost:3001`. The deployed
  client cannot reach a remote leaderboard until this is configured (env-based or build-time).
