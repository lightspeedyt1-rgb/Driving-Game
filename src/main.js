/**
 * OPEN ROAD FESTIVAL - Main Game Engine Orchestrator
 */

import { MathUtils } from './math.js';
import { SaveManager } from './save.js';
import { AudioManager } from './audio.js';
import { World } from './world.js';
import { VEHICLE_DEFINITIONS, VehicleModelBuilder } from './vehicles.js';
import { VehiclePhysics } from './physics.js';
import { CameraController } from './camera.js';
import { TrafficSystem } from './traffic.js';
import { EventSystem } from './events.js';
import { InputManager } from './input.js';
import { UIManager } from './ui.js';

export class Game {
  constructor() {
    this.gameState = 'FREE_ROAM'; // 'FREE_ROAM', 'IN_EVENT', 'GARAGE', 'MAP', 'PAUSED'
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('webgl-canvas');

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.saveManager = null;
    this.audioManager = null;
    this.world = null;
    this.physics = null;
    this.cameraController = null;
    this.traffic = null;
    this.eventSystem = null;
    this.input = null;
    this.ui = null;

    // Active vehicle references
    this.currentCarId = 'breeze_rs';
    this.carGroup = null;
    this.chassisMesh = null;
    this.wheelMeshes = null;
    this.activeWingMesh = null;
    this.steeringWheelMesh = null;
    this.carBodyMaterial = null;

    this.lastFrameTime = performance.now();
    this.fpsCounter = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;

    this.init();
  }

  init() {
    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 3000);
    this.camera.position.set(0, 5, -15);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 3. Core Subsystems
    this.saveManager = new SaveManager();
    this.audioManager = new AudioManager(this.saveManager);
    this.input = new InputManager();
    this.cameraController = new CameraController(this.camera, this.canvas);

    // 4. World Generation
    this.world = new World(this.scene, this.renderer);

    // 5. Build Initial Vehicle
    this.currentCarId = this.saveManager.data.selectedVehicleId || 'breeze_rs';
    this.spawnVehicle(this.currentCarId);

    // 6. Traffic & Events
    this.traffic = new TrafficSystem(this.scene, this.world);
    this.eventSystem = new EventSystem(this.scene, this.world, this.saveManager, this.audioManager);

    // 7. UI Manager
    this.ui = new UIManager(this);

    // 8. Apply saved graphics settings
    this.applyGraphicsSettings();

    // 9. Resize Listener
    window.addEventListener('resize', () => this.onWindowResize());

    // 10. First User Interaction to unlock AudioContext
    const unlockAudio = () => {
      this.audioManager.init();
      this.audioManager.resume();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // 11. Start Game Loop
    requestAnimationFrame((t) => this.animate(t));
  }

  spawnVehicle(carId) {
    if (this.carGroup) {
      this.scene.remove(this.carGroup);
    }

    const def = VEHICLE_DEFINITIONS[carId] || VEHICLE_DEFINITIONS['breeze_rs'];
    const paintColor = this.saveManager.data.vehiclePaints[carId] || def.defaultColor;

    const carBuild = VehicleModelBuilder.buildVehicle(carId, paintColor);
    this.carGroup = carBuild.group;
    this.chassisMesh = carBuild.chassis;
    this.wheelMeshes = carBuild.wheels;
    this.activeWingMesh = carBuild.activeWing;
    this.steeringWheelMesh = carBuild.steeringWheel;
    this.carBodyMaterial = carBuild.bodyMaterial;

    this.scene.add(this.carGroup);

    // Initialize Vehicle Physics
    const prevPos = this.physics ? this.physics.position.clone() : new THREE.Vector3(0, 4, 80);
    this.physics = new VehiclePhysics(def, this.world, this.saveManager);
    this.physics.position.copy(prevPos);
    this.physics.resetVehicle(prevPos);
  }

  switchVehicle(carId) {
    this.currentCarId = carId;
    this.saveManager.data.selectedVehicleId = carId;
    this.saveManager.save();
    this.spawnVehicle(carId);
  }

  updateCurrentCarPaint(hex) {
    if (this.carBodyMaterial) {
      this.carBodyMaterial.color.set(hex);
    }
  }

  applyGraphicsSettings() {
    const s = this.saveManager.data.settings;
    if (s.graphicsPreset === 'perf') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
    } else if (s.graphicsPreset === 'quality' || s.graphicsPreset === 'ultra') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  resumeGame() {
    this.ui.closeAllModals();
    this.gameState = this.eventSystem.activeEvent ? 'IN_EVENT' : 'FREE_ROAM';
  }

  animate(currentTime) {
    requestAnimationFrame((t) => this.animate(t));

    const dt = Math.min(0.05, (currentTime - this.lastFrameTime) * 0.001);
    this.lastFrameTime = currentTime;

    // FPS calculation
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fpsCounter = Math.round((this.frameCount / this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Poll Inputs
    const inputState = this.input.poll();

    // Global Key Handlers
    if (inputState.map) {
      if (this.gameState === 'MAP') this.resumeGame();
      else this.ui.openWorldMap();
    } else if (inputState.garage) {
      if (this.gameState === 'GARAGE') this.resumeGame();
      else this.ui.openGarage();
    } else if (inputState.pause) {
      if (this.gameState === 'PAUSED' || this.gameState === 'GARAGE' || this.gameState === 'MAP') {
        this.resumeGame();
      } else {
        this.ui.openPauseMenu();
      }
    } else if (inputState.camera) {
      const modeName = this.cameraController.nextMode();
      this.ui.showToast("Camera View", modeName);
    } else if (inputState.reset) {
      this.physics.resetVehicle();
      this.ui.showToast("Vehicle Reset", "Spawned on nearest road");
    } else if (inputState.interact && this.ui.activePromptEventId) {
      this.eventSystem.startEvent(this.ui.activePromptEventId, this.physics);
      this.gameState = 'IN_EVENT';
    }

    // Active Gameplay Simulation (only when not in full modal pause)
    if (this.gameState === 'FREE_ROAM' || this.gameState === 'IN_EVENT') {
      // 1. Vehicle Dynamics Physics update
      this.physics.update(
        dt,
        inputState,
        this.carGroup,
        this.chassisMesh,
        this.wheelMeshes,
        this.activeWingMesh,
        this.steeringWheelMesh
      );

      // 2. Camera tracking
      this.cameraController.update(dt, this.physics, this.carGroup);

      // 3. AI Traffic
      this.traffic.update(dt, this.physics.position, this.physics);

      // 4. World Day/Night & Environment
      this.world.update(dt, this.physics.position);

      // 5. Events & Activities update
      this.eventSystem.update(
        dt,
        this.physics,
        (finishResult) => this.ui.openFinishScreen(finishResult),
        (name, spd, stars) => this.ui.showSpeedTrapFlash(name, spd, stars)
      );

      // 6. Audio modulation
      this.audioManager.updateVehicleAudio(
        {
          rpm: this.physics.engineRpm,
          throttle: this.physics.throttle,
          speedMps: this.physics.speedMps,
          slipRatio: Math.abs(this.physics.slipAngle),
          isNitro: this.physics.isNitroActive
        },
        this.physics.def
      );
    }

    // UI HUD update
    this.ui.update(dt, this.physics, this.world, this.eventSystem);

    // Render WebGL Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate Game on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
