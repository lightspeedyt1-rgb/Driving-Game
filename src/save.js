/**
 * OPEN ROAD FESTIVAL - Save & Progression Manager
 */

const SAVE_KEY = 'open_road_festival_save_v1';

const DEFAULT_SAVE_DATA = {
  version: 1,
  credits: 15000,
  xp: 0,
  level: 1,
  selectedVehicleId: 'breeze_rs',
  unlockedVehicles: ['breeze_rs'],
  vehiclePaints: {
    'breeze_rs': '#00e5ff',
    'veloce_gt': '#ff3300',
    'apex_nomad': '#2ecc71',
    'thunderbolt_454': '#3498db',
    'phantom_valkyrie': '#9b59b6'
  },
  vehicleUpgrades: {
    'breeze_rs': { engine: 0, tires: 0, weight: 0, nitro: 1 },
    'veloce_gt': { engine: 0, tires: 0, weight: 0, nitro: 0 },
    'apex_nomad': { engine: 0, tires: 0, weight: 0, nitro: 0 },
    'thunderbolt_454': { engine: 0, tires: 0, weight: 0, nitro: 0 },
    'phantom_valkyrie': { engine: 0, tires: 0, weight: 0, nitro: 0 }
  },
  completedEvents: {},
  speedTrapRecords: {},
  driftZoneRecords: {},
  collectedBadges: [],
  settings: {
    graphicsPreset: 'balanced', // 'perf', 'balanced', 'quality', 'ultra'
    shadows: 'medium',
    bloom: true,
    units: 'mph', // 'mph' or 'kmh'
    abs: true,
    tcs: true,
    esp: true,
    steeringAssist: true,
    transmission: 'auto', // 'auto' or 'manual'
    steerSensitivity: 1.0,
    volumeMaster: 0.8,
    volumeEngine: 0.85,
    volumeSfx: 0.9,
    volumeMusic: 0.5,
    timeOfDay: 'dynamic', // 'dynamic', 'day', 'sunset', 'night'
    cameraMode: 0
  }
};

export class SaveManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults in case new fields exist
        return {
          ...DEFAULT_SAVE_DATA,
          ...parsed,
          settings: { ...DEFAULT_SAVE_DATA.settings, ...(parsed.settings || {}) },
          vehiclePaints: { ...DEFAULT_SAVE_DATA.vehiclePaints, ...(parsed.vehiclePaints || {}) },
          vehicleUpgrades: { ...DEFAULT_SAVE_DATA.vehicleUpgrades, ...(parsed.vehicleUpgrades || {}) }
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
    // XP per level formula: Level * 1000
    const neededForNext = this.data.level * 1000;
    let leveledUp = false;
    while (this.data.xp >= neededForNext) {
      this.data.xp -= neededForNext;
      this.data.level += 1;
      this.addCredits(5000 * this.data.level);
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
}
