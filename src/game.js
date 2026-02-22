import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { Colony } from './colony.js';
import { EntityManager } from './entities.js';
import { BuildingSystem } from './building.js';
import { UI } from './ui.js';

export class Game {
  constructor() {
    this.state = 'menu'; // 'menu' | 'playing' | 'paused'
    this.clock = new THREE.Clock(false);

    // Day/night: 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
    this.dayTime = 0.28;
    this.dayDuration = 240; // real seconds per in-game day

    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLighting();

    this.world    = new World(this.scene);
    this.player   = new Player(this.camera, this.renderer);
    this.colony   = new Colony();
    this.entities = new EntityManager(this.scene, this.world, this.colony);
    this.building = new BuildingSystem(this.scene, this.world, this.colony, this.player);
    this.ui       = new UI(this.player, this.colony);

    this._bindUI();
    this._animate();
  }

  // ── Renderer ──────────────────────────────────────────────────────────────
  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this._onResize());
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x7aaa50, 0.032);
    this.scene.background = new THREE.Color(0x8abf60);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      72, window.innerWidth / window.innerHeight, 0.005, 180
    );
    this.camera.position.set(0, 0.14, 0);
  }

  _setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x405040, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5d8, 2.2);
    this.sunLight.position.set(40, 70, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far  = 250;
    const sc = this.sunLight.shadow.camera;
    sc.left = -35; sc.right = 35; sc.top = 35; sc.bottom = -35;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x88c860, 0x4a3020, 0.45);
    this.scene.add(this.hemiLight);
  }

  // ── UI Bindings ───────────────────────────────────────────────────────────
  _bindUI() {
    document.getElementById('btn-start').addEventListener('click',  () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-quit').addEventListener('click',   () => this.quitGame());
    document.getElementById('btn-controls').addEventListener('click', () => {
      this.ui.notify(
        'WASD / Arrows — Move\n' +
        'Mouse — Look (click canvas first)\n' +
        'Shift — Sprint   F — Gather\n' +
        'E — Interact     B — Build Menu\n' +
        '1–4 / Scroll — Hotbar   ESC — Pause'
      );
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
      }
      if ((e.key === 'b' || e.key === 'B') && this.state === 'playing') {
        this.building.toggleBuildMenu();
      }
    });
  }

  // ── State Transitions ─────────────────────────────────────────────────────
  startGame() {
    this.state = 'playing';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    this.world.generate();
    this.entities.spawnInitial();
    this.player.lock();
    this.clock.start();
    this.ui.notify('Welcome to the undergrowth, Scout.\nLead your colony to prosperity!');
  }

  pauseGame() {
    this.state = 'paused';
    document.getElementById('pause-screen').style.display = 'flex';
    this.player.unlock();
  }

  resumeGame() {
    this.state = 'playing';
    document.getElementById('pause-screen').style.display = 'none';
    this.player.lock();
  }

  quitGame() {
    this.state = 'menu';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
    this.player.unlock();
  }

  // ── Day / Night ───────────────────────────────────────────────────────────
  _updateDayNight(delta) {
    this.dayTime = (this.dayTime + delta / this.dayDuration) % 1.0;
    const t = this.dayTime;

    // Sunlight angle
    const angle = t * Math.PI * 2 - Math.PI / 2;
    this.sunLight.position.set(
      Math.cos(angle) * 70,
      Math.sin(angle) * 70,
      25
    );

    const dayness = Math.max(0, Math.sin(t * Math.PI * 2 - Math.PI / 2));
    const isNight = dayness < 0.08;

    if (isNight) {
      this.ambientLight.color.setHex(0x080818);
      this.ambientLight.intensity = 0.12;
      this.sunLight.intensity = 0;
      this.scene.fog.color.setHex(0x08100a);
      this.scene.background.setHex(0x050f08);
    } else {
      const isGolden = t > 0.6 && t < 0.8;
      const sunCol = isGolden
        ? new THREE.Color(0xff8040)
        : new THREE.Color(0xfff5d8);
      this.sunLight.color.copy(sunCol);
      this.sunLight.intensity = dayness * 2.6;
      this.ambientLight.intensity = 0.3 + dayness * 0.45;
      const fogDay  = new THREE.Color(0x7aaa50);
      const fogNight = new THREE.Color(0x0a160a);
      this.scene.fog.color.lerpColors(fogNight, fogDay, dayness);
      this.scene.background.lerpColors(
        new THREE.Color(0x050f08),
        new THREE.Color(0x8abf60),
        dayness
      );
    }

    // Time of day label
    let label;
    if (t < 0.12 || t > 0.92)      label = '🌙 NIGHT';
    else if (t < 0.28)              label = '🌅 DAWN';
    else if (t < 0.62)              label = '☀️ DAY';
    else if (t < 0.78)              label = '🌇 DUSK';
    else                            label = '🌙 NIGHT';
    document.getElementById('time-indicator').textContent = label;
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── Main Loop ─────────────────────────────────────────────────────────────
  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === 'playing') {
      this._updateDayNight(delta);
      this.player.update(delta, this.world);
      this.entities.update(delta);
      this.colony.update(delta);
      this.ui.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
