/**
 * Ant colony data-model.
 * Manages population, food stores, chambers and production timers.
 * Inspired by SimAnt's colony simulation.
 */
export class Colony {
  constructor() {
    this.name = 'Antenboro';

    // Population
    this.workers  = 12;
    this.soldiers = 3;
    this.larvae   = 8;

    // Resources
    this.foodStores    = 450;
    this.maxFoodStores = 1000;

    // Chambers – each type provides different bonuses
    this.chambers = [
      { type: 'queen',      level: 1 },
      { type: 'nursery',    level: 1 },
      { type: 'food-store', level: 1 },
      { type: 'worker',     level: 1 },
    ];

    // Misc
    this.day    = 1;
    this.morale = 80;

    // Timers (seconds)
    this._foodTimer    = 0;
    this._growthTimer  = 0;
    this._moraleTimer  = 0;
  }

  get population() {
    return this.workers + this.soldiers + this.larvae;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(delta) {
    // Colony food consumption every 5s
    this._foodTimer += delta;
    if (this._foodTimer >= 5) {
      this._foodTimer = 0;
      const consumption = this.workers * 0.08 + this.soldiers * 0.14;
      this.foodStores   = Math.max(0, this.foodStores - consumption);
    }

    // Worker production when food is sufficient (every 30s)
    this._growthTimer += delta;
    if (this._growthTimer >= 30) {
      this._growthTimer = 0;
      if (this.foodStores > 180 && Math.random() < 0.72) {
        this.workers++;
        window.__game?.ui.notify('A new worker has hatched! 🐜');
      }
      // Larvae become workers/soldiers
      if (this.larvae > 3) {
        const maturing = Math.floor(this.larvae * 0.3);
        this.larvae  -= maturing;
        this.workers += Math.max(0, maturing - 1);
        if (Math.random() < 0.25) this.soldiers++;
      }
    }

    // Morale drift
    this._moraleTimer += delta;
    if (this._moraleTimer >= 3) {
      this._moraleTimer = 0;
      if (this.foodStores < 80) {
        this.morale = Math.max(0, this.morale - 2);
      } else {
        this.morale = Math.min(100, this.morale + 1);
      }
    }

    this._updateUI();
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  addFood(amount) {
    this.foodStores = Math.min(this.maxFoodStores, this.foodStores + amount);
  }

  addChamber(type) {
    this.chambers.push({ type, level: 1 });
    switch (type) {
      case 'nursery':    this.larvae      += 6;   break;
      case 'food-store': this.maxFoodStores += 500; break;
      case 'worker':     this.workers      += 3;   break;
      case 'tunnel':     /* enables more foraging routes */ break;
    }
    window.__game?.ui.notify(`${type.charAt(0).toUpperCase() + type.slice(1)} built! Colony grows stronger.`);
  }

  // ── Private ───────────────────────────────────────────────────────────────
  _updateUI() {
    document.getElementById('c-workers').textContent  = this.workers;
    document.getElementById('c-soldiers').textContent = this.soldiers;
    document.getElementById('c-larvae').textContent   = this.larvae;
    document.getElementById('c-food').textContent     =
      `${this.foodStores < 100 ? '🔴' : '🟡'} ${Math.round(this.foodStores)} mg`;
    document.getElementById('c-chambers').textContent = this.chambers.length;
    document.getElementById('c-morale').textContent   = `${Math.round(this.morale)}%`;
  }
}
