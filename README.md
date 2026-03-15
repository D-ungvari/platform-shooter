# Platform Shooter

Arcade platform shooter with combo scoring, weapon/health pickups, and a leaderboard.

![Gameplay](gameplay.gif)

> **Note:** `gameplay.gif` is a placeholder — record and add a GIF manually.

**[Play Now](https://d-ungvari.github.io/platform-shooter/)**

> Requires GitHub Pages to be enabled: repo Settings > Pages > Source: **GitHub Actions**

## Controls

| Input | Action |
|-------|--------|
| WASD / Arrow Keys | Move and jump |
| Mouse | Aim |
| Left Click (hold) | Shoot |
| ESC | Pause |

## Features

- **3 Enemy types** — Runner, Flyer, Tank with distinct behaviors
- **Combo scoring** — chain kills for score multipliers
- **Weapon and health pickups** — dropped by enemies
- **Parallax background** with procedural stars and moon
- **Leaderboard** via Express + PostgreSQL backend (client works without it)
- **Procedural audio** — Web Audio API, no audio files

## Tech

- Vanilla JavaScript (ES6 modules) — zero dependencies, no build step
- Canvas 2D rendering with platform physics
- 15 client modules: renderer, physics, spawner, enemies, effects, audio, UI
- Express.js + PostgreSQL backend for score persistence (separate from client deploy)
