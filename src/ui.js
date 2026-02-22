/**
 * UI manager – updates HUD stat bars and shows timed notifications.
 */
export class UI {
  constructor(player, colony) {
    this.player = player;
    this.colony = colony;

    this._notifyTimeout = null;

    this._healthEl = document.getElementById('health-fill');
    this._foodEl   = document.getElementById('food-fill');
    this._energyEl = document.getElementById('energy-fill');
    this._notifEl  = document.getElementById('notification');
  }

  // ── Called every frame ────────────────────────────────────────────────────
  update() {
    const p = this.player;
    this._healthEl.style.width = `${(p.health / p.maxHealth) * 100}%`;
    this._foodEl.style.width   = `${(p.food   / p.maxFood)   * 100}%`;
    this._energyEl.style.width = `${(p.energy / p.maxEnergy) * 100}%`;

    // Pulse health bar red when low
    if (p.health < 30) {
      this._healthEl.style.filter = `brightness(${1 + Math.sin(Date.now() * 0.006) * 0.4})`;
    } else {
      this._healthEl.style.filter = '';
    }
  }

  // ── Notification banner ───────────────────────────────────────────────────
  notify(message, duration = 3200) {
    clearTimeout(this._notifyTimeout);

    this._notifEl.style.whiteSpace = 'pre-line';
    this._notifEl.textContent = message;
    this._notifEl.style.opacity = '1';

    this._notifyTimeout = setTimeout(() => {
      this._notifEl.style.opacity = '0';
    }, duration);
  }
}
