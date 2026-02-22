import * as THREE from 'three';

/**
 * Procedural undergrowth world – everything is scaled from an ant's perspective.
 * 1 world-unit ≈ 10 mm.  The player camera sits at ~0.14 units (1.4 mm, ant eye-level).
 * Grass blades: 4–8 units tall (~40–80 mm).  Pebbles: 0.3–2 units.  Leaves: 3–5 units.
 */
export class World {
  constructor(scene) {
    this.scene     = scene;
    this.worldSize = 60;
    this.resources = [];      // { type, value, position, mesh, collected }
    this.collidables = [];    // { position, radius }
    this.generated = false;
  }

  // ── Noise helper (sum of sinusoids) ──────────────────────────────────────
  _noise(x, z) {
    return (
      Math.sin(x * 0.28 + z * 0.71) * 0.45 +
      Math.sin(x * 0.71 - z * 0.33) * 0.30 +
      Math.sin(x * 1.31 + z * 0.52) * 0.15 +
      Math.sin(x * 0.09 + z * 0.11) * 1.40
    );
  }

  getHeight(x, z) {
    return Math.max(0, this._noise(x, z) * 0.28);
  }

  // ── Entry point ───────────────────────────────────────────────────────────
  generate() {
    if (this.generated) return;
    this.generated = true;
    this._createTerrain();
    this._createGrass();
    this._createRocks();
    this._createLeaves();
    this._createTwigs();
    this._createWaterDroplets();
    this._createMushrooms();
    this._createFlowers();
    this._createColonyEntrance();
    this._spawnResources();
  }

  // ── Terrain ───────────────────────────────────────────────────────────────
  _createTerrain() {
    const seg  = 100;
    const geom = new THREE.PlaneGeometry(this.worldSize, this.worldSize, seg, seg);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.getHeight(x, z);
      pos.setY(i, h);

      // Vertex-colour soil mix
      const t = Math.min(1, h * 4);
      colors[i * 3]     = 0.22 + t * 0.09 + Math.random() * 0.04;
      colors[i * 3 + 1] = 0.15 + t * 0.14 + Math.random() * 0.04;
      colors[i * 3 + 2] = 0.08 + t * 0.04;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  // ── Grass blades (instanced) ──────────────────────────────────────────────
  _createGrass() {
    const bladeGeom = this._buildGrassBladeGeometry();
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    const COUNT = 7000;
    const mesh  = new THREE.InstancedMesh(bladeGeom, mat, COUNT);
    mesh.castShadow = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * this.worldSize;
      const z = (Math.random() - 0.5) * this.worldSize;
      const y = this.getHeight(x, z);
      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s, s + Math.random() * 0.6, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const hue = 0.24 + Math.random() * 0.09;
      const sat = 0.55 + Math.random() * 0.2;
      const lig = 0.22 + Math.random() * 0.14;
      mesh.setColorAt(i, new THREE.Color().setHSL(hue, sat, lig));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  _buildGrassBladeGeometry() {
    const geom = new THREE.BufferGeometry();
    const segs = 4;
    const h    = 5.5; // ~55 mm tall – towering from ant perspective
    const w    = 0.07;

    const positions = [], normals = [], uvs = [], indices = [];
    for (let i = 0; i <= segs; i++) {
      const t    = i / segs;
      const bw   = w * (1 - t * 0.85);
      const by   = t * h;
      const bend = Math.sin(t * Math.PI * 0.4) * 0.25;
      positions.push(-bw, by, bend,  bw, by, bend);
      normals.push(0, 0, 1,  0, 0, 1);
      uvs.push(0, t,  1, t);
    }
    for (let i = 0; i < segs; i++) {
      const a = i*2, b = i*2+1, c = i*2+2, d = i*2+3;
      indices.push(a, b, c,  b, d, c);
    }
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
    geom.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  // ── Rocks / Pebbles ───────────────────────────────────────────────────────
  _createRocks() {
    const baseGeom = new THREE.DodecahedronGeometry(1, 1);

    // "Boulders" – pebbles that dwarf an ant
    for (let i = 0; i < 22; i++) {
      const mat  = new THREE.MeshLambertMaterial({ color: 0x606060 });
      const mesh = new THREE.Mesh(baseGeom, mat);
      const x    = (Math.random() - 0.5) * 50;
      const z    = (Math.random() - 0.5) * 50;
      const y    = this.getHeight(x, z);
      const s    = 0.4 + Math.random() * 2.2;
      mesh.position.set(x, y, z);
      mesh.scale.set(s, s * 0.65, s * (0.8 + Math.random() * 0.4));
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      const g = 0.28 + Math.random() * 0.35;
      mat.color.setRGB(g, g * 0.92, g * 0.88);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.collidables.push({ position: new THREE.Vector3(x, y, z), radius: s * 1.3 });
    }

    // Scattered pebbles (instanced)
    const pGeom = new THREE.DodecahedronGeometry(0.055, 0);
    const pMat  = new THREE.MeshLambertMaterial({ color: 0x909090 });
    const pMesh = new THREE.InstancedMesh(pGeom, pMat, 600);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 600; i++) {
      const x = (Math.random() - 0.5) * this.worldSize;
      const z = (Math.random() - 0.5) * this.worldSize;
      const y = this.getHeight(x, z) + 0.028;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random()*2, Math.random()*2, Math.random()*2);
      const s = 0.5 + Math.random() * 1.0;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      pMesh.setMatrixAt(i, dummy.matrix);
    }
    pMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(pMesh);
  }

  // ── Fallen leaves ─────────────────────────────────────────────────────────
  _createLeaves() {
    for (let i = 0; i < 35; i++) {
      const rx   = 2.2 + Math.random() * 1.5;
      const rz   = 1.2 + Math.random() * 1.0;
      const geom = new THREE.EllipseCurve(0, 0, rx, rz, 0, Math.PI*2, false, 0);
      const pts  = geom.getPoints(12);
      const shp  = new THREE.Shape(pts);
      const sg   = new THREE.ShapeGeometry(shp, 6);
      const hue  = 0.06 + Math.random() * 0.12;
      const mat  = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(hue, 0.55, 0.28 + Math.random() * 0.18),
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(sg, mat);
      const x    = (Math.random() - 0.5) * 50;
      const z    = (Math.random() - 0.5) * 50;
      const y    = this.getHeight(x, z) + 0.018;
      mesh.position.set(x, y, z);
      mesh.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.35;
      mesh.rotation.z = Math.random() * Math.PI * 2;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      // Leaves provide slight collision (very flat)
      this.collidables.push({ position: new THREE.Vector3(x, y, z), radius: rx });
    }
  }

  // ── Twigs ─────────────────────────────────────────────────────────────────
  _createTwigs() {
    const geom  = new THREE.CylinderGeometry(0.018, 0.030, 4.5, 5);
    const mat   = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
    const imesh = new THREE.InstancedMesh(geom, mat, 90);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 90; i++) {
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const y = this.getHeight(x, z) + 0.015;
      dummy.position.set(x, y, z);
      dummy.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      dummy.rotation.z = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      imesh.setMatrixAt(i, dummy.matrix);
    }
    imesh.instanceMatrix.needsUpdate = true;
    this.scene.add(imesh);
  }

  // ── Water droplets ────────────────────────────────────────────────────────
  _createWaterDroplets() {
    const geom = new THREE.SphereGeometry(0.09, 8, 8);
    const mat  = new THREE.MeshPhongMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.58,
      shininess: 220, specular: 0xffffff
    });
    for (let i = 0; i < 45; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      const x    = (Math.random() - 0.5) * 44;
      const z    = (Math.random() - 0.5) * 44;
      const y    = this.getHeight(x, z) + 0.09;
      mesh.position.set(x, y, z);
      const s = 0.5 + Math.random() * 1.4;
      mesh.scale.set(s, s * 0.75, s);
      this.scene.add(mesh);
    }
  }

  // ── Mushrooms ────────────────────────────────────────────────────────────
  _createMushrooms() {
    for (let i = 0; i < 18; i++) {
      const x    = (Math.random() - 0.5) * 50;
      const z    = (Math.random() - 0.5) * 50;
      const y    = this.getHeight(x, z);
      const grp  = this._buildMushroom();
      const s    = 0.25 + Math.random() * 1.4;
      grp.position.set(x, y, z);
      grp.scale.setScalar(s);
      grp.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(grp);
      this.collidables.push({ position: new THREE.Vector3(x, y, z), radius: s * 0.55 });
    }
  }

  _buildMushroom() {
    const grp = new THREE.Group();
    // Stem
    const stemG = new THREE.CylinderGeometry(0.07, 0.10, 0.65, 8);
    const stemM = new THREE.MeshLambertMaterial({ color: 0xeeddcc });
    const stem  = new THREE.Mesh(stemG, stemM);
    stem.position.y = 0.325;
    grp.add(stem);
    // Cap
    const capColors = [0xcc2222, 0xdd4422, 0xcc7722, 0x9922aa];
    const capG = new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI*2, 0, Math.PI*0.52);
    const capM = new THREE.MeshLambertMaterial({
      color: capColors[Math.floor(Math.random() * capColors.length)],
      side: THREE.DoubleSide
    });
    const cap = new THREE.Mesh(capG, capM);
    cap.position.y = 0.67;
    grp.add(cap);
    // Spots
    for (let s = 0; s < 5; s++) {
      const sg = new THREE.CircleGeometry(0.055, 6);
      const sm = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const sp = new THREE.Mesh(sg, sm);
      const a  = Math.PI * 0.15 + Math.random() * Math.PI * 0.35;
      const p  = Math.random() * Math.PI * 2;
      sp.position.set(
        Math.sin(a) * Math.cos(p) * 0.43,
        0.67 + Math.cos(a) * 0.22,
        Math.sin(a) * Math.sin(p) * 0.43
      );
      sp.lookAt(sp.position.clone().multiplyScalar(2));
      grp.add(sp);
    }
    return grp;
  }

  // ── Flowers ───────────────────────────────────────────────────────────────
  _createFlowers() {
    for (let i = 0; i < 55; i++) {
      const x   = (Math.random() - 0.5) * 50;
      const z   = (Math.random() - 0.5) * 50;
      const y   = this.getHeight(x, z);
      const grp = this._buildFlower();
      const s   = 0.35 + Math.random() * 0.75;
      grp.position.set(x, y, z);
      grp.scale.setScalar(s);
      grp.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(grp);
    }
  }

  _buildFlower() {
    const grp = new THREE.Group();
    // Stem
    const sG = new THREE.CylinderGeometry(0.016, 0.022, 2.8, 5);
    const sM = new THREE.MeshLambertMaterial({ color: 0x3a7a1a });
    const st = new THREE.Mesh(sG, sM);
    st.position.y = 1.4;
    grp.add(st);
    // Petals
    const petalCols = [0xff6680, 0xffcc00, 0xff8833, 0xcc44ff, 0x44aaff, 0xffffff, 0xff44aa];
    const col = petalCols[Math.floor(Math.random() * petalCols.length)];
    for (let p = 0; p < 6; p++) {
      const curve = new THREE.EllipseCurve(0, 0.22, 0.14, 0.38, 0, Math.PI * 2, false, 0);
      const pts   = curve.getPoints(8);
      const shp   = new THREE.Shape(pts);
      const pG    = new THREE.ShapeGeometry(shp);
      const pM    = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide });
      const petal = new THREE.Mesh(pG, pM);
      petal.position.y = 2.78;
      petal.rotation.z = (p / 6) * Math.PI * 2;
      petal.rotation.x = -Math.PI / 2 + 0.18;
      grp.add(petal);
    }
    // Centre
    const cG = new THREE.SphereGeometry(0.13, 8, 8);
    const cM = new THREE.MeshLambertMaterial({ color: 0xffe040 });
    const ct = new THREE.Mesh(cG, cM);
    ct.position.y = 2.82;
    grp.add(ct);
    return grp;
  }

  // ── Colony entrance ───────────────────────────────────────────────────────
  _createColonyEntrance() {
    const grp = new THREE.Group();

    // Soil mound
    const mG = new THREE.TorusGeometry(0.9, 0.28, 8, 14);
    const mM = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
    const mound = new THREE.Mesh(mG, mM);
    mound.rotation.x = -Math.PI / 2;
    mound.position.y = 0.05;
    grp.add(mound);

    // Entrance hole
    const hG = new THREE.CircleGeometry(0.55, 18);
    const hM = new THREE.MeshLambertMaterial({ color: 0x08040a });
    const hole = new THREE.Mesh(hG, hM);
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.012;
    grp.add(hole);

    // Scattered debris
    for (let i = 0; i < 24; i++) {
      const dG = new THREE.DodecahedronGeometry(0.035 + Math.random() * 0.055, 0);
      const dM = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.07, 0.38, 0.18 + Math.random() * 0.14)
      });
      const d = new THREE.Mesh(dG, dM);
      const a = Math.random() * Math.PI * 2;
      const r = 0.65 + Math.random() * 0.9;
      d.position.set(Math.cos(a)*r, 0.03, Math.sin(a)*r);
      grp.add(d);
    }

    grp.position.set(0, 0, 0);
    this.scene.add(grp);
    this.colonyEntrancePos = new THREE.Vector3(0, 0, 0);
  }

  // ── Resource spawning ─────────────────────────────────────────────────────
  _spawnResources() {
    const types = [
      { type: 'seed',   color: 0xd4a843, shape: 'sphere',    scale: 0.05, value: 10 },
      { type: 'food',   color: 0xc8a060, shape: 'box',       scale: 0.04, value: 20 },
      { type: 'fiber',  color: 0x7a9a4a, shape: 'cylinder',  scale: 0.03, value: 5  },
      { type: 'gravel', color: 0x909090, shape: 'dodeca',    scale: 0.04, value: 8  },
    ];

    for (let i = 0; i < 160; i++) {
      const td = types[Math.floor(Math.random() * types.length)];
      const x  = (Math.random() - 0.5) * 50;
      const z  = (Math.random() - 0.5) * 50;
      const y  = this.getHeight(x, z) + 0.05;

      let geom;
      const sc = td.scale;
      switch (td.shape) {
        case 'sphere':   geom = new THREE.SphereGeometry(sc, 6, 6); break;
        case 'box':      geom = new THREE.BoxGeometry(sc*2, sc, sc*1.5); break;
        case 'cylinder': geom = new THREE.CylinderGeometry(sc*0.5, sc*0.5, sc*3.5, 5); break;
        default:         geom = new THREE.DodecahedronGeometry(sc, 0);
      }

      const mat  = new THREE.MeshLambertMaterial({ color: td.color });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      this.scene.add(mesh);

      this.resources.push({
        type: td.type, value: td.value,
        position: new THREE.Vector3(x, y, z),
        mesh, collected: false
      });
    }
  }

  // ── Public helpers ────────────────────────────────────────────────────────
  getResourcesNear(pos, radius) {
    return this.resources.filter(r => !r.collected && r.position.distanceTo(pos) < radius);
  }

  collectResource(resource) {
    resource.collected = true;
    this.scene.remove(resource.mesh);
    resource.mesh.geometry.dispose();
    resource.mesh.material.dispose();
  }

  isNearColony(pos) {
    return this.colonyEntrancePos && pos.distanceTo(this.colonyEntrancePos) < 2.0;
  }
}
