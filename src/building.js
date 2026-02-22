import * as THREE from 'three';

/**
 * Building system – manages the Build Menu UI and places colony structures
 * in the 3D world.
 *
 * Cost table (uses player's carried gravel/fiber/seed):
 *   tunnel        – 10 gravel
 *   chamber       – 20 gravel + 5 fiber
 *   food-store    – 15 gravel + 10 fiber
 *   nursery       – 25 gravel + 15 fiber
 *   barricade     –  8 gravel
 *   beacon        –  5 seeds
 */
const COSTS = {
  tunnel:     { gravel: 10 },
  chamber:    { gravel: 20, fiber: 5 },
  'food-store': { gravel: 15, fiber: 10 },
  nursery:    { gravel: 25, fiber: 15 },
  barricade:  { gravel: 8 },
  beacon:     { seed: 5 },
};

export class BuildingSystem {
  constructor(scene, world, colony, player) {
    this.scene  = scene;
    this.world  = world;
    this.colony = colony;
    this.player = player;
    this.open   = false;
    this.built  = [];

    this._bindMenu();
  }

  _bindMenu() {
    document.getElementById('btn-close-build').addEventListener('click', () => {
      this.closeBuildMenu();
    });

    document.querySelectorAll('.build-item').forEach(el => {
      el.addEventListener('click', () => {
        const type = el.dataset.build;
        this.tryBuild(type);
        this.closeBuildMenu();
      });
    });
  }

  toggleBuildMenu() {
    if (this.open) this.closeBuildMenu();
    else this.openBuildMenu();
  }

  openBuildMenu() {
    this.open = true;
    document.getElementById('build-menu').style.display = 'block';
    // Release pointer lock so cursor is usable
    document.exitPointerLock();
  }

  closeBuildMenu() {
    this.open = false;
    document.getElementById('build-menu').style.display = 'none';
    // Re-capture pointer
    window.__game?.player.lock();
  }

  tryBuild(type) {
    const cost = COSTS[type];
    if (!cost) return;

    const inv = this.player.inventory;

    // Check cost
    for (const [res, amount] of Object.entries(cost)) {
      if ((inv[res] || 0) < amount) {
        window.__game?.ui.notify(
          `Not enough ${res}! Need ${amount}, have ${inv[res] || 0}.`
        );
        return;
      }
    }

    // Deduct resources
    for (const [res, amount] of Object.entries(cost)) {
      inv[res] -= amount;
    }
    this.player._updateInventoryUI();

    // Place structure
    const pos = this.player.getPosition().clone();
    this._placeStructure(type, pos);
    this.colony.addChamber(type);
  }

  _placeStructure(type, pos) {
    const y = this.world.getHeight(pos.x, pos.z);
    let mesh;

    switch (type) {
      case 'tunnel': {
        const geom = new THREE.CylinderGeometry(0.35, 0.38, 0.12, 12);
        const mat  = new THREE.MeshLambertMaterial({ color: 0x3a220e });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, y + 0.04, pos.z);
        break;
      }
      case 'chamber': {
        const geom = new THREE.SphereGeometry(0.45, 10, 8);
        const mat  = new THREE.MeshLambertMaterial({ color: 0x4a2a10 });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, y - 0.2, pos.z);
        break;
      }
      case 'food-store': {
        const geom = new THREE.CylinderGeometry(0.28, 0.28, 0.38, 10);
        const mat  = new THREE.MeshLambertMaterial({ color: 0xc8a040 });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, y + 0.18, pos.z);
        break;
      }
      case 'nursery': {
        const geom = new THREE.TorusGeometry(0.4, 0.1, 7, 14);
        const mat  = new THREE.MeshLambertMaterial({ color: 0xffe060 });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, y + 0.12, pos.z);
        break;
      }
      case 'barricade': {
        const geom = new THREE.BoxGeometry(0.6, 0.25, 0.12);
        const mat  = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, y + 0.12, pos.z);
        mesh.rotation.y = Math.random() * Math.PI;
        this.world.collidables.push({ position: mesh.position.clone(), radius: 0.4 });
        break;
      }
      case 'beacon': {
        // Glowing pheromone beacon (PointLight + sphere)
        const geom  = new THREE.SphereGeometry(0.09, 8, 8);
        const mat   = new THREE.MeshBasicMaterial({ color: 0xaaffaa });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, y + 0.18, pos.z);
        const light = new THREE.PointLight(0x88ff88, 1.2, 5);
        light.position.copy(mesh.position);
        this.scene.add(light);
        break;
      }
    }

    if (mesh) {
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.built.push({ type, mesh });
    }
  }
}
