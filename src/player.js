import * as THREE from 'three';

/**
 * First-person ant-scout controller.
 * Uses Pointer Lock API for mouse-look.
 * The camera represents the ant's head at ~0.14 world units above the terrain.
 */
export class Player {
  constructor(camera, renderer) {
    this.camera   = camera;
    this.renderer = renderer;

    // Look angles
    this.yaw   = 0;
    this.pitch = 0;
    this.sensitivity = 0.0018;

    // Movement
    this.moveSpeed   = 2.8;   // units/sec
    this.sprintSpeed = 5.5;
    this.antHeight   = 0.13;  // eye-height above terrain

    // Keyboard state
    this.keys = {};

    // Stats
    this.health = 100; this.maxHealth = 100;
    this.food   = 75;  this.maxFood   = 100;
    this.energy = 90;  this.maxEnergy = 100;

    // Inventory
    this.inventory  = { seed: 0, food: 0, fiber: 0, gravel: 0 };
    this.activeSlot = 0;

    // Bob
    this._bobTime   = 0;
    this._bobOffset = 0;

    // Action flags (set by keydown, consumed in update)
    this._gatherPressed   = false;
    this._interactPressed = false;

    this._locked          = false;
    this._lockRequested   = false;

    this._setupControls();
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  _setupControls() {
    document.addEventListener('pointerlockchange', () => {
      this._locked = document.pointerLockElement === this.renderer.domElement;
    });

    document.addEventListener('mousemove', e => {
      if (!this._locked) return;
      this.yaw   -= e.movementX * this.sensitivity;
      this.pitch  = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1,
        this.pitch - e.movementY * this.sensitivity));
    });

    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') this._gatherPressed   = true;
      if (e.code === 'KeyE') this._interactPressed = true;

      // Hotbar
      const n = parseInt(e.key);
      if (n >= 1 && n <= 4) this._selectSlot(n - 1);
    });

    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    document.addEventListener('wheel', e => {
      this._selectSlot((this.activeSlot + (e.deltaY > 0 ? 1 : -1) + 5) % 5);
    });

    // Click canvas to capture pointer
    this.renderer.domElement.addEventListener('click', () => {
      if (this._lockRequested) this.renderer.domElement.requestPointerLock();
    });
  }

  _selectSlot(idx) {
    this.activeSlot = idx;
    document.querySelectorAll('.inv-slot').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
  }

  lock()   {
    this._lockRequested = true;
    this.renderer.domElement.requestPointerLock();
  }

  unlock() {
    this._lockRequested = false;
    document.exitPointerLock();
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(delta, world) {
    if (!this._locked) return;

    // Apply camera rotation
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

    // Build movement vector
    const sprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed     = sprinting ? this.sprintSpeed : this.moveSpeed;

    let dx = 0, dz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    dz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  dz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx*dx + dz*dz);
      dx /= len; dz /= len;

      const fwdX = -Math.sin(this.yaw);
      const fwdZ = -Math.cos(this.yaw);
      const rgtX =  Math.cos(this.yaw);
      const rgtZ = -Math.sin(this.yaw);

      const moveX = (rgtX * dx + fwdX * (-dz)) * speed * delta;
      const moveZ = (rgtZ * dx + fwdZ * (-dz)) * speed * delta;

      this.camera.position.x += moveX;
      this.camera.position.z += moveZ;

      // Walking bob
      this._bobTime  += delta * 9;
      this._bobOffset = Math.sin(this._bobTime) * 0.009;

      if (sprinting) {
        this.energy = Math.max(0, this.energy - delta * 6);
      }
    } else {
      this._bobOffset *= 0.88;
    }

    // Clamp to world bounds
    const half = 28;
    this.camera.position.x = Math.max(-half, Math.min(half, this.camera.position.x));
    this.camera.position.z = Math.max(-half, Math.min(half, this.camera.position.z));

    // Terrain follow
    const terrY = world.getHeight(this.camera.position.x, this.camera.position.z);
    this.camera.position.y = terrY + this.antHeight + this._bobOffset;

    // Gather action
    if (this._gatherPressed) {
      this._gatherPressed = false;
      this._doGather(world);
    }

    // Interact action
    if (this._interactPressed) {
      this._interactPressed = false;
      this._doInteract(world);
    }

    // Stats decay
    this.food   = Math.max(0, this.food - delta * 0.45);
    this.energy = Math.min(this.maxEnergy,
      this.energy + delta * (this.food > 15 ? 2.5 : -1.2));
    if (this.food <= 0) {
      this.health = Math.max(0, this.health - delta * 1.8);
    }
    if (this.health <= 0) {
      window.__game?.ui.notify('Your scout has fallen… The colony mourns.');
      this.health = this.maxHealth;
      this.food   = 30;
      // Respawn at colony entrance
      this.camera.position.set(0, world.getHeight(0,0) + this.antHeight, 0);
    }

    // Near-colony prompt
    const prompt = document.getElementById('interact-prompt');
    if (world.isNearColony(this.camera.position)) {
      prompt.textContent = '[E] Deposit resources';
      prompt.style.opacity = '1';
    } else {
      prompt.style.opacity = '0';
    }
  }

  _doGather(world) {
    const near = world.getResourcesNear(this.camera.position, 1.8);
    if (near.length === 0) {
      window.__game?.ui.notify('Nothing nearby to gather. [F]');
      return;
    }
    const r = near[0];
    world.collectResource(r);
    this.inventory[r.type] = (this.inventory[r.type] || 0) + 1;
    this._updateInventoryUI();
    window.__game?.ui.notify(`Gathered ${r.type}! (${this.inventory[r.type]} carried)`);
  }

  _doInteract(world) {
    if (world.isNearColony(this.camera.position)) {
      // Deposit all resources into the colony
      const col = window.__game?.colony;
      if (!col) return;
      let deposited = 0;
      if (this.inventory.food > 0) {
        col.addFood(this.inventory.food * 20);
        deposited += this.inventory.food;
        this.inventory.food = 0;
      }
      if (this.inventory.seed > 0) {
        col.addFood(this.inventory.seed * 10);
        deposited += this.inventory.seed;
        this.inventory.seed = 0;
      }
      if (deposited > 0) {
        window.__game?.ui.notify(`Deposited ${deposited} items into the colony! 🐜`);
        this._updateInventoryUI();
      } else {
        window.__game?.ui.notify('No food items to deposit.');
      }
    }
  }

  _updateInventoryUI() {
    document.getElementById('inv-seed').textContent   = this.inventory.seed   || 0;
    document.getElementById('inv-food').textContent   = this.inventory.food   || 0;
    document.getElementById('inv-fiber').textContent  = this.inventory.fiber  || 0;
    document.getElementById('inv-gravel').textContent = this.inventory.gravel || 0;
  }

  // ── Damage / Heal ─────────────────────────────────────────────────────────
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    const v = document.getElementById('dmg-flash');
    v.style.opacity = '1';
    setTimeout(() => { v.style.opacity = '0'; }, 160);
  }

  heal(amount)  { this.health = Math.min(this.maxHealth, this.health + amount); }
  feedPlayer(a) { this.food   = Math.min(this.maxFood,   this.food   + a); }

  getPosition() { return this.camera.position; }
}
