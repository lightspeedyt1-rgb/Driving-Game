/**
 * OPEN ROAD FESTIVAL - UI & HUD Manager
 * Modern glassmorphic HUD, Speedometer, Minimap Radar, Fullscreen Map,
 * Garage Showroom, Settings, Pause, and Event Finish modals.
 */

import { MathUtils } from './math.js';
import { VEHICLE_DEFINITIONS } from './vehicles.js';
import { EVENT_DEFINITIONS, SPEED_TRAPS } from './events.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.saveManager = game.saveManager;
    this.audioManager = game.audioManager;

    // DOM Elements Cache
    this.hudLocationArea = document.getElementById('hud-area-name');
    this.hudStreet = document.getElementById('hud-street-name');
    this.hudSurfaceTag = document.getElementById('hud-surface-tag');
    this.hudCredits = document.getElementById('hud-credits-val');
    this.hudLevel = document.getElementById('hud-level-val');

    // Speedometer Cluster
    this.hudSpeedNum = document.getElementById('hud-speed-num');
    this.hudSpeedUnit = document.getElementById('hud-speed-unit');
    this.hudGearVal = document.getElementById('hud-gear-val');
    this.hudRpmFill = document.getElementById('hud-rpm-fill');
    this.hudNitroFill = document.getElementById('hud-nitro-fill');

    // Assists
    this.assistAbs = document.getElementById('assist-abs');
    this.assistTcs = document.getElementById('assist-tcs');
    this.assistEsp = document.getElementById('assist-esp');

    // Minimap Canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas?.getContext('2d');

    // Fullscreen Map Canvas
    this.fullMapCanvas = document.getElementById('fullscreen-map-canvas');
    this.fullMapCtx = this.fullMapCanvas?.getContext('2d');
    this.mapFilter = 'ALL';

    // Drift popup
    this.driftBox = document.getElementById('hud-drift-container');
    this.driftScoreEl = document.getElementById('hud-drift-score');
    this.driftMultEl = document.getElementById('hud-drift-mult');

    // Speed trap flash
    this.speedTrapBox = document.getElementById('hud-speed-trap-flash');
    this.speedTrapNameEl = document.getElementById('hud-speed-trap-name');
    this.speedTrapValEl = document.getElementById('hud-speed-trap-val');
    this.speedTrapStarsEl = document.getElementById('hud-speed-trap-stars');

    // Event Tracker & Prompt
    this.eventTracker = document.getElementById('hud-event-tracker');
    this.eventTitleEl = document.getElementById('hud-event-title');
    this.eventTimeEl = document.getElementById('hud-event-time');
    this.eventPosEl = document.getElementById('hud-event-pos');
    this.eventFillEl = document.getElementById('hud-event-progress-fill');
    this.eventPrompt = document.getElementById('event-prompt');
    this.countdownEl = document.getElementById('race-countdown');

    // Modals
    this.garageModal = document.getElementById('garage-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.mapModal = document.getElementById('world-map-modal');
    this.finishModal = document.getElementById('event-finish-modal');

    // Toast
    this.toast = document.getElementById('notification-toast');
    this.toastTitle = document.getElementById('toast-title');
    this.toastDesc = document.getElementById('toast-desc');
    this.toastTimer = null;

    this.selectedGarageCarId = this.saveManager.data.selectedVehicleId;

    this.initEventListeners();
    this.setupGarageCarousel();
    this.initSettingsValues();
  }

  initEventListeners() {
    // Speed unit toggle
    if (this.hudSpeedUnit) {
      this.hudSpeedUnit.addEventListener('click', () => {
        const cur = this.saveManager.data.settings.units;
        const next = cur === 'mph' ? 'kmh' : 'mph';
        this.saveManager.updateSettings({ units: next });
        this.hudSpeedUnit.textContent = next.toUpperCase();
        this.showToast("Speedometer Units", `Changed to ${next.toUpperCase()}`);
      });
    }

    // Fullscreen Map filter buttons
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mapFilter = btn.dataset.filter || 'ALL';
        this.renderFullscreenMap();
      });
    });

    // Close Modal buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.game.resumeGame();
      });
    });

    // Pause menu buttons
    document.getElementById('pause-resume-btn')?.addEventListener('click', () => this.game.resumeGame());
    document.getElementById('pause-restart-btn')?.addEventListener('click', () => {
      this.game.resumeGame();
      if (this.game.eventSystem.activeEvent) {
        this.game.eventSystem.startEvent(this.game.eventSystem.activeEvent.id, this.game.physics);
      }
    });
    document.getElementById('pause-garage-btn')?.addEventListener('click', () => {
      this.closeAllModals();
      this.openGarage();
    });
    document.getElementById('pause-map-btn')?.addEventListener('click', () => {
      this.closeAllModals();
      this.openWorldMap();
    });
    document.getElementById('pause-settings-btn')?.addEventListener('click', () => {
      this.closeAllModals();
      this.openSettings();
    });
    document.getElementById('pause-quit-event-btn')?.addEventListener('click', () => {
      this.game.eventSystem.cancelEvent();
      this.game.resumeGame();
      this.showToast("Event Cancelled", "Returned to Free Roam");
    });

    // Finish Modal buttons
    document.getElementById('finish-retry-btn')?.addEventListener('click', () => {
      this.finishModal.classList.remove('open');
      if (this.game.eventSystem.activeEvent) {
        this.game.eventSystem.startEvent(this.game.eventSystem.activeEvent.id, this.game.physics);
      }
    });
    document.getElementById('finish-freeroam-btn')?.addEventListener('click', () => {
      this.finishModal.classList.remove('open');
      this.game.eventSystem.cancelEvent();
      this.game.resumeGame();
    });

    // Settings inputs
    document.getElementById('setting-graphics')?.addEventListener('change', (e) => {
      this.saveManager.updateSettings({ graphicsPreset: e.target.value });
      this.game.applyGraphicsSettings();
    });
    document.getElementById('setting-shadows')?.addEventListener('change', (e) => {
      this.saveManager.updateSettings({ shadows: e.target.value });
      this.game.applyGraphicsSettings();
    });
    document.getElementById('setting-bloom')?.addEventListener('change', (e) => {
      this.saveManager.updateSettings({ bloom: e.target.checked });
      this.game.applyGraphicsSettings();
    });
    document.getElementById('setting-abs')?.addEventListener('change', (e) => {
      this.saveManager.updateSettings({ abs: e.target.checked });
    });
    document.getElementById('setting-tcs')?.addEventListener('change', (e) => {
      this.saveManager.updateSettings({ tcs: e.target.checked });
    });
    document.getElementById('setting-esp')?.addEventListener('change', (e) => {
      this.saveManager.updateSettings({ esp: e.target.checked });
    });
    document.getElementById('setting-sensitivity')?.addEventListener('input', (e) => {
      this.saveManager.updateSettings({ steerSensitivity: parseFloat(e.target.value) });
    });
    document.getElementById('setting-weather')?.addEventListener('change', (e) => {
      this.game.world.setWeather(e.target.value);
    });

    // Volume sliders
    document.getElementById('volume-master')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.saveManager.updateSettings({ volumeMaster: v });
      this.audioManager.setVolumes(v, undefined, undefined, undefined);
    });
    document.getElementById('volume-engine')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.saveManager.updateSettings({ volumeEngine: v });
      this.audioManager.setVolumes(undefined, v, undefined, undefined);
    });
    document.getElementById('volume-music')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.saveManager.updateSettings({ volumeMusic: v });
      this.audioManager.setVolumes(undefined, undefined, undefined, v);
    });

    // Reset Progress
    document.getElementById('setting-reset-save')?.addEventListener('click', () => {
      if (confirm("Reset all festival progression and credits?")) {
        this.saveManager.resetProgress();
        location.reload();
      }
    });
  }

  setupGarageCarousel() {
    const listEl = document.getElementById('garage-car-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    Object.values(VEHICLE_DEFINITIONS).forEach(def => {
      const isUnlocked = this.saveManager.data.unlockedVehicles.includes(def.id);
      const isSelected = this.saveManager.data.selectedVehicleId === def.id;

      const btn = document.createElement('div');
      btn.className = `car-select-btn ${isSelected ? 'active' : ''}`;
      btn.dataset.carId = def.id;
      btn.innerHTML = `
        <div class="car-btn-class">${def.className}</div>
        <div class="car-btn-name">${def.name}</div>
        <div style="font-size: 11px; color: ${isUnlocked ? 'var(--success)' : 'var(--gold)'}; margin-top: 4px;">
          ${isUnlocked ? 'UNLOCKED' : MathUtils.formatCredits(def.price)}
        </div>
      `;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.car-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedGarageCarId = def.id;
        this.updateGarageDetails(def.id);
      });

      listEl.appendChild(btn);
    });

    this.updateGarageDetails(this.selectedGarageCarId);
  }

  updateGarageDetails(carId) {
    const def = VEHICLE_DEFINITIONS[carId];
    if (!def) return;

    const isUnlocked = this.saveManager.data.unlockedVehicles.includes(carId);
    const isSelected = this.saveManager.data.selectedVehicleId === carId;

    document.getElementById('garage-car-name').textContent = def.name;
    document.getElementById('garage-car-class').textContent = `${def.className} • ${def.stats.drivetrain}`;
    document.getElementById('garage-car-desc').textContent = def.description;

    // Stat bars (0..100)
    document.getElementById('stat-top-speed').style.width = `${(def.stats.topSpeedMph / 240) * 100}%`;
    document.getElementById('stat-top-speed-val').textContent = `${def.stats.topSpeedMph} MPH`;

    document.getElementById('stat-power').style.width = `${(def.stats.powerHp / 900) * 100}%`;
    document.getElementById('stat-power-val').textContent = `${def.stats.powerHp} HP`;

    document.getElementById('stat-handling').style.width = `${def.stats.handling}%`;
    document.getElementById('stat-handling-val').textContent = `${def.stats.handling}/100`;

    document.getElementById('stat-braking').style.width = `${def.stats.braking}%`;
    document.getElementById('stat-braking-val').textContent = `${def.stats.braking}/100`;

    // Action button (Drive / Buy)
    const actionBtn = document.getElementById('garage-action-btn');
    if (actionBtn) {
      if (isSelected) {
        actionBtn.textContent = "CURRENT VEHICLE";
        actionBtn.className = "btn btn-secondary";
        actionBtn.disabled = true;
      } else if (isUnlocked) {
        actionBtn.textContent = "SELECT & DRIVE";
        actionBtn.className = "btn btn-accent";
        actionBtn.disabled = false;
        actionBtn.onclick = () => {
          this.game.switchVehicle(carId);
          this.closeAllModals();
          this.showToast("Vehicle Selected", `Now driving ${def.name}`);
        };
      } else {
        actionBtn.textContent = `PURCHASE (${MathUtils.formatCredits(def.price)})`;
        actionBtn.className = "btn";
        actionBtn.disabled = this.saveManager.data.credits < def.price;
        actionBtn.onclick = () => {
          if (this.saveManager.unlockVehicle(carId, def.price)) {
            this.game.switchVehicle(carId);
            this.setupGarageCarousel();
            this.showToast("Vehicle Unlocked!", `Purchased ${def.name}`);
          }
        };
      }
    }

    // Paint Swatches
    const paintContainer = document.getElementById('garage-paint-swatches');
    if (paintContainer) {
      paintContainer.innerHTML = '';
      const swatches = ['#00e5ff', '#ff0055', '#ffaa00', '#2ecc71', '#9b59b6', '#ffffff', '#111111', '#e74c3c', '#3498db', '#f1c40f'];
      const currentPaint = this.saveManager.data.vehiclePaints[carId] || def.defaultColor;

      swatches.forEach(hex => {
        const sw = document.createElement('div');
        sw.className = `paint-swatch ${currentPaint === hex ? 'active' : ''}`;
        sw.style.backgroundColor = hex;
        sw.addEventListener('click', () => {
          this.saveManager.setVehiclePaint(carId, hex);
          this.game.updateCurrentCarPaint(hex);
          document.querySelectorAll('.paint-swatch').forEach(s => s.classList.remove('active'));
          sw.classList.add('active');
          this.showToast("Paint Applied", `Custom color applied to ${def.name}`);
        });
        paintContainer.appendChild(sw);
      });
    }

    // Upgrades
    this.updateGarageUpgrades(carId);
  }

  updateGarageUpgrades(carId) {
    const upgrades = this.saveManager.data.vehicleUpgrades[carId] || { engine: 0, tires: 0, weight: 0, nitro: 0 };
    const upgradeTypes = [
      { id: 'engine', name: 'Engine ECU Stage', desc: '+15% Horsepower per stage', max: 3, costs: [5000, 12000, 25000] },
      { id: 'tires', name: 'Tire Compound', desc: 'Increased cornering grip', max: 3, costs: [4000, 9000, 18000] },
      { id: 'weight', name: 'Weight Reduction', desc: 'Lighter chassis & faster acceleration', max: 3, costs: [6000, 14000, 30000] },
      { id: 'nitro', name: 'Nitrous Boost Kit', desc: 'High-power boost system (Shift key)', max: 1, costs: [8000] }
    ];

    const upList = document.getElementById('garage-upgrades-list');
    if (!upList) return;
    upList.innerHTML = '';

    upgradeTypes.forEach(u => {
      const currentTier = upgrades[u.id] || 0;
      const nextTier = currentTier + 1;
      const canUpgrade = nextTier <= u.max;
      const cost = canUpgrade ? u.costs[currentTier] : 0;

      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-name">${u.name} (Tier ${currentTier}/${u.max})</div>
          <div class="upgrade-desc">${u.desc}</div>
        </div>
        <div>
          ${canUpgrade ? `
            <button class="btn btn-secondary upgrade-buy-btn" style="font-size: 11px; padding: 6px 14px;" ${this.saveManager.data.credits < cost ? 'disabled' : ''}>
              UPGRADE (${MathUtils.formatCredits(cost)})
            </button>
          ` : `<span style="color: var(--success); font-weight: 700; font-size: 12px;">MAX TIER</span>`}
        </div>
      `;

      if (canUpgrade) {
        card.querySelector('.upgrade-buy-btn')?.addEventListener('click', () => {
          if (this.saveManager.upgradeVehicle(carId, u.id, nextTier, cost)) {
            this.updateGarageUpgrades(carId);
            this.game.physics.applyUpgrades();
            this.showToast("Upgrade Installed", `${u.name} upgraded to Tier ${nextTier}`);
          }
        });
      }

      upList.appendChild(card);
    });
  }

  initSettingsValues() {
    const s = this.saveManager.data.settings;
    if (document.getElementById('setting-graphics')) document.getElementById('setting-graphics').value = s.graphicsPreset;
    if (document.getElementById('setting-shadows')) document.getElementById('setting-shadows').value = s.shadows;
    if (document.getElementById('setting-bloom')) document.getElementById('setting-bloom').checked = s.bloom;
    if (document.getElementById('setting-abs')) document.getElementById('setting-abs').checked = s.abs;
    if (document.getElementById('setting-tcs')) document.getElementById('setting-tcs').checked = s.tcs;
    if (document.getElementById('setting-esp')) document.getElementById('setting-esp').checked = s.esp;
    if (document.getElementById('setting-sensitivity')) document.getElementById('setting-sensitivity').value = s.steerSensitivity;
    if (document.getElementById('volume-master')) document.getElementById('volume-master').value = s.volumeMaster;
    if (document.getElementById('volume-engine')) document.getElementById('volume-engine').value = s.volumeEngine;
    if (document.getElementById('volume-music')) document.getElementById('volume-music').value = s.volumeMusic;
  }

  // --- MODAL CONTROLS ---
  openGarage() {
    this.closeAllModals();
    this.setupGarageCarousel();
    this.garageModal?.classList.add('open');
    this.game.gameState = 'GARAGE';
  }

  openWorldMap() {
    this.closeAllModals();
    this.mapModal?.classList.add('open');
    this.game.gameState = 'MAP';
    this.renderFullscreenMap();
  }

  openPauseMenu() {
    this.closeAllModals();
    this.pauseModal?.classList.add('open');
    this.game.gameState = 'PAUSED';
  }

  openSettings() {
    this.closeAllModals();
    this.settingsModal?.classList.add('open');
    this.game.gameState = 'PAUSED';
  }

  openFinishScreen(result) {
    this.closeAllModals();
    this.finishModal?.classList.add('open');
    this.game.gameState = 'PAUSED';

    document.getElementById('finish-event-title').textContent = result.event.name;
    document.getElementById('finish-time-val').textContent = MathUtils.formatTime(result.time);
    document.getElementById('finish-pos-val').textContent = result.placement ? `${result.placement}${['st','nd','rd','th'][result.placement-1] || 'th'}` : 'Finished';
    document.getElementById('finish-credits-val').textContent = `+${MathUtils.formatCredits(result.credits)}`;
    document.getElementById('finish-xp-val').textContent = `+${result.xp} XP`;
  }

  closeAllModals() {
    [this.garageModal, this.pauseModal, this.settingsModal, this.mapModal, this.finishModal].forEach(m => m?.classList.remove('open'));
  }

  showToast(title, desc) {
    if (!this.toast) return;
    this.toastTitle.textContent = title;
    this.toastDesc.textContent = desc;
    this.toast.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.remove('show'), 3200);
  }

  // --- PER-FRAME HUD UPDATE ---
  update(dt, vehiclePhysics, world, eventSystem) {
    if (!vehiclePhysics) return;

    const s = this.saveManager.data.settings;
    const isMph = s.units === 'mph';
    const displaySpeed = Math.round(isMph ? vehiclePhysics.speedMph : vehiclePhysics.speedKmh);

    // Speedometer values
    if (this.hudSpeedNum) this.hudSpeedNum.textContent = Math.abs(displaySpeed);
    if (this.hudGearVal) {
      if (vehiclePhysics.currentGear === -1) this.hudGearVal.textContent = 'R';
      else if (vehiclePhysics.currentGear === 0) this.hudGearVal.textContent = 'N';
      else this.hudGearVal.textContent = vehiclePhysics.currentGear;
    }

    // RPM fill & Nitro fill
    const rpmPct = (vehiclePhysics.engineRpm / vehiclePhysics.def.physics.maxRpm) * 100;
    if (this.hudRpmFill) this.hudRpmFill.style.width = `${Math.min(100, Math.max(0, rpmPct))}%`;
    if (this.hudNitroFill) this.hudNitroFill.style.width = `${Math.min(100, Math.max(0, vehiclePhysics.nitro * 100))}%`;

    // Assists indicators
    if (this.assistAbs) this.assistAbs.className = `hud-assist-badge ${vehiclePhysics.absActive ? 'active' : ''}`;
    if (this.assistTcs) this.assistTcs.className = `hud-assist-badge ${vehiclePhysics.tcsActive ? 'active' : ''}`;
    if (this.assistEsp) this.assistEsp.className = `hud-assist-badge ${vehiclePhysics.espActive ? 'active' : ''}`;

    // Top Bar stats
    if (this.hudCredits) this.hudCredits.textContent = MathUtils.formatCredits(this.saveManager.data.credits);
    if (this.hudLevel) this.hudLevel.textContent = `LVL ${this.saveManager.data.level}`;

    // Location & Surface
    const roadInfo = world.getRoadInfo(vehiclePhysics.position.x, vehiclePhysics.position.z);
    if (this.hudStreet) this.hudStreet.textContent = roadInfo.roadName;
    if (this.hudSurfaceTag) this.hudSurfaceTag.textContent = roadInfo.surface;

    // Drift popup
    if (vehiclePhysics.isDrifting && this.driftBox) {
      this.driftBox.classList.add('active');
      if (this.driftScoreEl) this.driftScoreEl.textContent = `${vehiclePhysics.driftScore} PTS`;
      const driftMult = Math.min(5, 1 + Math.floor(vehiclePhysics.driftScore / 2500));
      if (this.driftMultEl) this.driftMultEl.textContent = `DRIFT x${driftMult}`;
    } else if (this.driftBox) {
      this.driftBox.classList.remove('active');
    }

    // Event In-World Entry Prompt
    let nearEvent = null;
    if (eventSystem.eventState === 'IDLE') {
      EVENT_DEFINITIONS.forEach(ev => {
        const dist = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, ev.startPos.x, ev.startPos.z);
        if (dist < 18) {
          nearEvent = ev;
        }
      });
    }

    if (nearEvent && this.eventPrompt) {
      this.eventPrompt.style.display = 'block';
      document.getElementById('prompt-event-title').textContent = nearEvent.name;
      document.getElementById('prompt-event-type').textContent = `${nearEvent.icon} ${nearEvent.type.replace('_', ' ')}`;
      this.activePromptEventId = nearEvent.id;
    } else if (this.eventPrompt) {
      this.eventPrompt.style.display = 'none';
      this.activePromptEventId = null;
    }

    // Event In-Progress HUD
    if (eventSystem.activeEvent && eventSystem.eventState === 'RACING') {
      if (this.eventTracker) this.eventTracker.style.display = 'block';
      if (this.eventTitleEl) this.eventTitleEl.textContent = eventSystem.activeEvent.name;
      if (this.eventTimeEl) this.eventTimeEl.textContent = MathUtils.formatTime(eventSystem.raceTimer);
      if (this.eventPosEl) this.eventPosEl.textContent = eventSystem.activeEvent.type === 'CIRCUIT_RACE' ? `POS ${eventSystem.racePosition}/4` : `CHECKPOINT ${eventSystem.currentCheckpointIdx + 1}`;

      const totalCps = eventSystem.activeEvent.checkpoints?.length || 1;
      const pct = (eventSystem.currentCheckpointIdx / totalCps) * 100;
      if (this.eventFillEl) this.eventFillEl.style.width = `${pct}%`;
    } else if (this.eventTracker) {
      this.eventTracker.style.display = 'none';
    }

    // Countdown Banner
    if (eventSystem.eventState === 'COUNTDOWN' && this.countdownEl) {
      this.countdownEl.style.display = 'block';
      const sec = Math.ceil(eventSystem.countdownTimer);
      this.countdownEl.textContent = sec > 0 ? sec : 'GO!';
    } else if (this.countdownEl) {
      this.countdownEl.style.display = 'none';
    }

    // Render Minimap Radar
    this.renderMinimap(vehiclePhysics, world, eventSystem);
  }

  // --- MINIMAP RADAR CANVAS RENDERING ---
  renderMinimap(vehiclePhysics, world, eventSystem) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = 0.28; // Meters to radar pixels

    ctx.clearRect(0, 0, w, h);

    // Save and rotate map relative to vehicle heading
    const carAngle = Math.atan2(vehiclePhysics.velocity.x || 0.001, vehiclePhysics.velocity.z || 1);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-carAngle);

    // Draw Roads on radar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    world.roadSegments.forEach(seg => {
      if (seg.points.length < 2) return;
      ctx.beginPath();
      for (let i = 0; i < seg.points.length; i++) {
        const pt = seg.points[i];
        const rx = (pt.x - vehiclePhysics.position.x) * scale;
        const rz = (pt.z - vehiclePhysics.position.z) * scale;
        if (i === 0) ctx.moveTo(rx, rz);
        else ctx.lineTo(rx, rz);
      }
      ctx.stroke();
    });

    // Draw AI Traffic on radar
    if (this.game.traffic && this.game.traffic.vehicles) {
      ctx.fillStyle = '#ffaa00';
      this.game.traffic.vehicles.forEach(v => {
        const tx = (v.position.x - vehiclePhysics.position.x) * scale;
        const tz = (v.position.z - vehiclePhysics.position.z) * scale;
        if (Math.abs(tx) < cx && Math.abs(tz) < cy) {
          ctx.beginPath();
          ctx.arc(tx, tz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Event Markers on radar
    EVENT_DEFINITIONS.forEach(ev => {
      const ex = (ev.startPos.x - vehiclePhysics.position.x) * scale;
      const ez = (ev.startPos.z - vehiclePhysics.position.z) * scale;

      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(ex, ez, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Speed Traps on radar
    SPEED_TRAPS.forEach(trap => {
      const tx = (trap.x - vehiclePhysics.position.x) * scale;
      const tz = (trap.z - vehiclePhysics.position.z) * scale;
      ctx.fillStyle = '#ffbb00';
      ctx.beginPath();
      ctx.arc(tx, tz, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Active Checkpoint on radar
    if (eventSystem.activeEvent && eventSystem.activeEvent.checkpoints) {
      const cp = eventSystem.activeEvent.checkpoints[eventSystem.currentCheckpointIdx];
      if (cp) {
        const cpx = (cp.x - vehiclePhysics.position.x) * scale;
        const cpz = (cp.z - vehiclePhysics.position.z) * scale;

        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(cpx, cpz, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Player Arrow (Always in center pointing UP)
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 6, cy + 8);
    ctx.closePath();
    ctx.fill();
  }

  // --- FULLSCREEN WORLD MAP CANVAS RENDERING ---
  renderFullscreenMap() {
    if (!this.fullMapCtx || !this.fullMapCanvas) return;
    const ctx = this.fullMapCtx;
    const w = this.fullMapCanvas.width = this.fullMapCanvas.clientWidth;
    const h = this.fullMapCanvas.height = this.fullMapCanvas.clientHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const mapScale = (Math.min(w, h) * 0.85) / 2400;

    ctx.fillStyle = '#090c12';
    ctx.fillRect(0, 0, w, h);

    // Draw Island Coastline Circle
    ctx.fillStyle = '#161c28';
    ctx.beginPath();
    ctx.arc(cx, cy, 1050 * mapScale, 0, Math.PI * 2);
    ctx.fill();

    // Draw Roads
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2.5;

    this.game.world.roadSegments.forEach(seg => {
      if (seg.points.length < 2) return;
      ctx.beginPath();
      for (let i = 0; i < seg.points.length; i++) {
        const pt = seg.points[i];
        const mx = cx + pt.x * mapScale;
        const my = cy + pt.z * mapScale;
        if (i === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.stroke();
    });

    // Draw Events Pins
    EVENT_DEFINITIONS.forEach(ev => {
      const mx = cx + ev.startPos.x * mapScale;
      const my = cy + ev.startPos.z * mapScale;

      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(mx, my, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText(ev.name, mx + 10, my + 4);
    });

    // Draw Player Pin
    const p = this.game.physics.position;
    const px = cx + p.x * mapScale;
    const py = cy + p.z * mapScale;

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  showSpeedTrapFlash(name, speedMph, stars) {
    if (!this.speedTrapBox) return;
    this.speedTrapNameEl.textContent = name;
    this.speedTrapValEl.textContent = `${speedMph} MPH`;
    this.speedTrapStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.speedTrapBox.style.display = 'block';

    setTimeout(() => {
      this.speedTrapBox.style.display = 'none';
    }, 2800);
  }
}
