/**
 * OPEN ROAD FESTIVAL - Procedural Web Audio API Sound Engine
 * Zero external audio files required. 100% synthesized in real time.
 */

export class AudioManager {
  constructor(saveManager) {
    this.saveManager = saveManager;
    this.ctx = null;
    this.initialized = false;
    this.muted = false;

    // Master bus
    this.masterGain = null;
    this.engineGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Engine sound synth
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineOscSub = null;
    this.engineFilter = null;
    this.engineNoise = null;
    this.engineDistortion = null;

    // Tire squeal synth
    this.tireNoise = null;
    this.tireFilter = null;
    this.tireGain = null;

    // Wind rush synth
    this.windNoise = null;
    this.windFilter = null;
    this.windGain = null;

    // Nitro sound synth
    this.nitroGain = null;
    this.nitroNoise = null;
    this.nitroFilter = null;

    // Music Synthwave loop state
    this.musicPlaying = false;
    this.musicStep = 0;
    this.musicTimer = null;
    this.musicBpm = 118;
    this.musicScale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63]; // C Pentatonic/Minor
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.saveManager.data.settings.volumeMaster ?? 0.8;
      this.masterGain.connect(this.ctx.destination);

      // Category Gains
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

      // Start festival background music
      if (this.saveManager.data.settings.volumeMusic > 0.05) {
        this.startMusic();
      }
    } catch (e) {
      console.warn("Web Audio API could not be initialized:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Set up procedural engine oscillator cluster
  setupEngineSynth() {
    if (!this.ctx) return;

    // Osc 1: Main cylinder pulse (sawtooth)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 45;

    // Osc 2: Harmonic octave (triangle)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 90;

    // Osc Sub: Sub-bass rumble (square/sine)
    this.engineOscSub = this.ctx.createOscillator();
    this.engineOscSub.type = 'square';
    this.engineOscSub.frequency.value = 22.5;

    // Engine lowpass filter (opens with throttle)
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 350;
    this.engineFilter.Q.value = 2.5;

    // Distortion / Saturation curve for rich growl
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
    const k = typeof amount === 'number' ? amount : 20;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
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
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.value = 1100;
    this.tireFilter.Q.value = 4.0;

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
    this.windFilter.type = 'lowpass';
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
    this.nitroFilter.type = 'bandpass';
    this.nitroFilter.frequency.value = 2800;
    this.nitroFilter.Q.value = 2.0;

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

    // Pitch multiplier based on vehicle engine profile
    let basePitchMultiplier = 1.0;
    if (carData.id === 'thunderbolt_454') basePitchMultiplier = 0.65; // V8 rumble
    else if (carData.id === 'phantom_valkyrie') basePitchMultiplier = 1.45; // High V10/V12 scream
    else if (carData.id === 'breeze_rs') basePitchMultiplier = 1.15; // 4-cyl inline
    else if (carData.id === 'apex_nomad') basePitchMultiplier = 0.9; // Boxer rally

    // Calculate base engine firing frequency (Hz)
    const baseFreq = (rpm / 60) * basePitchMultiplier * 2.2;
    const targetFreq = Math.max(25, baseFreq);

    const now = this.ctx.currentTime;
    if (this.engineOsc1) {
      this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2.02, now, 0.04);
      this.engineOscSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);
    }

    // Filter cutoff opens aggressively with throttle and high RPM
    const cutoff = 300 + throttle * 2200 + (rpm / 8500) * 1800;
    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
    }

    // Tire squeal gain based on tire slip
    if (this.tireGain) {
      const squealVol = Math.min(0.55, Math.max(0, (slipRatio - 0.22) * 1.5));
      this.tireGain.gain.setTargetAtTime(squealVol, now, 0.05);
      if (this.tireFilter) {
        this.tireFilter.frequency.setTargetAtTime(900 + speedMps * 25, now, 0.05);
      }
    }

    // Wind noise scaling with speed
    if (this.windGain) {
      const windVol = Math.min(0.35, Math.pow(speedMps / 80, 2) * 0.35);
      this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
      if (this.windFilter) {
        this.windFilter.frequency.setTargetAtTime(150 + speedMps * 20, now, 0.1);
      }
    }

    // Nitro sound
    if (this.nitroGain) {
      this.nitroGain.gain.setTargetAtTime(isNitro ? 0.3 : 0, now, 0.08);
    }
  }

  // Gear shift blow-off / backfire pop sound
  playGearShiftPop() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Turbo blow-off "psshh"
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Collision impact sound
  playCollision(intensity = 1.0) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const clampedIntensity = Math.min(1.5, Math.max(0.2, intensity));

    // Low boom oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * clampedIntensity, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);

    oscGain.gain.setValueAtTime(0.5 * clampedIntensity, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);

    // Crunch noise
    const bufferSize = this.ctx.sampleRate * 0.2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * clampedIntensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noiseSource.start(now);
  }

  // Checkpoint passing chime
  playCheckpoint() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    [587.33, 880.00].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

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

    osc.type = isGo ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

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

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.setValueAtTime(1318.5, now + 0.08); // E6
    osc.frequency.setValueAtTime(1567.98, now + 0.16); // G6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

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
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.3, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

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
    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.35, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.6);

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

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

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

    const barDuration = (60 / this.musicBpm) * 4; // 4 beats per bar
    const now = this.ctx.currentTime;

    // Bassline chord progression in A Minor / C Major (A - F - C - G)
    const chordRoots = [110, 87.31, 130.81, 98.00]; // A2, F2, C3, G2
    const currentRoot = chordRoots[Math.floor(this.musicStep / 4) % chordRoots.length];

    // 8th-note synth arpeggios
    for (let i = 0; i < 8; i++) {
      const stepTime = now + (i * barDuration) / 8;
      const freq = currentRoot * [1, 1.25, 1.5, 1.875, 2.0, 1.5, 1.25, 1.0][i % 8];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = i % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, stepTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 + Math.sin(this.musicStep * 0.5) * 350, stepTime);

      gain.gain.setValueAtTime(0.08, stepTime);
      gain.gain.exponentialRampToValueAtTime(0.001, stepTime + barDuration / 10);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(stepTime);
      osc.stop(stepTime + barDuration / 8);
    }

    this.musicStep++;
    this.musicTimer = setTimeout(() => {
      this.scheduleNextMusicBar();
    }, (barDuration * 1000) - 50);
  }

  setVolumes(master, engine, sfx, music) {
    if (!this.ctx) return;
    if (master !== undefined && this.masterGain) this.masterGain.gain.value = master;
    if (engine !== undefined && this.engineGain) this.engineGain.gain.value = engine;
    if (sfx !== undefined && this.sfxGain) this.sfxGain.gain.value = sfx;
    if (music !== undefined && this.musicGain) {
      this.musicGain.gain.value = music;
      if (music > 0.05 && !this.musicPlaying) this.startMusic();
      else if (music <= 0.05 && this.musicPlaying) this.stopMusic();
    }
  }
}
