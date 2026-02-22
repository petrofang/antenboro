import * as THREE from 'three';

// ── Entity base ───────────────────────────────────────────────────────────
class Entity {
  constructor(scene) {
    this.scene  = scene;
    this.mesh   = null;
    this.alive  = true;
    this.health = 100;
  }

  destroy() {
    this.alive = false;
    if (this.mesh) this.scene.remove(this.mesh);
  }
}

// ── Worker Ant ────────────────────────────────────────────────────────────
class WorkerAnt extends Entity {
  constructor(scene, world, startPos) {
    super(scene);
    this.world   = world;
    this.target  = startPos.clone();
    this.speed   = 0.9 + Math.random() * 0.6;
    this.timer   = Math.random() * 5; // stagger wander
    this.mesh    = this._buildMesh();
    this.mesh.position.copy(startPos);
    scene.add(this.mesh);
  }

  _buildMesh() {
    const grp = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a0d08 });

    // Abdomen (gaster)
    const abdG = new THREE.SphereGeometry(0.055, 7, 6);
    abdG.scale(1, 0.85, 1.3);
    const abd = new THREE.Mesh(abdG, bodyMat);
    abd.position.z = -0.11;
    grp.add(abd);

    // Thorax
    const thrG = new THREE.SphereGeometry(0.038, 7, 6);
    const thr  = new THREE.Mesh(thrG, bodyMat);
    grp.add(thr);

    // Head
    const headG = new THREE.SphereGeometry(0.032, 7, 6);
    const head  = new THREE.Mesh(headG, bodyMat);
    head.position.z = 0.08;
    grp.add(head);

    // Antennae
    const antMat = new THREE.MeshLambertMaterial({ color: 0x2a1a10 });
    for (let side = -1; side <= 1; side += 2) {
      const aG = new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4);
      const a  = new THREE.Mesh(aG, antMat);
      a.position.set(side * 0.018, 0.04, 0.1);
      a.rotation.z = side * 0.35;
      a.rotation.x = -0.6;
      grp.add(a);
    }

    // 6 legs
    for (let i = 0; i < 3; i++) {
      for (let side = -1; side <= 1; side += 2) {
        const lG  = new THREE.CylinderGeometry(0.003, 0.003, 0.12, 3);
        const leg = new THREE.Mesh(lG, antMat);
        leg.position.set(side * 0.055, -0.025, (i - 1) * 0.04);
        leg.rotation.z = side * 0.8;
        leg.rotation.x = 0.3 * (i - 1);
        grp.add(leg);
      }
    }

    grp.scale.setScalar(1.2);
    return grp;
  }

  update(delta) {
    if (!this.alive) return;

    this.timer -= delta;
    if (this.timer <= 0) {
      // Pick new wander target near colony or random
      const angle = Math.random() * Math.PI * 2;
      const dist  = 2 + Math.random() * 10;
      this.target.set(
        Math.cos(angle) * dist,
        0,
        Math.sin(angle) * dist
      );
      this.timer = 4 + Math.random() * 8;
    }

    // Move toward target
    const dx    = this.target.x - this.mesh.position.x;
    const dz    = this.target.z - this.mesh.position.z;
    const dist  = Math.sqrt(dx*dx + dz*dz);

    if (dist > 0.15) {
      this.mesh.position.x += (dx / dist) * this.speed * delta;
      this.mesh.position.z += (dz / dist) * this.speed * delta;
      this.mesh.rotation.y  = Math.atan2(dx, dz);
    }

    // Terrain follow
    const y = this.world.getHeight(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.y = y + 0.04;
  }
}

// ── Predator (Spider) ─────────────────────────────────────────────────────
class Spider extends Entity {
  constructor(scene, world, startPos) {
    super(scene);
    this.world      = world;
    this.speed      = 1.4 + Math.random() * 0.8;
    this.health     = 60;
    this.aggro      = false;
    this.aggroRange = 4.5;
    this._wanderTarget = startPos.clone();
    this._wanderTimer  = Math.random() * 6;
    this.mesh          = this._buildMesh();
    this.mesh.position.copy(startPos);
    scene.add(this.mesh);
  }

  _buildMesh() {
    const grp = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a2a18 });

    // Body
    const bG = new THREE.SphereGeometry(0.08, 8, 7);
    bG.scale(1, 0.7, 1.2);
    grp.add(new THREE.Mesh(bG, mat));

    // Head
    const hG = new THREE.SphereGeometry(0.052, 8, 7);
    const h  = new THREE.Mesh(hG, mat);
    h.position.z = 0.13;
    grp.add(h);

    // 8 legs
    const lMat = new THREE.MeshLambertMaterial({ color: 0x2a1c0e });
    for (let i = 0; i < 4; i++) {
      for (let side = -1; side <= 1; side += 2) {
        const lG  = new THREE.CylinderGeometry(0.005, 0.005, 0.22, 4);
        const leg = new THREE.Mesh(lG, lMat);
        const angle = (i / 4 - 0.5) * Math.PI * 0.7;
        leg.position.set(side * 0.10, -0.02, Math.sin(angle) * 0.06);
        leg.rotation.z = side * (0.9 + i * 0.15);
        leg.rotation.x = angle * 0.4;
        grp.add(leg);
      }
    }

    // Eyes (tiny red dots)
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0xff2200 });
    for (let e = -1; e <= 1; e += 2) {
      const eG   = new THREE.SphereGeometry(0.008, 4, 4);
      const eye  = new THREE.Mesh(eG, eyeMat);
      eye.position.set(e * 0.022, 0.022, 0.175);
      grp.add(eye);
    }

    grp.scale.setScalar(1.4);
    return grp;
  }

  update(delta, playerPos) {
    if (!this.alive) return;

    const toPlayer = playerPos.distanceTo(this.mesh.position);

    if (toPlayer < this.aggroRange) {
      // Chase
      this.aggro = true;
      const dx = playerPos.x - this.mesh.position.x;
      const dz = playerPos.z - this.mesh.position.z;
      const d  = Math.sqrt(dx*dx + dz*dz);
      if (d > 0.1) {
        this.mesh.position.x += (dx/d) * this.speed * 1.6 * delta;
        this.mesh.position.z += (dz/d) * this.speed * 1.6 * delta;
        this.mesh.rotation.y  = Math.atan2(dx, dz);
      }

      // Bite
      if (toPlayer < 0.7) {
        window.__game?.player.takeDamage(10 * delta);
      }
    } else {
      this.aggro = false;
      // Wander
      this._wanderTimer -= delta;
      if (this._wanderTimer <= 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 12;
        this._wanderTarget.set(Math.cos(a)*r, 0, Math.sin(a)*r);
        this._wanderTimer = 5 + Math.random() * 10;
      }
      const dx = this._wanderTarget.x - this.mesh.position.x;
      const dz = this._wanderTarget.z - this.mesh.position.z;
      const d  = Math.sqrt(dx*dx + dz*dz);
      if (d > 0.25) {
        this.mesh.position.x += (dx/d) * this.speed * delta;
        this.mesh.position.z += (dz/d) * this.speed * delta;
        this.mesh.rotation.y  = Math.atan2(dx, dz);
      }
    }

    const y = this.world.getHeight(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.y = y + 0.065;
  }
}

// ── Firefly (bioluminescent glow at night) ────────────────────────────────
class Firefly extends Entity {
  constructor(scene, world, startPos) {
    super(scene);
    this.world  = world;
    this._time  = Math.random() * Math.PI * 2;
    this._orbit = startPos.clone();

    const light = new THREE.PointLight(0x88ffaa, 0, 3);
    light.position.copy(startPos);

    const dotG = new THREE.SphereGeometry(0.02, 5, 5);
    const dotM = new THREE.MeshBasicMaterial({ color: 0xaaffcc });
    this.mesh  = new THREE.Mesh(dotG, dotM);
    this.mesh.position.copy(startPos);
    this.light = light;

    scene.add(this.mesh);
    scene.add(light);
  }

  update(delta) {
    if (!this.alive) return;
    this._time += delta * (0.5 + Math.random() * 0.1);

    this.mesh.position.x = this._orbit.x + Math.sin(this._time * 0.9) * 1.4;
    this.mesh.position.z = this._orbit.z + Math.cos(this._time * 0.7) * 1.4;
    this.mesh.position.y = this._orbit.y + 0.6 + Math.sin(this._time * 1.1) * 0.4;
    this.light.position.copy(this.mesh.position);

    // Pulse intensity based on dayTime
    const dayness = window.__game
      ? Math.max(0, Math.sin(window.__game.dayTime * Math.PI * 2 - Math.PI / 2))
      : 0;
    this.light.intensity = (1 - dayness) * (0.6 + Math.sin(this._time * 3) * 0.35);
  }

  destroy() {
    super.destroy();
    if (this.light) this.scene.remove(this.light);
  }
}

// ── Manager ───────────────────────────────────────────────────────────────
export class EntityManager {
  constructor(scene, world, colony) {
    this.scene   = scene;
    this.world   = world;
    this.colony  = colony;
    this.workers  = [];
    this.predators = [];
    this.fireflies = [];
  }

  spawnInitial() {
    // Worker ants near colony entrance
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 4;
      const pos = new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r);
      this.workers.push(new WorkerAnt(this.scene, this.world, pos));
    }

    // Spiders around the edges
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 10;
      const pos = new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r);
      this.predators.push(new Spider(this.scene, this.world, pos));
    }

    // Fireflies throughout
    for (let i = 0; i < 18; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      const y = this.world.getHeight(x, z) + 0.3;
      this.fireflies.push(new Firefly(this.scene, this.world, new THREE.Vector3(x, y, z)));
    }
  }

  update(delta) {
    const playerPos = window.__game?.player.getPosition()
      || new THREE.Vector3(0, 0, 0);

    for (const w of this.workers)   w.update(delta);
    for (const p of this.predators) p.update(delta, playerPos);
    for (const f of this.fireflies) f.update(delta);

    // Sync visible worker count with colony population (keep rough parity)
    if (this.workers.length < Math.min(this.colony.workers, 20)) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 3;
      const pos = new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r);
      this.workers.push(new WorkerAnt(this.scene, this.world, pos));
    }
  }
}
