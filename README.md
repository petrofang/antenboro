# 🐜 Antenboro — First-Person Ant Colony Survival

> *SimAnt × WoW Night Elf zone × Honey I Shrunk the Kids × Life in the Undergrowth × Valheim*

A browser-based, first-person ant-superorganism survival and building game built with [Three.js](https://threejs.org/).
You play as an ant scout in a vast procedurally-generated undergrowth world, managing your colony, gathering resources, constructing chambers, and surviving predators through day/night cycles.

---

## ✨ Features

| Pillar | What's in the game |
|---|---|
| **Sim Ant** | Colony simulation — workers, soldiers, larvae, food stores, morale, production timers |
| **WoW Night Elf** | Mystical bioluminescent undergrowth; fireflies at night; giant ancient flora |
| **Honey I Shrunk the Kids** | Everything scaled from ant perspective — pebbles are boulders, grass blades are trees, water droplets are lagoons |
| **Life in the Undergrowth** | Procedural ecosystem: mushrooms, flowers, twigs, fallen leaves, water droplets, spiders |
| **Valheim** | Day/night survival loop; building system; resource gathering; health/food/energy stats; predator threat |

---

## 🎮 Controls

| Key | Action |
|---|---|
| **WASD / Arrow keys** | Move |
| **Mouse** | Look (click canvas to capture) |
| **Shift** | Sprint (drains energy) |
| **F** | Gather nearby resource |
| **E** | Interact / deposit resources at colony entrance |
| **B** | Open Build Menu |
| **1–4 / Scroll** | Select hotbar slot |
| **ESC** | Pause |

---

## 🚀 Running the Game

The game is a pure browser application — no build step required.

**Quickstart with any static file server, e.g.:**

```bash
npx serve .
# then open http://localhost:3000
```

Or with Python:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

> **Note:** The game uses ES module `<script type="importmap">` and loads Three.js from `unpkg.com`.
> A modern browser (Chrome 89+, Firefox 108+, Safari 16.4+) is required.
> An internet connection is needed for the initial CDN load.

---

## 🌿 World Overview

The world is procedurally generated at ant scale (1 world-unit ≈ 10 mm):

- **Terrain** — vertex-coloured heightmap soil
- **Grass** — 7,000 instanced blades 5–7 units tall (like trees to an ant)
- **Rocks** — 22 boulder-scale pebbles + 600 scattered micro-pebbles
- **Leaves** — 35 massive fallen leaves providing shelter
- **Twigs** — 90 fallen twig obstacles
- **Water droplets** — glistening transparent spheres
- **Mushrooms** — 18 towering fungi with random cap colours
- **Flowers** — 55 oversized blooms with randomised petal colours
- **Colony entrance** — dirt mound and entrance hole at world origin
- **Resources** — 160 scattered collectibles (seeds, food crumbs, fiber, gravel)

---

## 🏗 Building Costs

| Structure | Gravel | Fiber | Seeds |
|---|---|---|---|
| Tunnel | 10 | — | — |
| Chamber | 20 | 5 | — |
| Food Store | 15 | 10 | — |
| Nursery | 25 | 15 | — |
| Barricade | 8 | — | — |
| Pheromone Beacon | — | — | 5 |

---

## 🗂 Source Layout

```
antenboro/
├── index.html          # Game entry, UI overlays, importmap
└── src/
    ├── main.js         # Entry point (instantiates Game)
    ├── game.js         # Renderer, scene, day/night, game-state machine
    ├── world.js        # Procedural undergrowth world generation
    ├── player.js       # First-person pointer-lock controller
    ├── colony.js       # Colony simulation data model
    ├── entities.js     # Worker ants, spiders, fireflies
    ├── building.js     # Build menu & structure placement
    └── ui.js           # HUD stat-bar updates & notifications
```
