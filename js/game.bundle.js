(() => {
  // src/math.js
  var MathUtils = {
    clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    },
    lerp(a, b, t) {
      return a + (b - a) * t;
    },
    damp(a, b, lambda, dt) {
      return this.lerp(a, b, 1 - Math.exp(-lambda * dt));
    },
    degToRad(deg) {
      return deg * (Math.PI / 180);
    },
    radToDeg(rad) {
      return rad * (180 / Math.PI);
    },
    // Smooth step interpolation
    smoothstep(min, max, value) {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    },
    // Distance 2D
    dist2D(x1, z1, x2, z2) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      return Math.sqrt(dx * dx + dz * dz);
    },
    // Angle difference normalized to [-PI, PI]
    angleDiff(a, b) {
      let diff = (b - a) % (Math.PI * 2);
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      return diff;
    },
    // Catmull-Rom spline point calculation
    catmullRom(p0, p1, p2, p3, t) {
      const t2 = t * t;
      const t3 = t2 * t;
      return {
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
      };
    },
    // Format time (seconds -> MM:SS.ms)
    formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return "00:00.00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor(seconds % 1 * 100);
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    },
    // Format currency
    formatCredits(amount) {
      return new Intl.NumberFormat().format(Math.floor(amount)) + " CR";
    }
  };

  // src/save.js
  var SAVE_KEY = "open_road_festival_save_v1";
  var DEFAULT_SAVE_DATA = {
    version: 1,
    credits: 15e3,
    xp: 0,
    level: 1,
    selectedVehicleId: "breeze_rs",
    unlockedVehicles: ["breeze_rs"],
    vehiclePaints: {
      "breeze_rs": "#00e5ff",
      "veloce_gt": "#ff3300",
      "apex_nomad": "#2ecc71",
      "thunderbolt_454": "#3498db",
      "phantom_valkyrie": "#9b59b6"
    },
    vehicleUpgrades: {
      "breeze_rs": { engine: 0, tires: 0, weight: 0, nitro: 1 },
      "veloce_gt": { engine: 0, tires: 0, weight: 0, nitro: 0 },
      "apex_nomad": { engine: 0, tires: 0, weight: 0, nitro: 0 },
      "thunderbolt_454": { engine: 0, tires: 0, weight: 0, nitro: 0 },
      "phantom_valkyrie": { engine: 0, tires: 0, weight: 0, nitro: 0 }
    },
    completedEvents: {},
    speedTrapRecords: {},
    driftZoneRecords: {},
    collectedBadges: [],
    settings: {
      graphicsPreset: "balanced",
      // 'perf', 'balanced', 'quality', 'ultra'
      shadows: "medium",
      bloom: true,
      units: "mph",
      // 'mph' or 'kmh'
      abs: true,
      tcs: true,
      esp: true,
      steeringAssist: true,
      transmission: "auto",
      // 'auto' or 'manual'
      steerSensitivity: 1,
      volumeMaster: 0.8,
      volumeEngine: 0.85,
      volumeSfx: 0.9,
      volumeMusic: 0.5,
      timeOfDay: "dynamic",
      // 'dynamic', 'day', 'sunset', 'night'
      cameraMode: 0
    }
  };
  var SaveManager = class {
    constructor() {
      this.data = this.load();
    }
    load() {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_SAVE_DATA,
            ...parsed,
            settings: { ...DEFAULT_SAVE_DATA.settings, ...parsed.settings || {} },
            vehiclePaints: { ...DEFAULT_SAVE_DATA.vehiclePaints, ...parsed.vehiclePaints || {} },
            vehicleUpgrades: { ...DEFAULT_SAVE_DATA.vehicleUpgrades, ...parsed.vehicleUpgrades || {} }
          };
        }
      } catch (e) {
        console.warn("Could not load save data from localStorage, using default state", e);
      }
      return JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
    }
    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn("Could not write save data to localStorage", e);
      }
    }
    addCredits(amount) {
      this.data.credits = Math.max(0, this.data.credits + amount);
      this.save();
      return this.data.credits;
    }
    addXP(amount) {
      this.data.xp += amount;
      const neededForNext = this.data.level * 1e3;
      let leveledUp = false;
      while (this.data.xp >= neededForNext) {
        this.data.xp -= neededForNext;
        this.data.level += 1;
        this.addCredits(5e3 * this.data.level);
        leveledUp = true;
      }
      this.save();
      return { level: this.data.level, leveledUp, xp: this.data.xp };
    }
    unlockVehicle(id, cost) {
      if (this.data.unlockedVehicles.includes(id)) return true;
      if (this.data.credits >= cost) {
        this.addCredits(-cost);
        this.data.unlockedVehicles.push(id);
        this.data.selectedVehicleId = id;
        this.save();
        return true;
      }
      return false;
    }
    setVehiclePaint(id, colorHex) {
      this.data.vehiclePaints[id] = colorHex;
      this.save();
    }
    upgradeVehicle(id, upgradeType, tier, cost) {
      if (!this.data.vehicleUpgrades[id]) {
        this.data.vehicleUpgrades[id] = { engine: 0, tires: 0, weight: 0, nitro: 0 };
      }
      if (this.data.credits >= cost) {
        this.addCredits(-cost);
        this.data.vehicleUpgrades[id][upgradeType] = tier;
        this.save();
        return true;
      }
      return false;
    }
    recordEventFinish(eventId, placement, time, score, stars) {
      const prev = this.data.completedEvents[eventId] || { bestTime: 999999, bestScore: 0, stars: 0, completed: true };
      this.data.completedEvents[eventId] = {
        completed: true,
        bestTime: time ? Math.min(prev.bestTime || 999999, time) : prev.bestTime,
        bestScore: score ? Math.max(prev.bestScore || 0, score) : prev.bestScore,
        stars: Math.max(prev.stars || 0, stars || 1)
      };
      this.save();
    }
    recordSpeedTrap(trapId, speedMph) {
      const prev = this.data.speedTrapRecords[trapId] || 0;
      if (speedMph > prev) {
        this.data.speedTrapRecords[trapId] = Math.round(speedMph);
        this.save();
        return true;
      }
      return false;
    }
    recordDriftZone(zoneId, score) {
      const prev = this.data.driftZoneRecords[zoneId] || 0;
      if (score > prev) {
        this.data.driftZoneRecords[zoneId] = Math.round(score);
        this.save();
        return true;
      }
      return false;
    }
    collectBadge(badgeIndex) {
      if (!this.data.collectedBadges.includes(badgeIndex)) {
        this.data.collectedBadges.push(badgeIndex);
        this.addCredits(2500);
        this.addXP(250);
        this.save();
        return true;
      }
      return false;
    }
    updateSettings(newSettings) {
      this.data.settings = { ...this.data.settings, ...newSettings };
      this.save();
    }
    resetProgress() {
      this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
      this.save();
    }
  };

  // src/audio.js
  var AudioManager = class {
    constructor(saveManager) {
      this.saveManager = saveManager;
      this.ctx = null;
      this.initialized = false;
      this.muted = false;
      this.masterGain = null;
      this.engineGain = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineOscSub = null;
      this.engineFilter = null;
      this.engineNoise = null;
      this.engineDistortion = null;
      this.tireNoise = null;
      this.tireFilter = null;
      this.tireGain = null;
      this.windNoise = null;
      this.windFilter = null;
      this.windGain = null;
      this.nitroGain = null;
      this.nitroNoise = null;
      this.nitroFilter = null;
      this.musicPlaying = false;
      this.musicStep = 0;
      this.musicTimer = null;
      this.musicBpm = 118;
      this.musicScale = [130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63];
    }
    init() {
      if (this.initialized) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.saveManager.data.settings.volumeMaster ?? 0.8;
        this.masterGain.connect(this.ctx.destination);
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = this.saveManager.data.settings.volumeEngine ?? 0.85;
        this.engineGain.connect(this.masterGain);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.saveManager.data.settings.volumeSfx ?? 0.9;
        this.sfxGain.connect(this.masterGain);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.saveManager.data.settings.volumeMusic ?? 0.45;
        this.musicGain.connect(this.masterGain);
        this.setupEngineSynth();
        this.setupTireSquealSynth();
        this.setupWindSynth();
        this.setupNitroSynth();
        this.initialized = true;
        if (this.saveManager.data.settings.volumeMusic > 0.05) {
          this.startMusic();
        }
      } catch (e) {
        console.warn("Web Audio API could not be initialized:", e);
      }
    }
    resume() {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }
    // Set up procedural engine oscillator cluster
    setupEngineSynth() {
      if (!this.ctx) return;
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = "sawtooth";
      this.engineOsc1.frequency.value = 45;
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = "triangle";
      this.engineOsc2.frequency.value = 90;
      this.engineOscSub = this.ctx.createOscillator();
      this.engineOscSub.type = "square";
      this.engineOscSub.frequency.value = 22.5;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 350;
      this.engineFilter.Q.value = 2.5;
      this.engineDistortion = this.ctx.createWaveShaper();
      this.engineDistortion.curve = this.makeDistortionCurve(18);
      const oscMix = this.ctx.createGain();
      oscMix.gain.value = 0.25;
      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineOscSub.connect(this.engineFilter);
      this.engineFilter.connect(this.engineDistortion);
      this.engineDistortion.connect(oscMix);
      oscMix.connect(this.engineGain);
      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineOscSub.start();
    }
    makeDistortionCurve(amount = 20) {
      const k = typeof amount === "number" ? amount : 20;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
      }
      return curve;
    }
    setupTireSquealSynth() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      this.tireFilter = this.ctx.createBiquadFilter();
      this.tireFilter.type = "bandpass";
      this.tireFilter.frequency.value = 1100;
      this.tireFilter.Q.value = 4;
      this.tireGain = this.ctx.createGain();
      this.tireGain.gain.value = 0;
      whiteNoise.connect(this.tireFilter);
      this.tireFilter.connect(this.tireGain);
      this.tireGain.connect(this.sfxGain);
      whiteNoise.start();
    }
    setupWindSynth() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = "lowpass";
      this.windFilter.frequency.value = 250;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      whiteNoise.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.sfxGain);
      whiteNoise.start();
    }
    setupNitroSynth() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      this.nitroFilter = this.ctx.createBiquadFilter();
      this.nitroFilter.type = "bandpass";
      this.nitroFilter.frequency.value = 2800;
      this.nitroFilter.Q.value = 2;
      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.value = 0;
      whiteNoise.connect(this.nitroFilter);
      this.nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.sfxGain);
      whiteNoise.start();
    }
    // Update dynamic vehicle sounds every frame
    updateVehicleAudio(vehicleStats, carData) {
      if (!this.initialized || !this.ctx) return;
      const rpm = vehicleStats.rpm || 800;
      const throttle = vehicleStats.throttle || 0;
      const speedMps = vehicleStats.speedMps || 0;
      const slipRatio = vehicleStats.slipRatio || 0;
      const isNitro = vehicleStats.isNitro || false;
      let basePitchMultiplier = 1;
      if (carData.id === "thunderbolt_454") basePitchMultiplier = 0.65;
      else if (carData.id === "phantom_valkyrie") basePitchMultiplier = 1.45;
      else if (carData.id === "breeze_rs") basePitchMultiplier = 1.15;
      else if (carData.id === "apex_nomad") basePitchMultiplier = 0.9;
      const baseFreq = rpm / 60 * basePitchMultiplier * 2.2;
      const targetFreq = Math.max(25, baseFreq);
      const now = this.ctx.currentTime;
      if (this.engineOsc1) {
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2.02, now, 0.04);
        this.engineOscSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);
      }
      const cutoff = 300 + throttle * 2200 + rpm / 8500 * 1800;
      if (this.engineFilter) {
        this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
      }
      if (this.tireGain) {
        const squealVol = Math.min(0.55, Math.max(0, (slipRatio - 0.22) * 1.5));
        this.tireGain.gain.setTargetAtTime(squealVol, now, 0.05);
        if (this.tireFilter) {
          this.tireFilter.frequency.setTargetAtTime(900 + speedMps * 25, now, 0.05);
        }
      }
      if (this.windGain) {
        const windVol = Math.min(0.35, Math.pow(speedMps / 80, 2) * 0.35);
        this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
        if (this.windFilter) {
          this.windFilter.frequency.setTargetAtTime(150 + speedMps * 20, now, 0.1);
        }
      }
      if (this.nitroGain) {
        this.nitroGain.gain.setTargetAtTime(isNitro ? 0.3 : 0, now, 0.08);
      }
    }
    // Gear shift blow-off / backfire pop sound
    playGearShiftPop() {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.18);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }
    // Collision impact sound
    playCollision(intensity = 1) {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      const clampedIntensity = Math.min(1.5, Math.max(0.2, intensity));
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140 * clampedIntensity, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);
      oscGain.gain.setValueAtTime(0.5 * clampedIntensity, now);
      oscGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.3);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.32);
      const bufferSize = this.ctx.sampleRate * 0.2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(1200, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4 * clampedIntensity, now);
      noiseGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.22);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noiseSource.start(now);
    }
    // Checkpoint passing chime
    playCheckpoint() {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    }
    // Countdown beep (short beep for 3,2,1; high long tone for GO!)
    playCountdownBeep(isGo = false) {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isGo ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + (isGo ? 0.6 : 0.25));
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + (isGo ? 0.65 : 0.28));
    }
    // Speed trap flash shutter & chime
    playSpeedTrap() {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.setValueAtTime(1318.5, now + 0.08);
      osc.frequency.setValueAtTime(1567.98, now + 0.16);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.55);
    }
    // Badge collectible pickup chime
    playBadgePickup() {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.3, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + idx * 0.06 + 0.4);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.45);
      });
    }
    // Event finish victory fanfare
    playVictoryFanfare() {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0 },
        { f: 659.25, t: 0.12 },
        { f: 783.99, t: 0.24 },
        { f: 1046.5, t: 0.38 },
        { f: 1318.5, t: 0.55 }
      ];
      notes.forEach((note) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(note.f, now + note.t);
        gain.gain.setValueAtTime(0.35, now + note.t);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + note.t + 0.6);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + note.t);
        osc.stop(now + note.t + 0.65);
      });
    }
    // UI click sound
    playUiClick() {
      if (!this.initialized || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    }
    // Generative Festival Synthwave Radio Soundtrack
    startMusic() {
      if (this.musicPlaying || !this.ctx) return;
      this.musicPlaying = true;
      this.scheduleNextMusicBar();
    }
    stopMusic() {
      this.musicPlaying = false;
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
    }
    scheduleNextMusicBar() {
      if (!this.musicPlaying || !this.ctx) return;
      const barDuration = 60 / this.musicBpm * 4;
      const now = this.ctx.currentTime;
      const chordRoots = [110, 87.31, 130.81, 98];
      const currentRoot = chordRoots[Math.floor(this.musicStep / 4) % chordRoots.length];
      for (let i = 0; i < 8; i++) {
        const stepTime = now + i * barDuration / 8;
        const freq = currentRoot * [1, 1.25, 1.5, 1.875, 2, 1.5, 1.25, 1][i % 8];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = i % 2 === 0 ? "sawtooth" : "sine";
        osc.frequency.setValueAtTime(freq, stepTime);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600 + Math.sin(this.musicStep * 0.5) * 350, stepTime);
        gain.gain.setValueAtTime(0.08, stepTime);
        gain.gain.exponentialRampToValueAtTime(1e-3, stepTime + barDuration / 10);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(stepTime);
        osc.stop(stepTime + barDuration / 8);
      }
      this.musicStep++;
      this.musicTimer = setTimeout(() => {
        this.scheduleNextMusicBar();
      }, barDuration * 1e3 - 50);
    }
    setVolumes(master, engine, sfx, music) {
      if (!this.ctx) return;
      if (master !== void 0 && this.masterGain) this.masterGain.gain.value = master;
      if (engine !== void 0 && this.engineGain) this.engineGain.gain.value = engine;
      if (sfx !== void 0 && this.sfxGain) this.sfxGain.gain.value = sfx;
      if (music !== void 0 && this.musicGain) {
        this.musicGain.gain.value = music;
        if (music > 0.05 && !this.musicPlaying) this.startMusic();
        else if (music <= 0.05 && this.musicPlaying) this.stopMusic();
      }
    }
  };

  // src/world.js
  var World = class {
    constructor(scene, renderer) {
      this.scene = scene;
      this.renderer = renderer;
      this.timeOfDay = 0.35;
      this.daySpeed = 3e-3;
      this.weather = "clear";
      this.isDynamicTime = true;
      this.sunLight = null;
      this.ambientLight = null;
      this.hemiLight = null;
      this.fog = null;
      this.rainParticles = null;
      this.animatedProps = [];
      this.streetLamps = [];
      this.buildingMeshes = [];
      this.roadSegments = [];
      this.roadMeshGroup = new THREE.Group();
      this.roadMeshGroup.name = "RoadNetwork";
      this.scene.add(this.roadMeshGroup);
      this.colliders = [];
      this.initLighting();
      this.generateRoadNetwork();
      this.generateTerrain();
      this.generateProps();
      this.generateLandmarks();
      this.generateRainEffect();
    }
    // --- LIGHTING & SKY ---
    initLighting() {
      this.ambientLight = new THREE.AmbientLight(14544639, 0.6);
      this.scene.add(this.ambientLight);
      this.hemiLight = new THREE.HemisphereLight(8900331, 4016694, 0.5);
      this.scene.add(this.hemiLight);
      this.sunLight = new THREE.DirectionalLight(16775917, 1.4);
      this.sunLight.position.set(300, 500, 250);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 50;
      this.sunLight.shadow.camera.far = 1600;
      const d = 400;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -5e-4;
      this.scene.add(this.sunLight);
      this.fog = new THREE.FogExp2(10471656, 8e-4);
      this.scene.fog = this.fog;
    }
    // --- PROCEDURAL HEIGHTMAP ---
    getGroundHeight(x, z) {
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter > 1100) {
        const drop = (distFromCenter - 1100) * 0.15;
        return Math.max(0.2, 2 - drop);
      }
      let h = 3;
      if (x < 0 && z < 0) {
        const mX = (x + 500) / 450;
        const mZ = (z + 550) / 450;
        const mountainFactor = Math.exp(-(mX * mX + mZ * mZ));
        h += mountainFactor * 85;
        h += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 6 * mountainFactor;
      }
      if (x < 0 && z > 0) {
        h += (Math.sin(x * 0.012) + Math.cos(z * 0.012)) * 7 + 5;
      }
      if (x > 0 && z > 0) {
        const coastDist = Math.max(0, (distFromCenter - 450) / 600);
        h = MathUtils.lerp(4, 1.2, coastDist);
      }
      if (x > 0 && z <= 0) {
        h = 3.5 + Math.sin(x * 5e-3) * 1.5;
      }
      return Math.max(0.5, h);
    }
    // Surface type detection
    getSurfaceType(x, z) {
      const roadInfo = this.getRoadInfo(x, z);
      if (roadInfo.onRoad) {
        if (this.weather === "rain") return "WET_ASPHALT";
        return roadInfo.surface || "ASPHALT";
      }
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter > 950 && (x > 0 || z > 0)) {
        return "SAND";
      }
      if (x < -200 && z < -200) {
        return "DIRT";
      }
      return "GRASS";
    }
    // --- ROAD NETWORK DEFINITION ---
    generateRoadNetwork() {
      const highwayNodes = [
        { x: 0, z: 750, w: 22, name: "South Coastal Highway", speedLimit: 75 },
        { x: 650, z: 650, w: 22, name: "Sunset Marina Expressway", speedLimit: 75 },
        { x: 820, z: 0, w: 22, name: "East Viaduct Highway", speedLimit: 75 },
        { x: 650, z: -650, w: 22, name: "Downtown Highway Loop", speedLimit: 70 },
        { x: 0, z: -850, w: 22, name: "North Ridge Highway", speedLimit: 75 },
        { x: -650, z: -650, w: 22, name: "Alpine Tunnel Highway", speedLimit: 65 },
        { x: -820, z: 0, w: 22, name: "West Farmland Freeway", speedLimit: 75 },
        { x: -650, z: 650, w: 22, name: "Harbor Freight Highway", speedLimit: 75 }
      ];
      this.addRoadLoop(highwayNodes, "HIGHWAY", 2237480, true);
      const cityLoop = [
        { x: 200, z: -150, w: 16, name: "Festival Boulevard", speedLimit: 45 },
        { x: 600, z: -150, w: 16, name: "Metropolis Avenue", speedLimit: 45 },
        { x: 600, z: -550, w: 16, name: "Skyscraper Way", speedLimit: 45 },
        { x: 200, z: -550, w: 16, name: "Grand Central Street", speedLimit: 45 }
      ];
      this.addRoadLoop(cityLoop, "CITY_STREET", 2763824, false);
      this.addRoadSegment([
        { x: 200, z: -350, w: 14, name: "Plaza Crossway", speedLimit: 40 },
        { x: 600, z: -350, w: 14, name: "Plaza Crossway", speedLimit: 40 }
      ], "CITY_STREET", 2763824);
      this.addRoadSegment([
        { x: 400, z: -150, w: 14, name: "Commerce Row", speedLimit: 40 },
        { x: 400, z: -550, w: 14, name: "Commerce Row", speedLimit: 40 }
      ], "CITY_STREET", 2763824);
      const mountainPass = [
        { x: -200, z: -150, w: 12, name: "Alpine Ascent", speedLimit: 40 },
        { x: -350, z: -300, w: 12, name: "Switchback Turn 1", speedLimit: 35 },
        { x: -250, z: -450, w: 12, name: "Ridge Hairpin 2", speedLimit: 30 },
        { x: -500, z: -550, w: 12, name: "Alpine Peak Pass", speedLimit: 40 },
        { x: -400, z: -700, w: 12, name: "Summit Descent", speedLimit: 35 },
        { x: -650, z: -650, w: 12, name: "Tunnel Approach", speedLimit: 45 }
      ];
      this.addRoadSegment(mountainPass, "MOUNTAIN_ROAD", 3356219);
      const coastalLoop = [
        { x: 200, z: 200, w: 15, name: "Festival South Gate", speedLimit: 45 },
        { x: 550, z: 250, w: 15, name: "Marina Boardwalk", speedLimit: 40 },
        { x: 750, z: 500, w: 15, name: "Ocean View Boulevard", speedLimit: 50 },
        { x: 600, z: 650, w: 15, name: "Lighthouse Pier Road", speedLimit: 45 },
        { x: 250, z: 550, w: 15, name: "Palm Coastal Drive", speedLimit: 45 }
      ];
      this.addRoadLoop(coastalLoop, "COASTAL_ROAD", 3158840, false);
      const dirtRally = [
        { x: -150, z: 150, w: 10, name: "Highland Forest Trail", speedLimit: 55, surface: "DIRT" },
        { x: -400, z: 250, w: 10, name: "Pine Wood Rally", speedLimit: 50, surface: "DIRT" },
        { x: -600, z: 450, w: 10, name: "Windmill Dirt Sprint", speedLimit: 55, surface: "DIRT" },
        { x: -450, z: 600, w: 10, name: "Farmland Gravel Pass", speedLimit: 50, surface: "DIRT" },
        { x: -200, z: 400, w: 10, name: "Ranch Jump Trail", speedLimit: 55, surface: "DIRT" }
      ];
      this.addRoadLoop(dirtRally, "DIRT_TRAIL", 5916210, false, "DIRT");
      const festivalHub = [
        { x: 0, z: 80, w: 20, name: "Festival Central Ring", speedLimit: 35 },
        { x: 80, z: 0, w: 20, name: "Festival Central Ring", speedLimit: 35 },
        { x: 0, z: -80, w: 20, name: "Festival Central Ring", speedLimit: 35 },
        { x: -80, z: 0, w: 20, name: "Festival Central Ring", speedLimit: 35 }
      ];
      this.addRoadLoop(festivalHub, "FESTIVAL_HUB", 2040360, false);
      this.addRoadSegment([{ x: 0, z: 80, w: 16 }, { x: 200, z: 200, w: 16 }], "CONNECTOR", 2435117);
      this.addRoadSegment([{ x: 80, z: 0, w: 16 }, { x: 200, z: -150, w: 16 }], "CONNECTOR", 2435117);
      this.addRoadSegment([{ x: -80, z: 0, w: 16 }, { x: -200, z: -150, w: 16 }], "CONNECTOR", 2435117);
      this.addRoadSegment([{ x: 0, z: 80, w: 14 }, { x: -150, z: 150, w: 14 }], "CONNECTOR", 2435117);
      this.buildRoadMeshes();
    }
    addRoadLoop(nodes, type, colorHex, isDivided = false, surface = "ASPHALT") {
      const loopNodes = [...nodes, nodes[0]];
      this.addRoadSegment(loopNodes, type, colorHex, isDivided, surface);
    }
    addRoadSegment(nodes, type, colorHex, isDivided = false, surface = "ASPHALT") {
      const points = [];
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const y = this.getGroundHeight(node.x, node.z) + 0.12;
        points.push({
          x: node.x,
          y,
          z: node.z,
          w: node.w || 14,
          name: node.name || "Open Road",
          speedLimit: node.speedLimit || 50,
          surface
        });
      }
      this.roadSegments.push({
        points,
        type,
        colorHex,
        isDivided,
        surface
      });
    }
    buildRoadMeshes() {
      this.roadSegments.forEach((seg) => {
        const pts = seg.points;
        if (pts.length < 2) return;
        const roadGeo = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        let vertexIndex = 0;
        for (let i = 0; i < pts.length; i++) {
          const curr = pts[i];
          const next = pts[Math.min(i + 1, pts.length - 1)];
          const prev = pts[Math.max(i - 1, 0)];
          const tx = next.x - prev.x;
          const tz = next.z - prev.z;
          const tLen = Math.sqrt(tx * tx + tz * tz) || 1;
          const dirX = tx / tLen;
          const dirZ = tz / tLen;
          const perpX = -dirZ;
          const perpZ = dirX;
          const halfW = curr.w * 0.5;
          const lx = curr.x - perpX * halfW;
          const lz = curr.z - perpZ * halfW;
          const ly = this.getGroundHeight(lx, lz) + 0.14;
          const rx = curr.x + perpX * halfW;
          const rz = curr.z + perpZ * halfW;
          const ry = this.getGroundHeight(rx, rz) + 0.14;
          positions.push(lx, ly, lz);
          positions.push(rx, ry, rz);
          normals.push(0, 1, 0);
          normals.push(0, 1, 0);
          const vCoord = i * 0.5;
          uvs.push(0, vCoord);
          uvs.push(1, vCoord);
          if (i < pts.length - 1) {
            const a = vertexIndex;
            const b = vertexIndex + 1;
            const c = vertexIndex + 2;
            const d = vertexIndex + 3;
            indices.push(a, b, c);
            indices.push(b, d, c);
          }
          vertexIndex += 2;
        }
        roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        roadGeo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        roadGeo.setIndex(indices);
        const mat = new THREE.MeshStandardMaterial({
          color: seg.colorHex || 2435117,
          roughness: seg.surface === "DIRT" ? 0.9 : 0.6,
          metalness: 0.1
        });
        const mesh = new THREE.Mesh(roadGeo, mat);
        mesh.receiveShadow = true;
        this.roadMeshGroup.add(mesh);
      });
    }
    // Query road information at position
    getRoadInfo(x, z) {
      let closestDist = Infinity;
      let closestSeg = null;
      let closestPt = null;
      let roadName = "Open Countryside";
      let speedLimit = 60;
      let surface = "ASPHALT";
      for (let s = 0; s < this.roadSegments.length; s++) {
        const seg = this.roadSegments[s];
        for (let p = 0; p < seg.points.length; p++) {
          const pt = seg.points[p];
          const d = MathUtils.dist2D(x, z, pt.x, pt.z);
          if (d < closestDist) {
            closestDist = d;
            closestSeg = seg;
            closestPt = pt;
            roadName = pt.name;
            speedLimit = pt.speedLimit;
            surface = seg.surface;
          }
        }
      }
      const halfW = closestPt ? closestPt.w * 0.5 + 1.5 : 8;
      const onRoad = closestDist <= halfW;
      return {
        onRoad,
        distanceToRoad: closestDist,
        roadName,
        speedLimit,
        surface,
        closestPoint: closestPt
      };
    }
    // --- TERRAIN GENERATION ---
    generateTerrain() {
      const terrainSize = 2400;
      const segments = 120;
      const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
      terrainGeo.rotateX(-Math.PI / 2);
      const pos = terrainGeo.attributes.position;
      const colors = [];
      const colorAsphalt = new THREE.Color(2896701);
      const colorGrass = new THREE.Color(2972199);
      const colorLush = new THREE.Color(4094517);
      const colorRock = new THREE.Color(5921630);
      const colorSand = new THREE.Color(13940870);
      const colorDirt = new THREE.Color(5521453);
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const vy = this.getGroundHeight(vx, vz);
        pos.setY(i, vy);
        let col = colorGrass.clone();
        const dist = Math.sqrt(vx * vx + vz * vz);
        if (dist > 950) {
          col.lerp(colorSand, Math.min(1, (dist - 950) / 100));
        } else if (vy > 45) {
          col.lerp(colorRock, Math.min(1, (vy - 45) / 30));
        } else if (vx < -150 && vz < -150) {
          col.lerp(colorDirt, 0.45);
        } else if (vx > 100 && vz < 0) {
          col.lerp(colorAsphalt, 0.35);
        } else {
          col.lerp(colorLush, (Math.sin(vx * 0.05) + 1) * 0.2);
        }
        colors.push(col.r, col.g, col.b);
      }
      terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      terrainGeo.computeVertexNormals();
      const terrainMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.05
      });
      const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
      terrainMesh.receiveShadow = true;
      this.scene.add(terrainMesh);
      const oceanGeo = new THREE.PlaneGeometry(3600, 3600);
      oceanGeo.rotateX(-Math.PI / 2);
      const oceanMat = new THREE.MeshStandardMaterial({
        color: 674680,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85
      });
      const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
      oceanMesh.position.y = 0.5;
      this.scene.add(oceanMesh);
    }
    // --- INSTANCED SCENERY PROPS ---
    generateProps() {
      const pineCount = 500;
      const pineTrunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 3, 6);
      const pineFoliageGeo = new THREE.ConeGeometry(2.5, 7, 7);
      pineFoliageGeo.translate(0, 4.5, 0);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 4007959, roughness: 0.9 });
      const pineMat = new THREE.MeshStandardMaterial({ color: 1982240, roughness: 0.8 });
      const pineInstTrunk = new THREE.InstancedMesh(pineTrunkGeo, trunkMat, pineCount);
      const pineInstFoliage = new THREE.InstancedMesh(pineFoliageGeo, pineMat, pineCount);
      pineInstTrunk.castShadow = true;
      pineInstFoliage.castShadow = true;
      const dummy = new THREE.Object3D();
      let pIdx = 0;
      for (let i = 0; i < pineCount; i++) {
        const rx = (Math.random() - 0.5) * 2e3;
        const rz = (Math.random() - 0.5) * 2e3;
        const roadInfo = this.getRoadInfo(rx, rz);
        if (!roadInfo.onRoad && Math.sqrt(rx * rx + rz * rz) < 1e3) {
          const ry = this.getGroundHeight(rx, rz);
          const scale = 0.8 + Math.random() * 0.6;
          dummy.position.set(rx, ry + 1.5, rz);
          dummy.scale.set(scale, scale, scale);
          dummy.rotation.y = Math.random() * Math.PI * 2;
          dummy.updateMatrix();
          pineInstTrunk.setMatrixAt(pIdx, dummy.matrix);
          pineInstFoliage.setMatrixAt(pIdx, dummy.matrix);
          this.colliders.push({
            type: "cylinder",
            x: rx,
            z: rz,
            radius: 0.6 * scale
          });
          pIdx++;
        }
      }
      pineInstTrunk.count = pIdx;
      pineInstFoliage.count = pIdx;
      pineInstTrunk.instanceMatrix.needsUpdate = true;
      pineInstFoliage.instanceMatrix.needsUpdate = true;
      this.scene.add(pineInstTrunk);
      this.scene.add(pineInstFoliage);
      const palmCount = 120;
      const palmFoliageGeo = new THREE.SphereGeometry(2.2, 8, 6);
      palmFoliageGeo.scale(1.8, 0.4, 1.8);
      palmFoliageGeo.translate(0, 5.5, 0);
      const palmMat = new THREE.MeshStandardMaterial({ color: 3042087, roughness: 0.7 });
      const palmInst = new THREE.InstancedMesh(palmFoliageGeo, palmMat, palmCount);
      palmInst.castShadow = true;
      let plmIdx = 0;
      for (let i = 0; i < palmCount; i++) {
        const rx = 200 + Math.random() * 600;
        const rz = 200 + Math.random() * 600;
        const roadInfo = this.getRoadInfo(rx, rz);
        if (!roadInfo.onRoad) {
          const ry = this.getGroundHeight(rx, rz);
          dummy.position.set(rx, ry, rz);
          dummy.scale.set(1, 1, 1);
          dummy.rotation.y = Math.random() * Math.PI;
          dummy.updateMatrix();
          palmInst.setMatrixAt(plmIdx++, dummy.matrix);
        }
      }
      palmInst.count = plmIdx;
      palmInst.instanceMatrix.needsUpdate = true;
      this.scene.add(palmInst);
      const lampCount = 200;
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.5, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 4474960, metalness: 0.8, roughness: 0.3 });
      const lampInst = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
      const bulbGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 16773324,
        emissive: 16755251,
        emissiveIntensity: 0.2
      });
      const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);
      let lIdx = 0;
      this.roadSegments.forEach((seg) => {
        for (let i = 0; i < seg.points.length; i += 2) {
          if (lIdx >= lampCount) break;
          const pt = seg.points[i];
          const offset = pt.w * 0.5 + 1.8;
          const lx = pt.x + offset;
          const lz = pt.z;
          const ly = this.getGroundHeight(lx, lz);
          dummy.position.set(lx, ly + 3.25, lz);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          lampInst.setMatrixAt(lIdx, dummy.matrix);
          dummy.position.set(lx, ly + 6.2, lz);
          dummy.updateMatrix();
          bulbInst.setMatrixAt(lIdx, dummy.matrix);
          this.streetLamps.push({ x: lx, y: ly + 6.2, z: lz });
          lIdx++;
        }
      });
      lampInst.count = lIdx;
      bulbInst.count = lIdx;
      lampInst.instanceMatrix.needsUpdate = true;
      bulbInst.instanceMatrix.needsUpdate = true;
      this.scene.add(lampInst);
      this.scene.add(bulbInst);
      this.bulbMaterial = bulbMat;
      this.generateCityBuildings();
    }
    generateCityBuildings() {
      const buildingGroup = new THREE.Group();
      buildingGroup.name = "DowntownSkyscrapers";
      const glassMat = new THREE.MeshStandardMaterial({
        color: 1713718,
        roughness: 0.15,
        metalness: 0.85
      });
      const concreteMat = new THREE.MeshStandardMaterial({
        color: 3817290,
        roughness: 0.7,
        metalness: 0.2
      });
      const cityBlocks = [
        { x: 300, z: -250, w: 70, d: 70, h: 85 },
        { x: 500, z: -250, w: 65, d: 65, h: 110 },
        { x: 300, z: -450, w: 70, d: 70, h: 95 },
        { x: 500, z: -450, w: 65, d: 65, h: 140 },
        // Tallest Tower
        { x: 400, z: -250, w: 45, d: 55, h: 60 },
        { x: 400, z: -450, w: 55, d: 45, h: 75 },
        { x: 250, z: -350, w: 50, d: 50, h: 55 },
        { x: 550, z: -350, w: 55, d: 55, h: 68 },
        // Industrial Warehouses (South-West)
        { x: -600, z: 550, w: 90, d: 60, h: 22, mat: concreteMat },
        { x: -720, z: 580, w: 80, d: 70, h: 20, mat: concreteMat },
        { x: -550, z: 700, w: 100, d: 50, h: 25, mat: concreteMat }
      ];
      cityBlocks.forEach((b) => {
        const y = this.getGroundHeight(b.x, b.z);
        const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
        const bMesh = new THREE.Mesh(bGeo, b.mat || glassMat);
        bMesh.position.set(b.x, y + b.h * 0.5, b.z);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        buildingGroup.add(bMesh);
        this.colliders.push({
          type: "box",
          minX: b.x - b.w * 0.5 - 0.5,
          maxX: b.x + b.w * 0.5 + 0.5,
          minZ: b.z - b.d * 0.5 - 0.5,
          maxZ: b.z + b.d * 0.5 + 0.5
        });
      });
      this.scene.add(buildingGroup);
    }
    // --- LANDMARKS ---
    generateLandmarks() {
      const stageGroup = new THREE.Group();
      stageGroup.position.set(0, this.getGroundHeight(0, 0), 0);
      const platformGeo = new THREE.CylinderGeometry(28, 30, 3, 24);
      const platformMat = new THREE.MeshStandardMaterial({ color: 1119e3, metalness: 0.8, roughness: 0.3 });
      const platformMesh = new THREE.Mesh(platformGeo, platformMat);
      platformMesh.position.y = 1.5;
      stageGroup.add(platformMesh);
      const archGeo = new THREE.TorusGeometry(18, 0.8, 8, 24, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({ color: 16711807, emissive: 16711807, emissiveIntensity: 0.6 });
      const archMesh = new THREE.Mesh(archGeo, archMat);
      archMesh.position.set(0, 3, 0);
      stageGroup.add(archMesh);
      const lightBeamGeo = new THREE.ConeGeometry(8, 80, 16, 1, true);
      lightBeamGeo.translate(0, 40, 0);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 61695,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
      });
      [-12, 12].forEach((x) => {
        const beam = new THREE.Mesh(lightBeamGeo, beamMat);
        beam.position.set(x, 2, 0);
        stageGroup.add(beam);
        this.animatedProps.push({ type: "searchlight", mesh: beam, speed: 1.5, offset: x });
      });
      this.scene.add(stageGroup);
      const lhGroup = new THREE.Group();
      const lhY = this.getGroundHeight(750, 750);
      lhGroup.position.set(750, lhY, 750);
      const towerGeo = new THREE.CylinderGeometry(3, 5.5, 28, 16);
      const towerMat = new THREE.MeshStandardMaterial({ color: 16119285, roughness: 0.4 });
      const towerMesh = new THREE.Mesh(towerGeo, towerMat);
      towerMesh.position.y = 14;
      towerMesh.castShadow = true;
      lhGroup.add(towerMesh);
      const lhBulbGeo = new THREE.SphereGeometry(1.5, 12, 12);
      const lhBulbMat = new THREE.MeshStandardMaterial({ color: 16777130, emissive: 16777045, emissiveIntensity: 1.5 });
      const lhBulb = new THREE.Mesh(lhBulbGeo, lhBulbMat);
      lhBulb.position.y = 28.5;
      lhGroup.add(lhBulb);
      this.animatedProps.push({ type: "lighthouse", mesh: lhBulb, speed: 0.8 });
      this.scene.add(lhGroup);
      const turbinePositions = [
        { x: -550, z: -350 },
        { x: -680, z: -450 },
        { x: -450, z: -750 }
      ];
      turbinePositions.forEach((tp) => {
        const ty = this.getGroundHeight(tp.x, tp.z);
        const wtGroup = new THREE.Group();
        wtGroup.position.set(tp.x, ty, tp.z);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 42, 12), towerMat);
        mast.position.y = 21;
        mast.castShadow = true;
        wtGroup.add(mast);
        const hub = new THREE.Group();
        hub.position.set(0, 42, 1.5);
        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 18, 0.15), towerMat);
          blade.position.y = 9;
          const bladeArm = new THREE.Group();
          bladeArm.rotation.z = b * Math.PI * 2 / 3;
          bladeArm.add(blade);
          hub.add(bladeArm);
        }
        wtGroup.add(hub);
        this.animatedProps.push({ type: "turbine", mesh: hub, speed: 1.2 });
        this.scene.add(wtGroup);
      });
    }
    // --- RAIN EFFECT ---
    generateRainEffect() {
      const rainCount = 1500;
      const rainGeo = new THREE.BufferGeometry();
      const positions = [];
      for (let i = 0; i < rainCount; i++) {
        positions.push(
          (Math.random() - 0.5) * 80,
          Math.random() * 40,
          (Math.random() - 0.5) * 80
        );
      }
      rainGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const rainMat = new THREE.PointsMaterial({
        color: 11184878,
        size: 0.25,
        transparent: true,
        opacity: 0.6
      });
      this.rainParticles = new THREE.Points(rainGeo, rainMat);
      this.rainParticles.visible = false;
      this.scene.add(this.rainParticles);
    }
    // --- UPDATE LOOP ---
    update(dt, playerPosition) {
      if (this.isDynamicTime) {
        this.timeOfDay = (this.timeOfDay + this.daySpeed * dt) % 1;
      }
      this.updateAtmosphere(this.timeOfDay);
      const time = performance.now() * 1e-3;
      this.animatedProps.forEach((prop) => {
        if (prop.type === "searchlight") {
          prop.mesh.rotation.z = Math.sin(time * prop.speed + prop.offset) * 0.45;
          prop.mesh.rotation.x = Math.cos(time * prop.speed * 0.7) * 0.35;
        } else if (prop.type === "lighthouse") {
          prop.mesh.rotation.y = time * prop.speed;
        } else if (prop.type === "turbine") {
          prop.mesh.rotation.z += dt * prop.speed;
        }
      });
      if (this.rainParticles && this.rainParticles.visible && playerPosition) {
        this.rainParticles.position.set(playerPosition.x, 0, playerPosition.z);
        const pos = this.rainParticles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let py = pos.getY(i) - dt * 38;
          if (py < 0) py = 40;
          pos.setY(i, py);
        }
        pos.needsUpdate = true;
      }
    }
    updateAtmosphere(t) {
      const angle = t * Math.PI * 2;
      const sunHeight = Math.sin(angle);
      const sunDist = 600;
      this.sunLight.position.set(
        Math.cos(angle) * sunDist,
        Math.max(20, sunHeight * sunDist),
        Math.sin(angle * 0.8) * sunDist * 0.5
      );
      let skyColor = new THREE.Color();
      let fogColor = new THREE.Color();
      let sunColor = new THREE.Color();
      let sunIntensity = 1.2;
      let isNight = false;
      if (sunHeight > 0.2) {
        skyColor.setHex(8900331);
        fogColor.setHex(11721207);
        sunColor.setHex(16775917);
        sunIntensity = 1.4;
        if (this.bulbMaterial) this.bulbMaterial.emissiveIntensity = 0.1;
      } else if (sunHeight > -0.1) {
        skyColor.setHex(16742212);
        fogColor.setHex(15235677);
        sunColor.setHex(16755285);
        sunIntensity = 0.9;
        if (this.bulbMaterial) this.bulbMaterial.emissiveIntensity = 0.8;
      } else {
        skyColor.setHex(395284);
        fogColor.setHex(790560);
        sunColor.setHex(4482730);
        sunIntensity = 0.2;
        isNight = true;
        if (this.bulbMaterial) this.bulbMaterial.emissiveIntensity = 1.5;
      }
      if (this.weather === "rain") {
        skyColor.setHex(3818061);
        fogColor.setHex(4870749);
        sunIntensity = 0.4;
        this.fog.density = 22e-4;
        this.rainParticles.visible = true;
      } else {
        this.fog.density = 8e-4;
        if (this.rainParticles) this.rainParticles.visible = false;
      }
      this.scene.background = skyColor;
      this.fog.color = fogColor;
      this.sunLight.color = sunColor;
      this.sunLight.intensity = sunIntensity;
      this.ambientLight.intensity = isNight ? 0.25 : 0.65;
    }
    setWeather(weatherType) {
      this.weather = weatherType;
      if (weatherType === "sunset") {
        this.timeOfDay = 0.74;
        this.isDynamicTime = false;
      } else if (weatherType === "night") {
        this.timeOfDay = 0.95;
        this.isDynamicTime = false;
      } else if (weatherType === "clear") {
        this.timeOfDay = 0.4;
        this.isDynamicTime = true;
      }
    }
  };

  // src/vehicles.js
  var VEHICLE_DEFINITIONS = {
    "breeze_rs": {
      id: "breeze_rs",
      name: "Breeze RS",
      className: "Compact Hot Hatch",
      description: "Nimble, lightweight front-wheel-drive hot hatchback. Snappy turn-in, ultra-forgiving, and exceptionally fun on tight city circuits.",
      price: 0,
      // Starter car
      stats: {
        powerHp: 210,
        massKg: 1150,
        topSpeedMph: 138,
        accel060: 5.8,
        handling: 85,
        braking: 80,
        drivetrain: "FWD",
        difficulty: "Easy"
      },
      physics: {
        wheelbase: 2.45,
        trackWidth: 1.55,
        cgHeight: 0.45,
        drivetrain: "FWD",
        // 'FWD', 'RWD', 'AWD'
        frontTorqueRatio: 1,
        peakTorque: 320,
        maxRpm: 7800,
        idleRpm: 850,
        gearRatios: [3.4, 2.1, 1.45, 1.1, 0.88, 0.72],
        finalDrive: 3.9,
        tireGripBase: 1.15,
        suspensionStiffness: 32e3,
        suspensionDamping: 3200,
        suspensionRestLength: 0.38,
        dragCoeff: 0.32,
        downforceCoeff: 0.15
      },
      defaultColor: "#00e5ff"
    },
    "veloce_gt": {
      id: "veloce_gt",
      name: "Veloce GT",
      className: "Sports Coupe",
      description: "Classic front-engine rear-wheel-drive sports coupe with 50:50 weight balance. Built for carving apexes and holding long power slides.",
      price: 25e3,
      stats: {
        powerHp: 370,
        massKg: 1380,
        topSpeedMph: 174,
        accel060: 4.2,
        handling: 90,
        braking: 86,
        drivetrain: "RWD",
        difficulty: "Medium"
      },
      physics: {
        wheelbase: 2.62,
        trackWidth: 1.62,
        cgHeight: 0.42,
        drivetrain: "RWD",
        frontTorqueRatio: 0,
        peakTorque: 480,
        maxRpm: 8200,
        idleRpm: 800,
        gearRatios: [3.6, 2.25, 1.55, 1.18, 0.94, 0.78],
        finalDrive: 3.73,
        tireGripBase: 1.25,
        suspensionStiffness: 38e3,
        suspensionDamping: 3600,
        suspensionRestLength: 0.35,
        dragCoeff: 0.29,
        downforceCoeff: 0.35
      },
      defaultColor: "#ff3300"
    },
    "apex_nomad": {
      id: "apex_nomad",
      name: "Apex Nomad",
      className: "AWD Rally Crossover",
      description: "Turbocharged rally-bred all-wheel-drive crossover. High-travel suspension, rugged tires, and unflappable all-weather traction.",
      price: 4e4,
      stats: {
        powerHp: 410,
        massKg: 1520,
        topSpeedMph: 158,
        accel060: 3.7,
        handling: 88,
        braking: 85,
        drivetrain: "AWD",
        difficulty: "Easy"
      },
      physics: {
        wheelbase: 2.68,
        trackWidth: 1.68,
        cgHeight: 0.52,
        drivetrain: "AWD",
        frontTorqueRatio: 0.45,
        peakTorque: 540,
        maxRpm: 7600,
        idleRpm: 900,
        gearRatios: [3.8, 2.35, 1.62, 1.22, 0.96, 0.79],
        finalDrive: 4.1,
        tireGripBase: 1.3,
        suspensionStiffness: 28e3,
        suspensionDamping: 3100,
        suspensionRestLength: 0.48,
        dragCoeff: 0.36,
        downforceCoeff: 0.22
      },
      defaultColor: "#2ecc71"
    },
    "thunderbolt_454": {
      id: "thunderbolt_454",
      name: "Thunderbolt 454",
      className: "American Muscle",
      description: "Raw high-displacement V8 muscle car. Huge low-end torque, dramatic burnouts, and demanding rear traction that rewards bold drivers.",
      price: 65e3,
      stats: {
        powerHp: 520,
        massKg: 1720,
        topSpeedMph: 168,
        accel060: 3.9,
        handling: 76,
        braking: 78,
        drivetrain: "RWD",
        difficulty: "Hard"
      },
      physics: {
        wheelbase: 2.8,
        trackWidth: 1.66,
        cgHeight: 0.48,
        drivetrain: "RWD",
        frontTorqueRatio: 0,
        peakTorque: 720,
        maxRpm: 6800,
        idleRpm: 750,
        gearRatios: [3.3, 2.15, 1.48, 1.12, 0.86, 0.68],
        finalDrive: 3.55,
        tireGripBase: 1.18,
        suspensionStiffness: 35e3,
        suspensionDamping: 3400,
        suspensionRestLength: 0.38,
        dragCoeff: 0.38,
        downforceCoeff: 0.18
      },
      defaultColor: "#3498db"
    },
    "phantom_valkyrie": {
      id: "phantom_valkyrie",
      name: "Phantom Valkyrie",
      className: "Track Hypercar",
      description: "Carbon-fiber aerodynamic hypercar with hybrid AWD, active aero rear wing, razor-sharp steering, and blistering 230+ mph top speed.",
      price: 12e4,
      stats: {
        powerHp: 840,
        massKg: 1260,
        topSpeedMph: 236,
        accel060: 2.3,
        handling: 98,
        braking: 98,
        drivetrain: "AWD",
        difficulty: "Expert"
      },
      physics: {
        wheelbase: 2.74,
        trackWidth: 1.74,
        cgHeight: 0.35,
        drivetrain: "AWD",
        frontTorqueRatio: 0.4,
        peakTorque: 950,
        maxRpm: 9200,
        idleRpm: 950,
        gearRatios: [3.9, 2.45, 1.72, 1.3, 1.04, 0.85, 0.7],
        finalDrive: 3.45,
        tireGripBase: 1.55,
        suspensionStiffness: 52e3,
        suspensionDamping: 4800,
        suspensionRestLength: 0.28,
        dragCoeff: 0.26,
        downforceCoeff: 0.85
      },
      defaultColor: "#9b59b6"
    }
  };
  var VehicleModelBuilder = class {
    /**
     * Build complete 3D procedural vehicle mesh in Three.js
     */
    static buildVehicle(vehicleId, paintHex = "#00e5ff") {
      const def = VEHICLE_DEFINITIONS[vehicleId] || VEHICLE_DEFINITIONS["breeze_rs"];
      const carGroup = new THREE.Group();
      carGroup.name = `Car_${vehicleId}`;
      const paintColor = new THREE.Color(paintHex);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: paintColor,
        roughness: 0.22,
        metalness: 0.75,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1
      });
      const carbonMaterial = new THREE.MeshStandardMaterial({
        color: 1118484,
        roughness: 0.4,
        metalness: 0.3
      });
      const glassMaterial = new THREE.MeshStandardMaterial({
        color: 1120290,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.82
      });
      const chromeMaterial = new THREE.MeshStandardMaterial({
        color: 14540253,
        roughness: 0.1,
        metalness: 0.95
      });
      const headlightGlass = new THREE.MeshStandardMaterial({
        color: 16777215,
        emissive: 16777215,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.5
      });
      const taillightGlass = new THREE.MeshStandardMaterial({
        color: 16716066,
        emissive: 16711697,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.2
      });
      const chassisGroup = new THREE.Group();
      chassisGroup.name = "Chassis";
      carGroup.add(chassisGroup);
      let activeWingMesh = null;
      let steeringWheelMesh = null;
      let interiorDashMesh = null;
      if (vehicleId === "breeze_rs") {
        const lowerGeo = new THREE.BoxGeometry(1.55, 0.45, 3.7);
        const lowerMesh = new THREE.Mesh(lowerGeo, bodyMaterial);
        lowerMesh.position.y = 0.42;
        lowerMesh.castShadow = true;
        chassisGroup.add(lowerMesh);
        const cabinGeo = new THREE.BoxGeometry(1.35, 0.5, 2.1);
        const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
        cabinMesh.position.set(0, 0.85, -0.2);
        cabinMesh.castShadow = true;
        chassisGroup.add(cabinMesh);
        const windshieldGeo = new THREE.BoxGeometry(1.32, 0.42, 0.8);
        const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMaterial);
        windshieldMesh.position.set(0, 0.82, 0.55);
        windshieldMesh.rotation.x = 0.35;
        chassisGroup.add(windshieldMesh);
        const spoilerGeo = new THREE.BoxGeometry(1.3, 0.06, 0.3);
        const spoilerMesh = new THREE.Mesh(spoilerGeo, carbonMaterial);
        spoilerMesh.position.set(0, 1.12, -1.25);
        chassisGroup.add(spoilerMesh);
      } else if (vehicleId === "veloce_gt") {
        const baseGeo = new THREE.BoxGeometry(1.62, 0.38, 4.2);
        const baseMesh = new THREE.Mesh(baseGeo, bodyMaterial);
        baseMesh.position.y = 0.38;
        baseMesh.castShadow = true;
        chassisGroup.add(baseMesh);
        const cabinGeo = new THREE.BoxGeometry(1.38, 0.42, 2);
        const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
        cabinMesh.position.set(0, 0.74, -0.35);
        cabinMesh.castShadow = true;
        chassisGroup.add(cabinMesh);
        const rearGlassGeo = new THREE.BoxGeometry(1.32, 0.38, 0.9);
        const rearGlassMesh = new THREE.Mesh(rearGlassGeo, glassMaterial);
        rearGlassMesh.position.set(0, 0.72, -1.1);
        rearGlassMesh.rotation.x = -0.5;
        chassisGroup.add(rearGlassMesh);
        const frontGlassGeo = new THREE.BoxGeometry(1.34, 0.4, 0.9);
        const frontGlassMesh = new THREE.Mesh(frontGlassGeo, glassMaterial);
        frontGlassMesh.position.set(0, 0.72, 0.45);
        frontGlassMesh.rotation.x = 0.5;
        chassisGroup.add(frontGlassMesh);
        const splitterGeo = new THREE.BoxGeometry(1.64, 0.08, 0.4);
        const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
        splitterMesh.position.set(0, 0.22, 2.05);
        chassisGroup.add(splitterMesh);
        const ducktailGeo = new THREE.BoxGeometry(1.4, 0.1, 0.2);
        const ducktailMesh = new THREE.Mesh(ducktailGeo, bodyMaterial);
        ducktailMesh.position.set(0, 0.65, -2.05);
        chassisGroup.add(ducktailMesh);
      } else if (vehicleId === "apex_nomad") {
        const bodyGeo = new THREE.BoxGeometry(1.68, 0.55, 4);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
        bodyMesh.position.y = 0.58;
        bodyMesh.castShadow = true;
        chassisGroup.add(bodyMesh);
        const cabinGeo = new THREE.BoxGeometry(1.48, 0.52, 2.3);
        const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
        cabinMesh.position.set(0, 1.05, -0.15);
        cabinMesh.castShadow = true;
        chassisGroup.add(cabinMesh);
        const rackGeo = new THREE.BoxGeometry(1.3, 0.08, 1.8);
        const rackMesh = new THREE.Mesh(rackGeo, carbonMaterial);
        rackMesh.position.set(0, 1.35, -0.15);
        chassisGroup.add(rackMesh);
        const lightbarGeo = new THREE.BoxGeometry(1.1, 0.08, 0.1);
        const lightbarMesh = new THREE.Mesh(lightbarGeo, headlightGlass);
        lightbarMesh.position.set(0, 1.42, 0.7);
        chassisGroup.add(lightbarMesh);
        [-0.88, 0.88].forEach((x) => {
          const flareF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.8), carbonMaterial);
          flareF.position.set(x, 0.52, 1.25);
          chassisGroup.add(flareF);
          const flareR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.8), carbonMaterial);
          flareR.position.set(x, 0.52, -1.25);
          chassisGroup.add(flareR);
        });
      } else if (vehicleId === "thunderbolt_454") {
        const muscleGeo = new THREE.BoxGeometry(1.66, 0.44, 4.4);
        const muscleMesh = new THREE.Mesh(muscleGeo, bodyMaterial);
        muscleMesh.position.y = 0.45;
        muscleMesh.castShadow = true;
        chassisGroup.add(muscleMesh);
        const scoopGeo = new THREE.BoxGeometry(0.6, 0.12, 0.9);
        const scoopMesh = new THREE.Mesh(scoopGeo, carbonMaterial);
        scoopMesh.position.set(0, 0.72, 1.1);
        chassisGroup.add(scoopMesh);
        const cabinGeo = new THREE.BoxGeometry(1.42, 0.44, 2.1);
        const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
        cabinMesh.position.set(0, 0.82, -0.3);
        cabinMesh.castShadow = true;
        chassisGroup.add(cabinMesh);
        const fChrome = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 0.15), chromeMaterial);
        fChrome.position.set(0, 0.38, 2.22);
        chassisGroup.add(fChrome);
        const rChrome = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 0.15), chromeMaterial);
        rChrome.position.set(0, 0.42, -2.22);
        chassisGroup.add(rChrome);
      } else if (vehicleId === "phantom_valkyrie") {
        const hyperBaseGeo = new THREE.BoxGeometry(1.74, 0.28, 4.3);
        const hyperBaseMesh = new THREE.Mesh(hyperBaseGeo, bodyMaterial);
        hyperBaseMesh.position.y = 0.32;
        hyperBaseMesh.castShadow = true;
        chassisGroup.add(hyperBaseMesh);
        const domeGeo = new THREE.SphereGeometry(0.68, 16, 12);
        domeGeo.scale(1, 0.6, 2.2);
        const domeMesh = new THREE.Mesh(domeGeo, glassMaterial);
        domeMesh.position.set(0, 0.55, 0.1);
        chassisGroup.add(domeMesh);
        const wingGroup = new THREE.Group();
        wingGroup.position.set(0, 0.68, -1.9);
        const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.04, 0.35), carbonMaterial);
        wingBlade.castShadow = true;
        wingGroup.add(wingBlade);
        [-0.45, 0.45].forEach((x) => {
          const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.15), carbonMaterial);
          strut.position.set(x, -0.15, 0);
          wingGroup.add(strut);
        });
        chassisGroup.add(wingGroup);
        activeWingMesh = wingGroup;
      }
      [-0.55, 0.55].forEach((x) => {
        const hlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.1), headlightGlass);
        hlMesh.position.set(x, 0.46, def.physics.wheelbase * 0.5 + 0.85);
        chassisGroup.add(hlMesh);
      });
      [-0.55, 0.55].forEach((x) => {
        const tlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), taillightGlass);
        tlMesh.position.set(x, 0.48, -(def.physics.wheelbase * 0.5) - 0.85);
        chassisGroup.add(tlMesh);
      });
      const interiorGroup = new THREE.Group();
      interiorGroup.position.set(0, 0.45, 0.2);
      const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.4), carbonMaterial);
      dashMesh.position.set(0, 0.25, 0.35);
      interiorGroup.add(dashMesh);
      const wheelTorus = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 16), carbonMaterial);
      wheelTorus.position.set(-0.32, 0.28, 0.15);
      wheelTorus.rotation.x = 0.35;
      interiorGroup.add(wheelTorus);
      steeringWheelMesh = wheelTorus;
      chassisGroup.add(interiorGroup);
      const wheelMeshes = [];
      const wb = def.physics.wheelbase;
      const tw = def.physics.trackWidth;
      const wheelPositions = [
        { name: "FL", pos: new THREE.Vector3(-tw * 0.5, 0.32, wb * 0.5), isFront: true },
        { name: "FR", pos: new THREE.Vector3(tw * 0.5, 0.32, wb * 0.5), isFront: true },
        { name: "RL", pos: new THREE.Vector3(-tw * 0.5, 0.32, -wb * 0.5), isFront: false },
        { name: "RR", pos: new THREE.Vector3(tw * 0.5, 0.32, -wb * 0.5), isFront: false }
      ];
      const tireMaterial = new THREE.MeshStandardMaterial({
        color: 1579034,
        roughness: 0.85,
        metalness: 0.1
      });
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 13421772,
        roughness: 0.25,
        metalness: 0.85
      });
      const brakeCaliperMaterial = new THREE.MeshStandardMaterial({
        color: 16711748,
        roughness: 0.3,
        metalness: 0.6
      });
      wheelPositions.forEach((wp, index) => {
        const wheelHub = new THREE.Group();
        wheelHub.name = `Wheel_${wp.name}`;
        wheelHub.position.copy(wp.pos);
        const wheelSpinGroup = new THREE.Group();
        const tireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.26, 20);
        tireGeo.rotateZ(Math.PI / 2);
        const tireMesh = new THREE.Mesh(tireGeo, tireMaterial);
        tireMesh.castShadow = true;
        wheelSpinGroup.add(tireMesh);
        const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.27, 12);
        rimGeo.rotateZ(Math.PI / 2);
        const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
        wheelSpinGroup.add(rimMesh);
        wheelHub.add(wheelSpinGroup);
        const caliperMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.14), brakeCaliperMaterial);
        caliperMesh.position.set(wp.pos.x > 0 ? -0.06 : 0.06, 0.1, 0);
        wheelHub.add(caliperMesh);
        carGroup.add(wheelHub);
        wheelMeshes.push({
          hub: wheelHub,
          spinner: wheelSpinGroup,
          isFront: wp.isFront,
          restPos: wp.pos.clone()
        });
      });
      return {
        group: carGroup,
        chassis: chassisGroup,
        bodyMaterial,
        wheels: wheelMeshes,
        activeWing: activeWingMesh,
        steeringWheel: steeringWheelMesh,
        taillightMaterial: taillightGlass,
        def
      };
    }
  };

  // src/physics.js
  var VehiclePhysics = class {
    constructor(vehicleDef, world, saveManager) {
      this.def = vehicleDef;
      this.world = world;
      this.saveManager = saveManager;
      this.position = new THREE.Vector3(0, 4, 80);
      this.quaternion = new THREE.Quaternion();
      this.velocity = new THREE.Vector3();
      this.angularVelocity = new THREE.Vector3();
      this.engineRpm = this.def.physics.idleRpm;
      this.currentGear = 1;
      this.gearShiftTimer = 0;
      this.throttle = 0;
      this.brake = 0;
      this.steerInput = 0;
      this.handbrake = 0;
      this.steeringAngle = 0;
      this.nitro = 1;
      this.isNitroActive = false;
      this.speedMps = 0;
      this.speedMph = 0;
      this.speedKmh = 0;
      this.forwardSpeed = 0;
      this.lateralSpeed = 0;
      this.slipAngle = 0;
      this.driftScore = 0;
      this.isDrifting = false;
      this.bodyPitch = 0;
      this.bodyRoll = 0;
      this.absActive = false;
      this.tcsActive = false;
      this.espActive = false;
      this.upsideDownTimer = 0;
      this.powerMultiplier = 1;
      this.gripMultiplier = 1;
      this.weightMultiplier = 1;
      this.hasNitroUpgrade = false;
      this.applyUpgrades();
    }
    applyUpgrades() {
      const upgrades = this.saveManager.data.vehicleUpgrades[this.def.id] || { engine: 0, tires: 0, weight: 0, nitro: 0 };
      this.powerMultiplier = 1 + (upgrades.engine || 0) * 0.15;
      this.gripMultiplier = 1 + (upgrades.tires || 0) * 0.12;
      this.weightMultiplier = 1 - (upgrades.weight || 0) * 0.08;
      this.hasNitroUpgrade = (upgrades.nitro || 0) > 0;
    }
    update(dt, input, carGroup, chassisMesh, wheelMeshes, activeWingMesh, steeringWheelMesh) {
      if (dt > 0.1) dt = 0.1;
      const p = this.def.physics;
      const settings = this.saveManager.data.settings;
      this.throttle = input.throttle || 0;
      this.brake = input.brake || 0;
      this.handbrake = input.handbrake ? 1 : 0;
      this.steerInput = input.steer || 0;
      const maxSteerAngle = MathUtils.degToRad(36) / (1 + this.speedMps / 26);
      const targetSteer = this.steerInput * maxSteerAngle;
      const steerRate = 8 * (settings.steerSensitivity || 1);
      this.steeringAngle = MathUtils.damp(this.steeringAngle, targetSteer, steerRate, dt);
      if (input.nitro && this.hasNitroUpgrade && this.nitro > 0.05 && this.throttle > 0.5) {
        this.isNitroActive = true;
        this.nitro = Math.max(0, this.nitro - dt * 0.35);
      } else {
        this.isNitroActive = false;
        this.nitro = Math.min(1, this.nitro + dt * 0.08);
      }
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
      this.forwardSpeed = this.velocity.dot(forward);
      this.lateralSpeed = this.velocity.dot(right);
      this.speedMps = this.velocity.length();
      this.speedMph = this.speedMps * 2.23694;
      this.speedKmh = this.speedMps * 3.6;
      const groundY = this.world.getGroundHeight(this.position.x, this.position.z);
      const surfaceType = this.world.getSurfaceType(this.position.x, this.position.z);
      let surfaceGrip = 1;
      if (surfaceType === "WET_ASPHALT") surfaceGrip = 0.78;
      else if (surfaceType === "DIRT") surfaceGrip = 0.58;
      else if (surfaceType === "GRASS") surfaceGrip = 0.42;
      else if (surfaceType === "SAND") surfaceGrip = 0.48;
      if (p.drivetrain === "AWD" && (surfaceType === "DIRT" || surfaceType === "GRASS")) {
        surfaceGrip *= 1.25;
      }
      const isGrounded = this.position.y <= groundY + 0.65;
      this.gearShiftTimer += dt;
      if (this.currentGear > 0) {
        const gearRatio = p.gearRatios[this.currentGear - 1] || 1;
        const expectedRpm = Math.abs(this.forwardSpeed) / (0.33 * 2 * Math.PI) * 60 * gearRatio * p.finalDrive;
        this.engineRpm = MathUtils.clamp(expectedRpm + this.throttle * 1200, p.idleRpm, p.maxRpm);
        if (this.engineRpm > p.maxRpm - 500 && this.currentGear < p.gearRatios.length && this.gearShiftTimer > 0.4) {
          this.currentGear++;
          this.gearShiftTimer = 0;
        } else if (this.engineRpm < 2600 && this.currentGear > 1 && this.gearShiftTimer > 0.4) {
          this.currentGear--;
          this.gearShiftTimer = 0;
        }
        if (this.forwardSpeed < 0.5 && this.brake > 0.5 && this.throttle === 0) {
          this.currentGear = -1;
        }
      } else if (this.currentGear === -1) {
        this.engineRpm = MathUtils.clamp(p.idleRpm + this.brake * 3500, p.idleRpm, 5e3);
        if (this.forwardSpeed > -0.5 && this.throttle > 0.5) {
          this.currentGear = 1;
        }
      }
      let driveForce = 0;
      const effectiveTorque = p.peakTorque * this.powerMultiplier * (this.isNitroActive ? 1.45 : 1);
      if (this.currentGear > 0) {
        const gearRatio = p.gearRatios[this.currentGear - 1] || 1;
        driveForce = effectiveTorque * gearRatio * p.finalDrive * this.throttle / 0.33;
      } else if (this.currentGear === -1) {
        driveForce = -(effectiveTorque * 3.2 * p.finalDrive * this.brake) / 0.33;
      }
      let brakeForce = 0;
      if (this.currentGear > 0 && this.brake > 0) {
        brakeForce = this.brake * 14e3;
        if (settings.abs) {
          this.absActive = true;
        }
      } else {
        this.absActive = false;
      }
      const airDensity = 1.225;
      const dragForce = 0.5 * airDensity * p.dragCoeff * 2.2 * (this.speedMps * this.speedMps);
      const downforce = 0.5 * airDensity * p.downforceCoeff * 2.2 * (this.speedMps * this.speedMps);
      this.slipAngle = Math.atan2(this.lateralSpeed, Math.max(1, Math.abs(this.forwardSpeed)));
      const totalMass = p.massKg * this.weightMultiplier;
      const normalLoad = totalMass * 9.81 + downforce;
      let lateralFriction = p.tireGripBase * this.gripMultiplier * surfaceGrip;
      if (this.handbrake > 0.5) {
        lateralFriction *= 0.32;
      }
      const absSlipDeg = Math.abs(MathUtils.radToDeg(this.slipAngle));
      if (absSlipDeg > 12 && this.speedMph > 22 && isGrounded) {
        this.isDrifting = true;
        const driftMult = Math.min(5, 1 + Math.floor(this.driftScore / 2500));
        this.driftScore += Math.round(absSlipDeg * (this.speedMph / 25) * driftMult * dt * 4);
      } else {
        this.isDrifting = false;
      }
      let corneringForce = -Math.sin(this.slipAngle) * normalLoad * lateralFriction;
      if (settings.esp && Math.abs(this.slipAngle) > 0.5) {
        corneringForce *= 1.4;
        this.espActive = true;
      } else {
        this.espActive = false;
      }
      let steerYawRate = this.steeringAngle * (this.forwardSpeed / p.wheelbase);
      if (p.drivetrain === "RWD" && this.throttle > 0.7 && absSlipDeg > 10) {
        steerYawRate += Math.sign(this.steeringAngle || this.lateralSpeed) * 0.45;
      } else if (p.drivetrain === "FWD" && this.throttle > 0.7) {
        steerYawRate *= 0.82;
      }
      if (isGrounded) {
        const netLongitudinalForce = driveForce - Math.sign(this.forwardSpeed) * (brakeForce + dragForce);
        const accelLong = netLongitudinalForce / totalMass;
        const accelLat = corneringForce / totalMass;
        const newForwardSpeed = this.forwardSpeed + accelLong * dt;
        const newLateralSpeed = this.lateralSpeed + accelLat * dt;
        this.velocity.copy(forward).multiplyScalar(newForwardSpeed).add(right.clone().multiplyScalar(newLateralSpeed));
        this.angularVelocity.y = MathUtils.damp(this.angularVelocity.y, steerYawRate, 14, dt);
      } else {
        this.velocity.y -= 9.81 * 1.8 * dt;
        this.angularVelocity.multiplyScalar(0.95);
      }
      this.position.addScaledVector(this.velocity, dt);
      const deltaRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * dt);
      this.quaternion.multiply(deltaRot);
      if (this.position.y < groundY + 0.35) {
        this.position.y = groundY + 0.35;
        if (this.velocity.y < 0) this.velocity.y = 0;
      }
      const targetPitch = MathUtils.clamp(-this.forwardSpeed * 5e-3 + this.brake * 0.08 - this.throttle * 0.05, -0.15, 0.15);
      const targetRoll = MathUtils.clamp(-this.angularVelocity.y * 0.12, -0.18, 0.18);
      this.bodyPitch = MathUtils.damp(this.bodyPitch, targetPitch, 10, dt);
      this.bodyRoll = MathUtils.damp(this.bodyRoll, targetRoll, 10, dt);
      this.resolveWorldCollisions();
      const carUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
      if (carUp.y < 0.2 || this.position.y < -5) {
        this.upsideDownTimer += dt;
        if (this.upsideDownTimer > 2.5) {
          this.resetVehicle();
        }
      } else {
        this.upsideDownTimer = 0;
      }
      if (carGroup) {
        carGroup.position.copy(this.position);
        carGroup.quaternion.copy(this.quaternion);
        if (chassisMesh) {
          chassisMesh.rotation.x = this.bodyPitch;
          chassisMesh.rotation.z = this.bodyRoll;
        }
        if (wheelMeshes) {
          const spinDelta = this.forwardSpeed / 0.33 * dt;
          wheelMeshes.forEach((w) => {
            w.spinner.rotation.x += spinDelta;
            if (w.isFront) {
              w.hub.rotation.y = this.steeringAngle;
            }
          });
        }
        if (steeringWheelMesh) {
          steeringWheelMesh.rotation.z = -this.steeringAngle * 2.8;
        }
        if (activeWingMesh) {
          const brakeTilt = this.brake > 0.3 && this.speedMph > 60 ? 0.6 : 0;
          activeWingMesh.rotation.x = MathUtils.damp(activeWingMesh.rotation.x, -brakeTilt, 12, dt);
        }
      }
    }
    // World Collisions against buildings, barriers, and rocks
    resolveWorldCollisions() {
      const colliders = this.world.colliders;
      const carRadius = 1.6;
      for (let i = 0; i < colliders.length; i++) {
        const col = colliders[i];
        if (col.type === "cylinder") {
          const dist = MathUtils.dist2D(this.position.x, this.position.z, col.x, col.z);
          const minDist = carRadius + col.radius;
          if (dist < minDist && dist > 1e-3) {
            const overlap = minDist - dist;
            const nx = (this.position.x - col.x) / dist;
            const nz = (this.position.z - col.z) / dist;
            this.position.x += nx * overlap;
            this.position.z += nz * overlap;
            this.velocity.x *= 0.4;
            this.velocity.z *= 0.4;
          }
        } else if (col.type === "box") {
          if (this.position.x > col.minX - carRadius && this.position.x < col.maxX + carRadius && this.position.z > col.minZ - carRadius && this.position.z < col.maxZ + carRadius) {
            const dl = Math.abs(this.position.x - (col.minX - carRadius));
            const dr = Math.abs(this.position.x - (col.maxX + carRadius));
            const dt = Math.abs(this.position.z - (col.minZ - carRadius));
            const db = Math.abs(this.position.z - (col.maxZ + carRadius));
            const minEdge = Math.min(dl, dr, dt, db);
            if (minEdge === dl) this.position.x = col.minX - carRadius;
            else if (minEdge === dr) this.position.x = col.maxX + carRadius;
            else if (minEdge === dt) this.position.z = col.minZ - carRadius;
            else if (minEdge === db) this.position.z = col.maxZ + carRadius;
            this.velocity.multiplyScalar(0.35);
          }
        }
      }
      const maxBound = 1150;
      if (Math.abs(this.position.x) > maxBound || Math.abs(this.position.z) > maxBound) {
        this.position.x = MathUtils.clamp(this.position.x, -maxBound, maxBound);
        this.position.z = MathUtils.clamp(this.position.z, -maxBound, maxBound);
        this.velocity.multiplyScalar(-0.5);
      }
    }
    // Safe manual / automatic reset to nearest road
    resetVehicle(targetPosition = null) {
      if (targetPosition) {
        this.position.set(targetPosition.x, this.world.getGroundHeight(targetPosition.x, targetPosition.z) + 0.5, targetPosition.z);
        if (targetPosition.quaternion) {
          this.quaternion.copy(targetPosition.quaternion);
        } else {
          this.quaternion.set(0, 0, 0, 1);
        }
      } else {
        const roadInfo = this.world.getRoadInfo(this.position.x, this.position.z);
        const resetPt = roadInfo.closestPoint || { x: 0, z: 80 };
        const groundY = this.world.getGroundHeight(resetPt.x, resetPt.z);
        this.position.set(resetPt.x, groundY + 0.5, resetPt.z);
        this.quaternion.set(0, 0, 0, 1);
      }
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);
      this.currentGear = 1;
      this.engineRpm = this.def.physics.idleRpm;
      this.upsideDownTimer = 0;
    }
  };

  // src/camera.js
  var CameraController = class {
    constructor(camera, domElement) {
      this.camera = camera;
      this.domElement = domElement;
      this.mode = 0;
      this.modeNames = ["Chase Cam", "Close Chase", "Hood Cam", "Cockpit Cam", "Orbit Showcase", "Drone Cam"];
      this.currentPos = new THREE.Vector3(0, 10, -20);
      this.currentTarget = new THREE.Vector3();
      this.orbitAngle = 0;
      this.orbitRadius = 7.5;
      this.idleTimer = 0;
      this.shakeAmount = 0;
      this.baseFov = 62;
      this.maxFov = 84;
    }
    setMode(modeIndex) {
      this.mode = modeIndex % this.modeNames.length;
    }
    nextMode() {
      this.mode = (this.mode + 1) % this.modeNames.length;
      return this.modeNames[this.mode];
    }
    addShake(amount) {
      this.shakeAmount = Math.min(1.2, this.shakeAmount + amount);
    }
    update(dt, vehiclePhysics, carGroup) {
      if (!carGroup || !vehiclePhysics) return;
      const carPos = vehiclePhysics.position;
      const carQuat = vehiclePhysics.quaternion;
      const speedMph = vehiclePhysics.speedMph;
      const isDrifting = vehiclePhysics.isDrifting;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 2.5);
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeAmount * 0.4,
        (Math.random() - 0.5) * this.shakeAmount * 0.4,
        (Math.random() - 0.5) * this.shakeAmount * 0.4
      );
      const speedFactor = MathUtils.clamp(speedMph / 180, 0, 1);
      const targetFov = MathUtils.lerp(this.baseFov, this.maxFov, speedFactor * speedFactor);
      this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(carQuat);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(carQuat);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(carQuat);
      if (speedMph < 1) {
        this.idleTimer += dt;
      } else {
        this.idleTimer = 0;
      }
      let desiredPos = new THREE.Vector3();
      let desiredTarget = new THREE.Vector3();
      if (this.mode === 0) {
        const followDist = 6.2 + speedFactor * 1.5;
        const followHeight = 2.4;
        const driftSwing = right.clone().multiplyScalar(-vehiclePhysics.slipAngle * 1.8);
        desiredPos.copy(carPos).addScaledVector(forward, -followDist).addScaledVector(up, followHeight).add(driftSwing);
        desiredTarget.copy(carPos).addScaledVector(forward, 6).addScaledVector(up, 1.2);
        this.currentPos.lerp(desiredPos, 1 - Math.exp(-8 * dt));
        this.currentTarget.lerp(desiredTarget, 1 - Math.exp(12 * dt));
      } else if (this.mode === 1) {
        desiredPos.copy(carPos).addScaledVector(forward, -4.5).addScaledVector(up, 1.7);
        desiredTarget.copy(carPos).addScaledVector(forward, 8).addScaledVector(up, 1);
        this.currentPos.lerp(desiredPos, 1 - Math.exp(-12 * dt));
        this.currentTarget.lerp(desiredTarget, 1 - Math.exp(14 * dt));
      } else if (this.mode === 2) {
        desiredPos.copy(carPos).addScaledVector(forward, 1.4).addScaledVector(up, 0.85);
        desiredTarget.copy(carPos).addScaledVector(forward, 25).addScaledVector(up, 0.7);
        this.currentPos.copy(desiredPos);
        this.currentTarget.copy(desiredTarget);
      } else if (this.mode === 3) {
        desiredPos.copy(carPos).addScaledVector(forward, 0.1).addScaledVector(right, -0.32).addScaledVector(up, 0.95);
        desiredTarget.copy(carPos).addScaledVector(forward, 20).addScaledVector(up, 0.85);
        this.currentPos.copy(desiredPos);
        this.currentTarget.copy(desiredTarget);
      } else if (this.mode === 4) {
        this.orbitAngle += dt * 0.4;
        desiredPos.set(
          carPos.x + Math.sin(this.orbitAngle) * this.orbitRadius,
          carPos.y + 2.2,
          carPos.z + Math.cos(this.orbitAngle) * this.orbitRadius
        );
        desiredTarget.copy(carPos).addScaledVector(up, 0.8);
        this.currentPos.lerp(desiredPos, 1 - Math.exp(-6 * dt));
        this.currentTarget.copy(desiredTarget);
      } else if (this.mode === 5) {
        desiredPos.copy(carPos).addScaledVector(forward, -14).addScaledVector(up, 9);
        desiredTarget.copy(carPos);
        this.currentPos.lerp(desiredPos, 1 - Math.exp(-5 * dt));
        this.currentTarget.lerp(desiredTarget, 1 - Math.exp(8 * dt));
      }
      this.camera.position.copy(this.currentPos).add(shakeOffset);
      this.camera.lookAt(this.currentTarget);
    }
  };

  // src/traffic.js
  var TrafficSystem = class {
    constructor(scene, world) {
      this.scene = scene;
      this.world = world;
      this.vehicles = [];
      this.maxTraffic = 14;
      this.initTraffic();
    }
    initTraffic() {
      const trafficTypes = [
        { name: "Sedan", w: 1.6, h: 0.7, l: 3.8, color: 3447003 },
        { name: "SUV", w: 1.8, h: 0.9, l: 4.2, color: 15158332 },
        { name: "Compact", w: 1.4, h: 0.65, l: 3.2, color: 15844367 },
        { name: "Van", w: 1.9, h: 1.1, l: 4.8, color: 15528177 }
      ];
      const trafficColors = [2899536, 9807270, 12597547, 2719929, 13849600, 1482885, 8359053];
      for (let i = 0; i < this.maxTraffic; i++) {
        const type = trafficTypes[i % trafficTypes.length];
        const color = trafficColors[i % trafficColors.length];
        const carMesh = this.buildTrafficMesh(type, color);
        this.scene.add(carMesh);
        const segIndex = i % this.world.roadSegments.length;
        const seg = this.world.roadSegments[segIndex];
        const ptIndex = Math.floor(Math.random() * (seg.points.length - 1));
        const v = {
          mesh: carMesh,
          segIndex,
          ptIndex,
          progress: Math.random(),
          speed: 15 + Math.random() * 10,
          targetSpeed: 20,
          position: new THREE.Vector3(),
          forward: new THREE.Vector3(),
          laneOffset: (Math.random() > 0.5 ? 1 : -1) * 2.8,
          isBraking: false
        };
        this.vehicles.push(v);
        this.updateVehicleTransform(v, 0);
      }
    }
    buildTrafficMesh(type, colorHex) {
      const group = new THREE.Group();
      group.name = "TrafficCar";
      const bodyMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.4
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 1119776,
        roughness: 0.1,
        metalness: 0.9
      });
      const wheelMat = new THREE.MeshStandardMaterial({
        color: 2236962,
        roughness: 0.8
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(type.w, type.h * 0.6, type.l), bodyMat);
      body.position.y = type.h * 0.6 * 0.5 + 0.25;
      body.castShadow = true;
      group.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(type.w * 0.88, type.h * 0.5, type.l * 0.55), glassMat);
      cabin.position.set(0, type.h * 0.75 + 0.25, -type.l * 0.05);
      cabin.castShadow = true;
      group.add(cabin);
      [-type.w * 0.5, type.w * 0.5].forEach((x) => {
        [-type.l * 0.32, type.l * 0.32].forEach((z) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.3, z);
          group.add(wheel);
        });
      });
      return group;
    }
    update(dt, playerPosition, playerPhysics) {
      for (let i = 0; i < this.vehicles.length; i++) {
        const v = this.vehicles[i];
        const seg = this.world.roadSegments[v.segIndex];
        if (!seg || seg.points.length < 2) continue;
        let obstacleAhead = false;
        if (playerPosition) {
          const distToPlayer = MathUtils.dist2D(v.position.x, v.position.z, playerPosition.x, playerPosition.z);
          if (distToPlayer < 12) {
            const toPlayer = new THREE.Vector3().subVectors(playerPosition, v.position).normalize();
            if (v.forward.dot(toPlayer) > 0.6) {
              obstacleAhead = true;
            }
          }
          if (distToPlayer < 2.8 && playerPhysics) {
            const pushDir = new THREE.Vector3().subVectors(v.position, playerPosition).normalize();
            v.position.addScaledVector(pushDir, 1.2);
            playerPhysics.velocity.multiplyScalar(0.7);
          }
          if (distToPlayer > 400) {
            this.respawnNearPlayer(v, playerPosition);
          }
        }
        for (let j = 0; j < this.vehicles.length; j++) {
          if (i === j) continue;
          const other = this.vehicles[j];
          const distOther = MathUtils.dist2D(v.position.x, v.position.z, other.position.x, other.position.z);
          if (distOther < 10) {
            const toOther = new THREE.Vector3().subVectors(other.position, v.position).normalize();
            if (v.forward.dot(toOther) > 0.7) {
              obstacleAhead = true;
            }
          }
        }
        if (obstacleAhead) {
          v.speed = MathUtils.damp(v.speed, 0, 8, dt);
        } else {
          const roadSpeedLimit = seg.points[v.ptIndex]?.speedLimit || 45;
          const targetMps = roadSpeedLimit * 0.44704 * 0.8;
          v.speed = MathUtils.damp(v.speed, targetMps, 3, dt);
        }
        const p1 = seg.points[v.ptIndex];
        const nextIdx = (v.ptIndex + 1) % seg.points.length;
        const p2 = seg.points[nextIdx];
        const segmentDist = MathUtils.dist2D(p1.x, p1.z, p2.x, p2.z) || 1;
        v.progress += v.speed * dt / segmentDist;
        if (v.progress >= 1) {
          v.progress = 0;
          v.ptIndex = nextIdx;
        }
        this.updateVehicleTransform(v, dt);
      }
    }
    updateVehicleTransform(v, dt) {
      const seg = this.world.roadSegments[v.segIndex];
      const p1 = seg.points[v.ptIndex];
      const nextIdx = (v.ptIndex + 1) % seg.points.length;
      const p2 = seg.points[nextIdx];
      const tx = p2.x - p1.x;
      const tz = p2.z - p1.z;
      const tLen = Math.sqrt(tx * tx + tz * tz) || 1;
      const dirX = tx / tLen;
      const dirZ = tz / tLen;
      const perpX = -dirZ;
      const perpZ = dirX;
      const cx = MathUtils.lerp(p1.x, p2.x, v.progress);
      const cz = MathUtils.lerp(p1.z, p2.z, v.progress);
      v.position.x = cx + perpX * v.laneOffset;
      v.position.z = cz + perpZ * v.laneOffset;
      v.position.y = this.world.getGroundHeight(v.position.x, v.position.z);
      v.forward.set(dirX, 0, dirZ);
      v.mesh.position.copy(v.position);
      const angle = Math.atan2(dirX, dirZ);
      v.mesh.rotation.y = angle;
    }
    respawnNearPlayer(v, playerPosition) {
      v.segIndex = Math.floor(Math.random() * this.world.roadSegments.length);
      const seg = this.world.roadSegments[v.segIndex];
      v.ptIndex = Math.floor(Math.random() * (seg.points.length - 1));
      v.progress = Math.random();
      v.speed = 15;
      this.updateVehicleTransform(v, 0);
    }
  };

  // src/events.js
  var EVENT_DEFINITIONS = [
    {
      id: "circuit_marina_gp",
      type: "CIRCUIT_RACE",
      name: "Sunset Marina Grand Prix",
      description: "3 high-intensity laps around the coastal promenade, yacht marina, and coastal highway against rival festival racers.",
      startPos: { x: 200, z: 200 },
      laps: 3,
      rewardCredits: 18e3,
      rewardXP: 600,
      icon: "\u{1F3C1}",
      checkpoints: [
        { x: 200, z: 200 },
        { x: 550, z: 250 },
        { x: 750, z: 500 },
        { x: 600, z: 650 },
        { x: 250, z: 550 },
        { x: 0, z: 750 },
        { x: 0, z: 80 }
      ],
      aiRacers: [
        { name: "Vortex Kai", carId: "veloce_gt", color: 16724736, skill: 0.95 },
        { name: "Drift Queen Maya", carId: "thunderbolt_454", color: 3447003, skill: 0.92 },
        { name: "Rally Nova", carId: "apex_nomad", color: 3066993, skill: 0.88 }
      ]
    },
    {
      id: "sprint_skyline",
      type: "POINT_TO_POINT",
      name: "Skyline Expressway Dash",
      description: "High-speed 4.2 km point-to-point sprint from Downtown City Plaza across the elevated highway viaduct to Industrial Harbor.",
      startPos: { x: 200, z: -150 },
      rewardCredits: 15e3,
      rewardXP: 500,
      icon: "\u26A1",
      checkpoints: [
        { x: 200, z: -150 },
        { x: 600, z: -150 },
        { x: 820, z: 0 },
        { x: 650, z: 650 },
        { x: 0, z: 750 },
        { x: -650, z: 650 }
      ]
    },
    {
      id: "time_trial_alpine",
      type: "TIME_TRIAL",
      name: "Alpine Switchback Trial",
      description: "Demanding mountain hillclimb with 12 switchbacks. Beat the target clock: Gold < 1:15, Silver < 1:30, Bronze < 1:50.",
      startPos: { x: -200, z: -150 },
      rewardCredits: 14e3,
      rewardXP: 450,
      icon: "\u23F1\uFE0F",
      targetTimes: { gold: 75, silver: 90, bronze: 110 },
      checkpoints: [
        { x: -200, z: -150 },
        { x: -350, z: -300 },
        { x: -250, z: -450 },
        { x: -500, z: -550 },
        { x: -400, z: -700 },
        { x: -650, z: -650 }
      ]
    },
    {
      id: "drift_dragons_tail",
      type: "DRIFT_ZONE",
      name: "Dragon\u2019s Tail Drift Summit",
      description: "Mountain pass drift zone. Maintain high slip angles and speed to rack up combo multipliers! 3 Stars: 25,000 pts.",
      startPos: { x: -200, z: -150 },
      endPos: { x: -650, z: -650 },
      rewardCredits: 12e3,
      rewardXP: 400,
      icon: "\u{1F525}",
      targetScores: { star3: 25e3, star2: 15e3, star1: 8e3 }
    },
    {
      id: "delivery_vip_sound",
      type: "DELIVERY",
      name: "Festival VIP Sound Express",
      description: "Rush sensitive festival audio equipment from Industrial Harbor to Downtown Mainstage without smashing the cargo!",
      startPos: { x: -650, z: 650 },
      rewardCredits: 16e3,
      rewardXP: 550,
      icon: "\u{1F4E6}",
      timeLimit: 95,
      checkpoints: [
        { x: -650, z: 650 },
        { x: -820, z: 0 },
        { x: 0, z: 80 },
        { x: 200, z: -150 },
        { x: 0, z: 0 }
      ]
    },
    {
      id: "rally_forest_run",
      type: "OFFROAD_SPRINT",
      name: "Wildlands Forest Rally",
      description: "High-speed off-road dirt rally through dense pine forests, farmland mud trails, and jumps.",
      startPos: { x: -150, z: 150 },
      rewardCredits: 14e3,
      rewardXP: 450,
      icon: "\u{1F332}",
      checkpoints: [
        { x: -150, z: 150 },
        { x: -400, z: 250 },
        { x: -600, z: 450 },
        { x: -450, z: 600 },
        { x: -200, z: 400 },
        { x: 0, z: 80 }
      ]
    }
  ];
  var SPEED_TRAPS = [
    { id: "trap_highway_viaduct", name: "Viaduct Blitz", x: 820, z: 0, speed3Star: 175, speed2Star: 145, speed1Star: 115 },
    { id: "trap_downtown_blvd", name: "Downtown Flash", x: 400, z: -350, speed3Star: 140, speed2Star: 115, speed1Star: 90 },
    { id: "trap_marina_drive", name: "Marina Coast Radar", x: 750, z: 500, speed3Star: 155, speed2Star: 130, speed1Star: 100 },
    { id: "trap_mountain_descent", name: "Alpine Ridge Radar", x: -400, z: -700, speed3Star: 130, speed2Star: 105, speed1Star: 80 }
  ];
  var EventSystem = class {
    constructor(scene, world, saveManager, audioManager) {
      this.scene = scene;
      this.world = world;
      this.saveManager = saveManager;
      this.audioManager = audioManager;
      this.activeEvent = null;
      this.eventState = "IDLE";
      this.currentCheckpointIdx = 0;
      this.currentLap = 1;
      this.raceTimer = 0;
      this.countdownTimer = 3.5;
      this.cargoHealth = 100;
      this.racePosition = 1;
      this.aiCompetitors = [];
      this.eventGateGroup = new THREE.Group();
      this.scene.add(this.eventGateGroup);
      this.checkpointMesh = null;
      this.checkpointArrowMesh = null;
      this.hiddenBadgeMeshes = [];
      this.initEventMarkers();
      this.initCheckpointVisuals();
      this.initBadges();
    }
    initEventMarkers() {
      EVENT_DEFINITIONS.forEach((ev) => {
        const y = this.world.getGroundHeight(ev.startPos.x, ev.startPos.z);
        const gateGroup = new THREE.Group();
        gateGroup.position.set(ev.startPos.x, y, ev.startPos.z);
        const ringGeo = new THREE.RingGeometry(5.5, 6.5, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 16711807,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.y = 0.15;
        gateGroup.add(ringMesh);
        const beamGeo = new THREE.CylinderGeometry(5.8, 5.8, 12, 24, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 61695,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.y = 6;
        gateGroup.add(beamMesh);
        this.eventGateGroup.add(gateGroup);
      });
      SPEED_TRAPS.forEach((trap) => {
        const y = this.world.getGroundHeight(trap.x, trap.z);
        const trapGroup = new THREE.Group();
        trapGroup.position.set(trap.x, y, trap.z);
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 6, 8),
          new THREE.MeshStandardMaterial({ color: 3355443, metalness: 0.8 })
        );
        pole.position.y = 3;
        trapGroup.add(pole);
        const cameraBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.6, 0.8),
          new THREE.MeshStandardMaterial({ color: 16755200, emissive: 16746496, emissiveIntensity: 0.4 })
        );
        cameraBox.position.set(0, 5.8, 0);
        trapGroup.add(cameraBox);
        this.eventGateGroup.add(trapGroup);
      });
    }
    initCheckpointVisuals() {
      const cpGroup = new THREE.Group();
      cpGroup.name = "ActiveCheckpoint";
      const ringGeo = new THREE.TorusGeometry(7.5, 0.35, 12, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 61695,
        emissive: 61695,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.85
      });
      this.checkpointMesh = new THREE.Mesh(ringGeo, ringMat);
      cpGroup.add(this.checkpointMesh);
      const arrowGeo = new THREE.ConeGeometry(1.5, 3, 8);
      arrowGeo.rotateX(Math.PI);
      const arrowMat = new THREE.MeshStandardMaterial({
        color: 16711807,
        emissive: 16711807,
        emissiveIntensity: 1
      });
      this.checkpointArrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      this.checkpointArrowMesh.position.y = 9.5;
      cpGroup.add(this.checkpointArrowMesh);
      cpGroup.visible = false;
      this.scene.add(cpGroup);
      this.checkpointGroup = cpGroup;
    }
    initBadges() {
      const badgeLocations = [
        { x: 300, z: -350 },
        { x: 500, z: -150 },
        { x: 600, z: -450 },
        { x: 200, z: -550 },
        { x: 750, z: 650 },
        { x: 600, z: 250 },
        { x: 250, z: 550 },
        { x: 450, z: 450 },
        { x: -350, z: -300 },
        { x: -500, z: -550 },
        { x: -650, z: -650 },
        { x: -250, z: -450 },
        { x: -400, z: 250 },
        { x: -600, z: 450 },
        { x: -200, z: 400 },
        { x: -450, z: 600 },
        { x: -650, z: 650 },
        { x: -820, z: 0 },
        { x: 0, z: 750 },
        { x: 0, z: -850 }
      ];
      const badgeGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
      badgeGeo.rotateX(Math.PI / 2);
      const badgeMat = new THREE.MeshStandardMaterial({
        color: 16759552,
        emissive: 16746496,
        emissiveIntensity: 0.9,
        metalness: 0.9,
        roughness: 0.15
      });
      badgeLocations.forEach((loc, idx) => {
        const isCollected = this.saveManager.data.collectedBadges.includes(idx);
        const by = this.world.getGroundHeight(loc.x, loc.z) + 1.8;
        const mesh = new THREE.Mesh(badgeGeo, badgeMat);
        mesh.position.set(loc.x, by, loc.z);
        mesh.visible = !isCollected;
        this.scene.add(mesh);
        this.hiddenBadgeMeshes.push({
          index: idx,
          x: loc.x,
          y: by,
          z: loc.z,
          mesh
        });
      });
    }
    // Start an event
    startEvent(eventId, vehiclePhysics) {
      const ev = EVENT_DEFINITIONS.find((e) => e.id === eventId);
      if (!ev) return;
      this.activeEvent = ev;
      this.eventState = "COUNTDOWN";
      this.countdownTimer = 3.5;
      this.currentCheckpointIdx = 0;
      this.currentLap = 1;
      this.raceTimer = 0;
      this.cargoHealth = 100;
      this.racePosition = 1;
      const groundY = this.world.getGroundHeight(ev.startPos.x, ev.startPos.z);
      vehiclePhysics.position.set(ev.startPos.x, groundY + 0.5, ev.startPos.z);
      vehiclePhysics.velocity.set(0, 0, 0);
      this.aiCompetitors = [];
      if (ev.aiRacers) {
        ev.aiRacers.forEach((racer, rIdx) => {
          this.aiCompetitors.push({
            name: racer.name,
            carId: racer.carId,
            skill: racer.skill,
            progress: 0,
            lap: 1,
            distance: rIdx * -8,
            speed: 0
          });
        });
      }
      this.updateCheckpointVisual();
      this.checkpointGroup.visible = true;
    }
    updateCheckpointVisual() {
      if (!this.activeEvent || !this.activeEvent.checkpoints) {
        this.checkpointGroup.visible = false;
        return;
      }
      const cp = this.activeEvent.checkpoints[this.currentCheckpointIdx];
      if (cp) {
        const cpy = this.world.getGroundHeight(cp.x, cp.z) + 4.5;
        this.checkpointGroup.position.set(cp.x, cpy, cp.z);
        this.checkpointGroup.visible = true;
      }
    }
    update(dt, vehiclePhysics, onEventFinished, onSpeedTrapTriggered, onDriftScoreUpdate) {
      const time = performance.now() * 1e-3;
      if (this.checkpointMesh) {
        this.checkpointMesh.rotation.z += dt * 1.5;
        this.checkpointArrowMesh.position.y = 9.5 + Math.sin(time * 4) * 0.5;
      }
      this.hiddenBadgeMeshes.forEach((b) => {
        if (b.mesh.visible) {
          b.mesh.rotation.y += dt * 2;
          b.mesh.position.y = b.y + Math.sin(time * 3 + b.index) * 0.3;
          const dist = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, b.x, b.z);
          if (dist < 4) {
            if (this.saveManager.collectBadge(b.index)) {
              b.mesh.visible = false;
              this.audioManager.playBadgePickup();
            }
          }
        }
      });
      SPEED_TRAPS.forEach((trap) => {
        const dist = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, trap.x, trap.z);
        if (dist < 14 && vehiclePhysics.speedMph > 45) {
          if (!trap.lastTriggered || performance.now() - trap.lastTriggered > 3e3) {
            trap.lastTriggered = performance.now();
            const speed = vehiclePhysics.speedMph;
            let stars = 1;
            if (speed >= trap.speed3Star) stars = 3;
            else if (speed >= trap.speed2Star) stars = 2;
            this.saveManager.recordSpeedTrap(trap.id, speed);
            this.audioManager.playSpeedTrap();
            if (onSpeedTrapTriggered) {
              onSpeedTrapTriggered(trap.name, Math.round(speed), stars);
            }
          }
        }
      });
      if (!this.activeEvent) return;
      if (this.eventState === "COUNTDOWN") {
        const prevSec = Math.ceil(this.countdownTimer);
        this.countdownTimer -= dt;
        const currSec = Math.ceil(this.countdownTimer);
        if (currSec < prevSec && currSec > 0) {
          this.audioManager.playCountdownBeep(false);
        }
        if (this.countdownTimer <= 0) {
          this.eventState = "RACING";
          this.audioManager.playCountdownBeep(true);
        }
      } else if (this.eventState === "RACING") {
        this.raceTimer += dt;
        if (this.activeEvent.type === "DELIVERY") {
          if (vehiclePhysics.velocity.length() > 20 && vehiclePhysics.brake > 0.8) {
            this.cargoHealth = Math.max(0, this.cargoHealth - dt * 2);
          }
        }
        if (this.activeEvent.checkpoints) {
          const cp = this.activeEvent.checkpoints[this.currentCheckpointIdx];
          const distToCp = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, cp.x, cp.z);
          if (distToCp < 15) {
            this.audioManager.playCheckpoint();
            this.currentCheckpointIdx++;
            if (this.currentCheckpointIdx >= this.activeEvent.checkpoints.length) {
              if (this.activeEvent.type === "CIRCUIT_RACE" && this.currentLap < (this.activeEvent.laps || 3)) {
                this.currentLap++;
                this.currentCheckpointIdx = 0;
              } else {
                this.finishEvent(onEventFinished, vehiclePhysics);
              }
            }
            this.updateCheckpointVisual();
          }
        }
        if (this.activeEvent.type === "CIRCUIT_RACE" && this.aiCompetitors.length > 0) {
          let playerRank = 1;
          this.aiCompetitors.forEach((ai) => {
            const targetSpeed = 48 * ai.skill;
            ai.speed = MathUtils.damp(ai.speed, targetSpeed, 2, dt);
            ai.distance += ai.speed * dt;
            const playerDist = (this.currentLap - 1) * 2e3 + this.currentCheckpointIdx * 250;
            if (ai.distance > playerDist) {
              playerRank++;
            }
          });
          this.racePosition = playerRank;
        }
      }
    }
    finishEvent(onEventFinished, vehiclePhysics) {
      this.eventState = "FINISHED";
      this.checkpointGroup.visible = false;
      this.audioManager.playVictoryFanfare();
      const ev = this.activeEvent;
      let earnedCredits = ev.rewardCredits;
      let earnedXP = ev.rewardXP;
      let stars = 3;
      if (ev.type === "CIRCUIT_RACE") {
        if (this.racePosition === 1) {
          earnedCredits *= 1;
          stars = 3;
        } else if (this.racePosition === 2) {
          earnedCredits *= 0.7;
          stars = 2;
        } else {
          earnedCredits *= 0.4;
          stars = 1;
        }
      } else if (ev.type === "DELIVERY") {
        earnedCredits = Math.round(earnedCredits * (this.cargoHealth / 100));
      }
      this.saveManager.addCredits(earnedCredits);
      this.saveManager.addXP(earnedXP);
      const score = vehiclePhysics ? vehiclePhysics.driftScore : 0;
      this.saveManager.recordEventFinish(ev.id, this.racePosition, this.raceTimer, score, stars);
      if (onEventFinished) {
        onEventFinished({
          event: ev,
          time: this.raceTimer,
          placement: this.racePosition,
          credits: earnedCredits,
          xp: earnedXP,
          stars
        });
      }
    }
    cancelEvent() {
      this.activeEvent = null;
      this.eventState = "IDLE";
      this.checkpointGroup.visible = false;
    }
  };

  // src/input.js
  var InputManager = class {
    constructor() {
      this.keys = {};
      this.rawSteer = 0;
      this.rawThrottle = 0;
      this.rawBrake = 0;
      this.rawHandbrake = false;
      this.rawNitro = false;
      this.resetPressed = false;
      this.cameraPressed = false;
      this.mapPressed = false;
      this.pausePressed = false;
      this.garagePressed = false;
      this.interactPressed = false;
      this.touchSteerLeft = false;
      this.touchSteerRight = false;
      this.touchThrottle = false;
      this.touchBrake = false;
      this.touchHandbrake = false;
      this.touchNitro = false;
      this.gamepadConnected = false;
      this.initKeyboard();
      this.initGamepad();
      this.initTouch();
    }
    initKeyboard() {
      window.addEventListener("keydown", (e) => {
        this.keys[e.code] = true;
        if (e.code === "KeyR") this.resetPressed = true;
        if (e.code === "KeyC") this.cameraPressed = true;
        if (e.code === "KeyM") this.mapPressed = true;
        if (e.code === "Escape") this.pausePressed = true;
        if (e.code === "KeyG") this.garagePressed = true;
        if (e.code === "KeyE" || e.code === "Enter") this.interactPressed = true;
      });
      window.addEventListener("keyup", (e) => {
        this.keys[e.code] = false;
      });
    }
    initGamepad() {
      window.addEventListener("gamepadconnected", (e) => {
        this.gamepadConnected = true;
        console.log("Gamepad connected:", e.gamepad.id);
      });
      window.addEventListener("gamepaddisconnected", () => {
        this.gamepadConnected = false;
      });
    }
    initTouch() {
      if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        const tc = document.getElementById("touch-controls");
        if (tc) tc.style.display = "block";
        this.bindTouch("touch-steer-left", (val) => this.touchSteerLeft = val);
        this.bindTouch("touch-steer-right", (val) => this.touchSteerRight = val);
        this.bindTouch("touch-throttle", (val) => this.touchThrottle = val);
        this.bindTouch("touch-brake", (val) => this.touchBrake = val);
        this.bindTouch("touch-handbrake", (val) => this.touchHandbrake = val);
        this.bindTouch("touch-nitro", (val) => this.touchNitro = val);
        const btnReset = document.getElementById("touch-reset");
        if (btnReset) btnReset.addEventListener("touchstart", () => this.resetPressed = true);
        const btnCam = document.getElementById("touch-cam");
        if (btnCam) btnCam.addEventListener("touchstart", () => this.cameraPressed = true);
      }
    }
    bindTouch(elemId, callback) {
      const el = document.getElementById(elemId);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        callback(true);
      }, { passive: false });
      el.addEventListener("touchend", (e) => {
        e.preventDefault();
        callback(false);
      }, { passive: false });
      el.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        callback(false);
      }, { passive: false });
    }
    poll() {
      let steer = 0;
      if (this.keys["KeyA"] || this.keys["ArrowLeft"] || this.touchSteerLeft) steer -= 1;
      if (this.keys["KeyD"] || this.keys["ArrowRight"] || this.touchSteerRight) steer += 1;
      let throttle = 0;
      if (this.keys["KeyW"] || this.keys["ArrowUp"] || this.touchThrottle) throttle = 1;
      let brake = 0;
      if (this.keys["KeyS"] || this.keys["ArrowDown"] || this.touchBrake) brake = 1;
      let handbrake = this.keys["Space"] || this.touchHandbrake;
      let nitro = this.keys["ShiftLeft"] || this.keys["ShiftRight"] || this.touchNitro;
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        if (Math.abs(gp.axes[0]) > 0.15) {
          steer = gp.axes[0];
        }
        if (gp.buttons[7]) throttle = Math.max(throttle, gp.buttons[7].value);
        if (gp.buttons[6]) brake = Math.max(brake, gp.buttons[6].value);
        if (gp.buttons[0] && gp.buttons[0].pressed) handbrake = true;
        if (gp.buttons[1] && gp.buttons[1].pressed) nitro = true;
        if (gp.buttons[2] && gp.buttons[2].pressed && !this._prevGpX) {
          this.cameraPressed = true;
        }
        this._prevGpX = gp.buttons[2]?.pressed;
        if (gp.buttons[3] && gp.buttons[3].pressed && !this._prevGpY) {
          this.resetPressed = true;
        }
        this._prevGpY = gp.buttons[3]?.pressed;
        if (gp.buttons[9] && gp.buttons[9].pressed && !this._prevGpStart) {
          this.pausePressed = true;
        }
        this._prevGpStart = gp.buttons[9]?.pressed;
      }
      return {
        steer,
        throttle,
        brake,
        handbrake,
        nitro,
        reset: this.consumeReset(),
        camera: this.consumeCamera(),
        map: this.consumeMap(),
        pause: this.consumePause(),
        garage: this.consumeGarage(),
        interact: this.consumeInteract()
      };
    }
    consumeReset() {
      const val = this.resetPressed;
      this.resetPressed = false;
      return val;
    }
    consumeCamera() {
      const val = this.cameraPressed;
      this.cameraPressed = false;
      return val;
    }
    consumeMap() {
      const val = this.mapPressed;
      this.mapPressed = false;
      return val;
    }
    consumePause() {
      const val = this.pausePressed;
      this.pausePressed = false;
      return val;
    }
    consumeGarage() {
      const val = this.garagePressed;
      this.garagePressed = false;
      return val;
    }
    consumeInteract() {
      const val = this.interactPressed;
      this.interactPressed = false;
      return val;
    }
  };

  // src/ui.js
  var UIManager = class {
    constructor(game) {
      this.game = game;
      this.saveManager = game.saveManager;
      this.audioManager = game.audioManager;
      this.hudLocationArea = document.getElementById("hud-area-name");
      this.hudStreet = document.getElementById("hud-street-name");
      this.hudSurfaceTag = document.getElementById("hud-surface-tag");
      this.hudCredits = document.getElementById("hud-credits-val");
      this.hudLevel = document.getElementById("hud-level-val");
      this.hudSpeedNum = document.getElementById("hud-speed-num");
      this.hudSpeedUnit = document.getElementById("hud-speed-unit");
      this.hudGearVal = document.getElementById("hud-gear-val");
      this.hudRpmFill = document.getElementById("hud-rpm-fill");
      this.hudNitroFill = document.getElementById("hud-nitro-fill");
      this.assistAbs = document.getElementById("assist-abs");
      this.assistTcs = document.getElementById("assist-tcs");
      this.assistEsp = document.getElementById("assist-esp");
      this.minimapCanvas = document.getElementById("minimap-canvas");
      this.minimapCtx = this.minimapCanvas?.getContext("2d");
      this.fullMapCanvas = document.getElementById("fullscreen-map-canvas");
      this.fullMapCtx = this.fullMapCanvas?.getContext("2d");
      this.mapFilter = "ALL";
      this.driftBox = document.getElementById("hud-drift-container");
      this.driftScoreEl = document.getElementById("hud-drift-score");
      this.driftMultEl = document.getElementById("hud-drift-mult");
      this.speedTrapBox = document.getElementById("hud-speed-trap-flash");
      this.speedTrapNameEl = document.getElementById("hud-speed-trap-name");
      this.speedTrapValEl = document.getElementById("hud-speed-trap-val");
      this.speedTrapStarsEl = document.getElementById("hud-speed-trap-stars");
      this.eventTracker = document.getElementById("hud-event-tracker");
      this.eventTitleEl = document.getElementById("hud-event-title");
      this.eventTimeEl = document.getElementById("hud-event-time");
      this.eventPosEl = document.getElementById("hud-event-pos");
      this.eventFillEl = document.getElementById("hud-event-progress-fill");
      this.eventPrompt = document.getElementById("event-prompt");
      this.countdownEl = document.getElementById("race-countdown");
      this.garageModal = document.getElementById("garage-modal");
      this.pauseModal = document.getElementById("pause-modal");
      this.settingsModal = document.getElementById("settings-modal");
      this.mapModal = document.getElementById("world-map-modal");
      this.finishModal = document.getElementById("event-finish-modal");
      this.toast = document.getElementById("notification-toast");
      this.toastTitle = document.getElementById("toast-title");
      this.toastDesc = document.getElementById("toast-desc");
      this.toastTimer = null;
      this.selectedGarageCarId = this.saveManager.data.selectedVehicleId;
      this.initEventListeners();
      this.setupGarageCarousel();
      this.initSettingsValues();
    }
    initEventListeners() {
      if (this.hudSpeedUnit) {
        this.hudSpeedUnit.addEventListener("click", () => {
          const cur = this.saveManager.data.settings.units;
          const next = cur === "mph" ? "kmh" : "mph";
          this.saveManager.updateSettings({ units: next });
          this.hudSpeedUnit.textContent = next.toUpperCase();
          this.showToast("Speedometer Units", `Changed to ${next.toUpperCase()}`);
        });
      }
      document.querySelectorAll(".map-filter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          document.querySelectorAll(".map-filter-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.mapFilter = btn.dataset.filter || "ALL";
          this.renderFullscreenMap();
        });
      });
      document.querySelectorAll(".close-modal-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.game.resumeGame();
        });
      });
      document.getElementById("pause-resume-btn")?.addEventListener("click", () => this.game.resumeGame());
      document.getElementById("pause-restart-btn")?.addEventListener("click", () => {
        this.game.resumeGame();
        if (this.game.eventSystem.activeEvent) {
          this.game.eventSystem.startEvent(this.game.eventSystem.activeEvent.id, this.game.physics);
        }
      });
      document.getElementById("pause-garage-btn")?.addEventListener("click", () => {
        this.closeAllModals();
        this.openGarage();
      });
      document.getElementById("pause-map-btn")?.addEventListener("click", () => {
        this.closeAllModals();
        this.openWorldMap();
      });
      document.getElementById("pause-settings-btn")?.addEventListener("click", () => {
        this.closeAllModals();
        this.openSettings();
      });
      document.getElementById("pause-quit-event-btn")?.addEventListener("click", () => {
        this.game.eventSystem.cancelEvent();
        this.game.resumeGame();
        this.showToast("Event Cancelled", "Returned to Free Roam");
      });
      document.getElementById("finish-retry-btn")?.addEventListener("click", () => {
        this.finishModal.classList.remove("open");
        if (this.game.eventSystem.activeEvent) {
          this.game.eventSystem.startEvent(this.game.eventSystem.activeEvent.id, this.game.physics);
        }
      });
      document.getElementById("finish-freeroam-btn")?.addEventListener("click", () => {
        this.finishModal.classList.remove("open");
        this.game.eventSystem.cancelEvent();
        this.game.resumeGame();
      });
      document.getElementById("setting-graphics")?.addEventListener("change", (e) => {
        this.saveManager.updateSettings({ graphicsPreset: e.target.value });
        this.game.applyGraphicsSettings();
      });
      document.getElementById("setting-shadows")?.addEventListener("change", (e) => {
        this.saveManager.updateSettings({ shadows: e.target.value });
        this.game.applyGraphicsSettings();
      });
      document.getElementById("setting-bloom")?.addEventListener("change", (e) => {
        this.saveManager.updateSettings({ bloom: e.target.checked });
        this.game.applyGraphicsSettings();
      });
      document.getElementById("setting-abs")?.addEventListener("change", (e) => {
        this.saveManager.updateSettings({ abs: e.target.checked });
      });
      document.getElementById("setting-tcs")?.addEventListener("change", (e) => {
        this.saveManager.updateSettings({ tcs: e.target.checked });
      });
      document.getElementById("setting-esp")?.addEventListener("change", (e) => {
        this.saveManager.updateSettings({ esp: e.target.checked });
      });
      document.getElementById("setting-sensitivity")?.addEventListener("input", (e) => {
        this.saveManager.updateSettings({ steerSensitivity: parseFloat(e.target.value) });
      });
      document.getElementById("setting-weather")?.addEventListener("change", (e) => {
        this.game.world.setWeather(e.target.value);
      });
      document.getElementById("volume-master")?.addEventListener("input", (e) => {
        const v = parseFloat(e.target.value);
        this.saveManager.updateSettings({ volumeMaster: v });
        this.audioManager.setVolumes(v, void 0, void 0, void 0);
      });
      document.getElementById("volume-engine")?.addEventListener("input", (e) => {
        const v = parseFloat(e.target.value);
        this.saveManager.updateSettings({ volumeEngine: v });
        this.audioManager.setVolumes(void 0, v, void 0, void 0);
      });
      document.getElementById("volume-music")?.addEventListener("input", (e) => {
        const v = parseFloat(e.target.value);
        this.saveManager.updateSettings({ volumeMusic: v });
        this.audioManager.setVolumes(void 0, void 0, void 0, v);
      });
      document.getElementById("setting-reset-save")?.addEventListener("click", () => {
        if (confirm("Reset all festival progression and credits?")) {
          this.saveManager.resetProgress();
          location.reload();
        }
      });
    }
    setupGarageCarousel() {
      const listEl = document.getElementById("garage-car-list");
      if (!listEl) return;
      listEl.innerHTML = "";
      Object.values(VEHICLE_DEFINITIONS).forEach((def) => {
        const isUnlocked = this.saveManager.data.unlockedVehicles.includes(def.id);
        const isSelected = this.saveManager.data.selectedVehicleId === def.id;
        const btn = document.createElement("div");
        btn.className = `car-select-btn ${isSelected ? "active" : ""}`;
        btn.dataset.carId = def.id;
        btn.innerHTML = `
        <div class="car-btn-class">${def.className}</div>
        <div class="car-btn-name">${def.name}</div>
        <div style="font-size: 11px; color: ${isUnlocked ? "var(--success)" : "var(--gold)"}; margin-top: 4px;">
          ${isUnlocked ? "UNLOCKED" : MathUtils.formatCredits(def.price)}
        </div>
      `;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".car-select-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
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
      document.getElementById("garage-car-name").textContent = def.name;
      document.getElementById("garage-car-class").textContent = `${def.className} \u2022 ${def.stats.drivetrain}`;
      document.getElementById("garage-car-desc").textContent = def.description;
      document.getElementById("stat-top-speed").style.width = `${def.stats.topSpeedMph / 240 * 100}%`;
      document.getElementById("stat-top-speed-val").textContent = `${def.stats.topSpeedMph} MPH`;
      document.getElementById("stat-power").style.width = `${def.stats.powerHp / 900 * 100}%`;
      document.getElementById("stat-power-val").textContent = `${def.stats.powerHp} HP`;
      document.getElementById("stat-handling").style.width = `${def.stats.handling}%`;
      document.getElementById("stat-handling-val").textContent = `${def.stats.handling}/100`;
      document.getElementById("stat-braking").style.width = `${def.stats.braking}%`;
      document.getElementById("stat-braking-val").textContent = `${def.stats.braking}/100`;
      const actionBtn = document.getElementById("garage-action-btn");
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
      const paintContainer = document.getElementById("garage-paint-swatches");
      if (paintContainer) {
        paintContainer.innerHTML = "";
        const swatches = ["#00e5ff", "#ff0055", "#ffaa00", "#2ecc71", "#9b59b6", "#ffffff", "#111111", "#e74c3c", "#3498db", "#f1c40f"];
        const currentPaint = this.saveManager.data.vehiclePaints[carId] || def.defaultColor;
        swatches.forEach((hex) => {
          const sw = document.createElement("div");
          sw.className = `paint-swatch ${currentPaint === hex ? "active" : ""}`;
          sw.style.backgroundColor = hex;
          sw.addEventListener("click", () => {
            this.saveManager.setVehiclePaint(carId, hex);
            this.game.updateCurrentCarPaint(hex);
            document.querySelectorAll(".paint-swatch").forEach((s) => s.classList.remove("active"));
            sw.classList.add("active");
            this.showToast("Paint Applied", `Custom color applied to ${def.name}`);
          });
          paintContainer.appendChild(sw);
        });
      }
      this.updateGarageUpgrades(carId);
    }
    updateGarageUpgrades(carId) {
      const upgrades = this.saveManager.data.vehicleUpgrades[carId] || { engine: 0, tires: 0, weight: 0, nitro: 0 };
      const upgradeTypes = [
        { id: "engine", name: "Engine ECU Stage", desc: "+15% Horsepower per stage", max: 3, costs: [5e3, 12e3, 25e3] },
        { id: "tires", name: "Tire Compound", desc: "Increased cornering grip", max: 3, costs: [4e3, 9e3, 18e3] },
        { id: "weight", name: "Weight Reduction", desc: "Lighter chassis & faster acceleration", max: 3, costs: [6e3, 14e3, 3e4] },
        { id: "nitro", name: "Nitrous Boost Kit", desc: "High-power boost system (Shift key)", max: 1, costs: [8e3] }
      ];
      const upList = document.getElementById("garage-upgrades-list");
      if (!upList) return;
      upList.innerHTML = "";
      upgradeTypes.forEach((u) => {
        const currentTier = upgrades[u.id] || 0;
        const nextTier = currentTier + 1;
        const canUpgrade = nextTier <= u.max;
        const cost = canUpgrade ? u.costs[currentTier] : 0;
        const card = document.createElement("div");
        card.className = "upgrade-card";
        card.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-name">${u.name} (Tier ${currentTier}/${u.max})</div>
          <div class="upgrade-desc">${u.desc}</div>
        </div>
        <div>
          ${canUpgrade ? `
            <button class="btn btn-secondary upgrade-buy-btn" style="font-size: 11px; padding: 6px 14px;" ${this.saveManager.data.credits < cost ? "disabled" : ""}>
              UPGRADE (${MathUtils.formatCredits(cost)})
            </button>
          ` : `<span style="color: var(--success); font-weight: 700; font-size: 12px;">MAX TIER</span>`}
        </div>
      `;
        if (canUpgrade) {
          card.querySelector(".upgrade-buy-btn")?.addEventListener("click", () => {
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
      if (document.getElementById("setting-graphics")) document.getElementById("setting-graphics").value = s.graphicsPreset;
      if (document.getElementById("setting-shadows")) document.getElementById("setting-shadows").value = s.shadows;
      if (document.getElementById("setting-bloom")) document.getElementById("setting-bloom").checked = s.bloom;
      if (document.getElementById("setting-abs")) document.getElementById("setting-abs").checked = s.abs;
      if (document.getElementById("setting-tcs")) document.getElementById("setting-tcs").checked = s.tcs;
      if (document.getElementById("setting-esp")) document.getElementById("setting-esp").checked = s.esp;
      if (document.getElementById("setting-sensitivity")) document.getElementById("setting-sensitivity").value = s.steerSensitivity;
      if (document.getElementById("volume-master")) document.getElementById("volume-master").value = s.volumeMaster;
      if (document.getElementById("volume-engine")) document.getElementById("volume-engine").value = s.volumeEngine;
      if (document.getElementById("volume-music")) document.getElementById("volume-music").value = s.volumeMusic;
    }
    // --- MODAL CONTROLS ---
    openGarage() {
      this.closeAllModals();
      this.setupGarageCarousel();
      this.garageModal?.classList.add("open");
      this.game.gameState = "GARAGE";
    }
    openWorldMap() {
      this.closeAllModals();
      this.mapModal?.classList.add("open");
      this.game.gameState = "MAP";
      this.renderFullscreenMap();
    }
    openPauseMenu() {
      this.closeAllModals();
      this.pauseModal?.classList.add("open");
      this.game.gameState = "PAUSED";
    }
    openSettings() {
      this.closeAllModals();
      this.settingsModal?.classList.add("open");
      this.game.gameState = "PAUSED";
    }
    openFinishScreen(result) {
      this.closeAllModals();
      this.finishModal?.classList.add("open");
      this.game.gameState = "PAUSED";
      document.getElementById("finish-event-title").textContent = result.event.name;
      document.getElementById("finish-time-val").textContent = MathUtils.formatTime(result.time);
      document.getElementById("finish-pos-val").textContent = result.placement ? `${result.placement}${["st", "nd", "rd", "th"][result.placement - 1] || "th"}` : "Finished";
      document.getElementById("finish-credits-val").textContent = `+${MathUtils.formatCredits(result.credits)}`;
      document.getElementById("finish-xp-val").textContent = `+${result.xp} XP`;
    }
    closeAllModals() {
      [this.garageModal, this.pauseModal, this.settingsModal, this.mapModal, this.finishModal].forEach((m) => m?.classList.remove("open"));
    }
    showToast(title, desc) {
      if (!this.toast) return;
      this.toastTitle.textContent = title;
      this.toastDesc.textContent = desc;
      this.toast.classList.add("show");
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.toast.classList.remove("show"), 3200);
    }
    // --- PER-FRAME HUD UPDATE ---
    update(dt, vehiclePhysics, world, eventSystem) {
      if (!vehiclePhysics) return;
      const s = this.saveManager.data.settings;
      const isMph = s.units === "mph";
      const displaySpeed = Math.round(isMph ? vehiclePhysics.speedMph : vehiclePhysics.speedKmh);
      if (this.hudSpeedNum) this.hudSpeedNum.textContent = Math.abs(displaySpeed);
      if (this.hudGearVal) {
        if (vehiclePhysics.currentGear === -1) this.hudGearVal.textContent = "R";
        else if (vehiclePhysics.currentGear === 0) this.hudGearVal.textContent = "N";
        else this.hudGearVal.textContent = vehiclePhysics.currentGear;
      }
      const rpmPct = vehiclePhysics.engineRpm / vehiclePhysics.def.physics.maxRpm * 100;
      if (this.hudRpmFill) this.hudRpmFill.style.width = `${Math.min(100, Math.max(0, rpmPct))}%`;
      if (this.hudNitroFill) this.hudNitroFill.style.width = `${Math.min(100, Math.max(0, vehiclePhysics.nitro * 100))}%`;
      if (this.assistAbs) this.assistAbs.className = `hud-assist-badge ${vehiclePhysics.absActive ? "active" : ""}`;
      if (this.assistTcs) this.assistTcs.className = `hud-assist-badge ${vehiclePhysics.tcsActive ? "active" : ""}`;
      if (this.assistEsp) this.assistEsp.className = `hud-assist-badge ${vehiclePhysics.espActive ? "active" : ""}`;
      if (this.hudCredits) this.hudCredits.textContent = MathUtils.formatCredits(this.saveManager.data.credits);
      if (this.hudLevel) this.hudLevel.textContent = `LVL ${this.saveManager.data.level}`;
      const roadInfo = world.getRoadInfo(vehiclePhysics.position.x, vehiclePhysics.position.z);
      if (this.hudStreet) this.hudStreet.textContent = roadInfo.roadName;
      if (this.hudSurfaceTag) this.hudSurfaceTag.textContent = roadInfo.surface;
      if (vehiclePhysics.isDrifting && this.driftBox) {
        this.driftBox.classList.add("active");
        if (this.driftScoreEl) this.driftScoreEl.textContent = `${vehiclePhysics.driftScore} PTS`;
        const driftMult = Math.min(5, 1 + Math.floor(vehiclePhysics.driftScore / 2500));
        if (this.driftMultEl) this.driftMultEl.textContent = `DRIFT x${driftMult}`;
      } else if (this.driftBox) {
        this.driftBox.classList.remove("active");
      }
      let nearEvent = null;
      if (eventSystem.eventState === "IDLE") {
        EVENT_DEFINITIONS.forEach((ev) => {
          const dist = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, ev.startPos.x, ev.startPos.z);
          if (dist < 18) {
            nearEvent = ev;
          }
        });
      }
      if (nearEvent && this.eventPrompt) {
        this.eventPrompt.style.display = "block";
        document.getElementById("prompt-event-title").textContent = nearEvent.name;
        document.getElementById("prompt-event-type").textContent = `${nearEvent.icon} ${nearEvent.type.replace("_", " ")}`;
        this.activePromptEventId = nearEvent.id;
      } else if (this.eventPrompt) {
        this.eventPrompt.style.display = "none";
        this.activePromptEventId = null;
      }
      if (eventSystem.activeEvent && eventSystem.eventState === "RACING") {
        if (this.eventTracker) this.eventTracker.style.display = "block";
        if (this.eventTitleEl) this.eventTitleEl.textContent = eventSystem.activeEvent.name;
        if (this.eventTimeEl) this.eventTimeEl.textContent = MathUtils.formatTime(eventSystem.raceTimer);
        if (this.eventPosEl) this.eventPosEl.textContent = eventSystem.activeEvent.type === "CIRCUIT_RACE" ? `POS ${eventSystem.racePosition}/4` : `CHECKPOINT ${eventSystem.currentCheckpointIdx + 1}`;
        const totalCps = eventSystem.activeEvent.checkpoints?.length || 1;
        const pct = eventSystem.currentCheckpointIdx / totalCps * 100;
        if (this.eventFillEl) this.eventFillEl.style.width = `${pct}%`;
      } else if (this.eventTracker) {
        this.eventTracker.style.display = "none";
      }
      if (eventSystem.eventState === "COUNTDOWN" && this.countdownEl) {
        this.countdownEl.style.display = "block";
        const sec = Math.ceil(eventSystem.countdownTimer);
        this.countdownEl.textContent = sec > 0 ? sec : "GO!";
      } else if (this.countdownEl) {
        this.countdownEl.style.display = "none";
      }
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
      const scale = 0.28;
      ctx.clearRect(0, 0, w, h);
      const carAngle = Math.atan2(vehiclePhysics.velocity.x || 1e-3, vehiclePhysics.velocity.z || 1);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-carAngle);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      world.roadSegments.forEach((seg) => {
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
      if (this.game.traffic && this.game.traffic.vehicles) {
        ctx.fillStyle = "#ffaa00";
        this.game.traffic.vehicles.forEach((v) => {
          const tx = (v.position.x - vehiclePhysics.position.x) * scale;
          const tz = (v.position.z - vehiclePhysics.position.z) * scale;
          if (Math.abs(tx) < cx && Math.abs(tz) < cy) {
            ctx.beginPath();
            ctx.arc(tx, tz, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      EVENT_DEFINITIONS.forEach((ev) => {
        const ex = (ev.startPos.x - vehiclePhysics.position.x) * scale;
        const ez = (ev.startPos.z - vehiclePhysics.position.z) * scale;
        ctx.fillStyle = "#ff007f";
        ctx.beginPath();
        ctx.arc(ex, ez, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      SPEED_TRAPS.forEach((trap) => {
        const tx = (trap.x - vehiclePhysics.position.x) * scale;
        const tz = (trap.z - vehiclePhysics.position.z) * scale;
        ctx.fillStyle = "#ffbb00";
        ctx.beginPath();
        ctx.arc(tx, tz, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      if (eventSystem.activeEvent && eventSystem.activeEvent.checkpoints) {
        const cp = eventSystem.activeEvent.checkpoints[eventSystem.currentCheckpointIdx];
        if (cp) {
          const cpx = (cp.x - vehiclePhysics.position.x) * scale;
          const cpz = (cp.z - vehiclePhysics.position.z) * scale;
          ctx.fillStyle = "#00f0ff";
          ctx.beginPath();
          ctx.arc(cpx, cpz, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.fillStyle = "#00f0ff";
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
      const mapScale = Math.min(w, h) * 0.85 / 2400;
      ctx.fillStyle = "#090c12";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#161c28";
      ctx.beginPath();
      ctx.arc(cx, cy, 1050 * mapScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 2.5;
      this.game.world.roadSegments.forEach((seg) => {
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
      EVENT_DEFINITIONS.forEach((ev) => {
        const mx = cx + ev.startPos.x * mapScale;
        const my = cy + ev.startPos.z * mapScale;
        ctx.fillStyle = "#ff007f";
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "11px sans-serif";
        ctx.fillText(ev.name, mx + 10, my + 4);
      });
      const p = this.game.physics.position;
      const px = cx + p.x * mapScale;
      const py = cy + p.z * mapScale;
      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    showSpeedTrapFlash(name, speedMph, stars) {
      if (!this.speedTrapBox) return;
      this.speedTrapNameEl.textContent = name;
      this.speedTrapValEl.textContent = `${speedMph} MPH`;
      this.speedTrapStarsEl.textContent = "\u2605".repeat(stars) + "\u2606".repeat(3 - stars);
      this.speedTrapBox.style.display = "block";
      setTimeout(() => {
        this.speedTrapBox.style.display = "none";
      }, 2800);
    }
  };

  // src/main.js
  var Game = class {
    constructor() {
      this.gameState = "FREE_ROAM";
      this.container = document.getElementById("game-container");
      this.canvas = document.getElementById("webgl-canvas");
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
      this.currentCarId = "breeze_rs";
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
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(8900331);
      this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 3e3);
      this.camera.position.set(0, 5, -15);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.saveManager = new SaveManager();
      this.audioManager = new AudioManager(this.saveManager);
      this.input = new InputManager();
      this.cameraController = new CameraController(this.camera, this.canvas);
      this.world = new World(this.scene, this.renderer);
      this.currentCarId = this.saveManager.data.selectedVehicleId || "breeze_rs";
      this.spawnVehicle(this.currentCarId);
      this.traffic = new TrafficSystem(this.scene, this.world);
      this.eventSystem = new EventSystem(this.scene, this.world, this.saveManager, this.audioManager);
      this.ui = new UIManager(this);
      this.applyGraphicsSettings();
      window.addEventListener("resize", () => this.onWindowResize());
      const unlockAudio = () => {
        this.audioManager.init();
        this.audioManager.resume();
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
        window.removeEventListener("touchstart", unlockAudio);
      };
      window.addEventListener("click", unlockAudio);
      window.addEventListener("keydown", unlockAudio);
      window.addEventListener("touchstart", unlockAudio);
      requestAnimationFrame((t) => this.animate(t));
    }
    spawnVehicle(carId) {
      if (this.carGroup) {
        this.scene.remove(this.carGroup);
      }
      const def = VEHICLE_DEFINITIONS[carId] || VEHICLE_DEFINITIONS["breeze_rs"];
      const paintColor = this.saveManager.data.vehiclePaints[carId] || def.defaultColor;
      const carBuild = VehicleModelBuilder.buildVehicle(carId, paintColor);
      this.carGroup = carBuild.group;
      this.chassisMesh = carBuild.chassis;
      this.wheelMeshes = carBuild.wheels;
      this.activeWingMesh = carBuild.activeWing;
      this.steeringWheelMesh = carBuild.steeringWheel;
      this.carBodyMaterial = carBuild.bodyMaterial;
      this.scene.add(this.carGroup);
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
      if (s.graphicsPreset === "perf") {
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
      } else if (s.graphicsPreset === "quality" || s.graphicsPreset === "ultra") {
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
      this.gameState = this.eventSystem.activeEvent ? "IN_EVENT" : "FREE_ROAM";
    }
    animate(currentTime) {
      requestAnimationFrame((t) => this.animate(t));
      const dt = Math.min(0.05, (currentTime - this.lastFrameTime) * 1e-3);
      this.lastFrameTime = currentTime;
      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 0.5) {
        this.fpsCounter = Math.round(this.frameCount / this.fpsTimer);
        this.frameCount = 0;
        this.fpsTimer = 0;
      }
      const inputState = this.input.poll();
      if (inputState.map) {
        if (this.gameState === "MAP") this.resumeGame();
        else this.ui.openWorldMap();
      } else if (inputState.garage) {
        if (this.gameState === "GARAGE") this.resumeGame();
        else this.ui.openGarage();
      } else if (inputState.pause) {
        if (this.gameState === "PAUSED" || this.gameState === "GARAGE" || this.gameState === "MAP") {
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
        this.gameState = "IN_EVENT";
      }
      if (this.gameState === "FREE_ROAM" || this.gameState === "IN_EVENT") {
        this.physics.update(
          dt,
          inputState,
          this.carGroup,
          this.chassisMesh,
          this.wheelMeshes,
          this.activeWingMesh,
          this.steeringWheelMesh
        );
        this.cameraController.update(dt, this.physics, this.carGroup);
        this.traffic.update(dt, this.physics.position, this.physics);
        this.world.update(dt, this.physics.position);
        this.eventSystem.update(
          dt,
          this.physics,
          (finishResult) => this.ui.openFinishScreen(finishResult),
          (name, spd, stars) => this.ui.showSpeedTrapFlash(name, spd, stars)
        );
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
      this.ui.update(dt, this.physics, this.world, this.eventSystem);
      this.renderer.render(this.scene, this.camera);
    }
  };
  window.addEventListener("DOMContentLoaded", () => {
    window.gameInstance = new Game();
  });
})();
