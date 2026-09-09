/**
 * OPEN ROAD FESTIVAL - Event System & Activities
 * Circuit Races, Sprints, Hillclimbs, Drift Zones, Speed Traps, Delivery Missions, and Badges.
 */

import { MathUtils } from './math.js';

export const EVENT_DEFINITIONS = [
  {
    id: 'circuit_marina_gp',
    type: 'CIRCUIT_RACE',
    name: 'Sunset Marina Grand Prix',
    description: '3 high-intensity laps around the coastal promenade, yacht marina, and coastal highway against rival festival racers.',
    startPos: { x: 200, z: 200 },
    laps: 3,
    rewardCredits: 18000,
    rewardXP: 600,
    icon: '🏁',
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
      { name: 'Vortex Kai', carId: 'veloce_gt', color: 0xff3300, skill: 0.95 },
      { name: 'Drift Queen Maya', carId: 'thunderbolt_454', color: 0x3498db, skill: 0.92 },
      { name: 'Rally Nova', carId: 'apex_nomad', color: 0x2ecc71, skill: 0.88 }
    ]
  },
  {
    id: 'sprint_skyline',
    type: 'POINT_TO_POINT',
    name: 'Skyline Expressway Dash',
    description: 'High-speed 4.2 km point-to-point sprint from Downtown City Plaza across the elevated highway viaduct to Industrial Harbor.',
    startPos: { x: 200, z: -150 },
    rewardCredits: 15000,
    rewardXP: 500,
    icon: '⚡',
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
    id: 'time_trial_alpine',
    type: 'TIME_TRIAL',
    name: 'Alpine Switchback Trial',
    description: 'Demanding mountain hillclimb with 12 switchbacks. Beat the target clock: Gold < 1:15, Silver < 1:30, Bronze < 1:50.',
    startPos: { x: -200, z: -150 },
    rewardCredits: 14000,
    rewardXP: 450,
    icon: '⏱️',
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
    id: 'drift_dragons_tail',
    type: 'DRIFT_ZONE',
    name: 'Dragon’s Tail Drift Summit',
    description: 'Mountain pass drift zone. Maintain high slip angles and speed to rack up combo multipliers! 3 Stars: 25,000 pts.',
    startPos: { x: -200, z: -150 },
    endPos: { x: -650, z: -650 },
    rewardCredits: 12000,
    rewardXP: 400,
    icon: '🔥',
    targetScores: { star3: 25000, star2: 15000, star1: 8000 }
  },
  {
    id: 'delivery_vip_sound',
    type: 'DELIVERY',
    name: 'Festival VIP Sound Express',
    description: 'Rush sensitive festival audio equipment from Industrial Harbor to Downtown Mainstage without smashing the cargo!',
    startPos: { x: -650, z: 650 },
    rewardCredits: 16000,
    rewardXP: 550,
    icon: '📦',
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
    id: 'rally_forest_run',
    type: 'OFFROAD_SPRINT',
    name: 'Wildlands Forest Rally',
    description: 'High-speed off-road dirt rally through dense pine forests, farmland mud trails, and jumps.',
    startPos: { x: -150, z: 150 },
    rewardCredits: 14000,
    rewardXP: 450,
    icon: '🌲',
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

export const SPEED_TRAPS = [
  { id: 'trap_highway_viaduct', name: 'Viaduct Blitz', x: 820, z: 0, speed3Star: 175, speed2Star: 145, speed1Star: 115 },
  { id: 'trap_downtown_blvd', name: 'Downtown Flash', x: 400, z: -350, speed3Star: 140, speed2Star: 115, speed1Star: 90 },
  { id: 'trap_marina_drive', name: 'Marina Coast Radar', x: 750, z: 500, speed3Star: 155, speed2Star: 130, speed1Star: 100 },
  { id: 'trap_mountain_descent', name: 'Alpine Ridge Radar', x: -400, z: -700, speed3Star: 130, speed2Star: 105, speed1Star: 80 }
];

export class EventSystem {
  constructor(scene, world, saveManager, audioManager) {
    this.scene = scene;
    this.world = world;
    this.saveManager = saveManager;
    this.audioManager = audioManager;

    this.activeEvent = null;
    this.eventState = 'IDLE'; // 'IDLE', 'COUNTDOWN', 'RACING', 'FINISHED'

    // Race progression
    this.currentCheckpointIdx = 0;
    this.currentLap = 1;
    this.raceTimer = 0;
    this.countdownTimer = 3.5;
    this.cargoHealth = 100;
    this.racePosition = 1;

    // AI Racers in current event
    this.aiCompetitors = [];

    // 3D visual markers
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
    // 3D Holographic event entrance gates
    EVENT_DEFINITIONS.forEach(ev => {
      const y = this.world.getGroundHeight(ev.startPos.x, ev.startPos.z);
      const gateGroup = new THREE.Group();
      gateGroup.position.set(ev.startPos.x, y, ev.startPos.z);

      // Glowing circular base
      const ringGeo = new THREE.RingGeometry(5.5, 6.5, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.15;
      gateGroup.add(ringMesh);

      // Holographic vertical pillar beam
      const beamGeo = new THREE.CylinderGeometry(5.8, 5.8, 12, 24, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.y = 6;
      gateGroup.add(beamMesh);

      this.eventGateGroup.add(gateGroup);
    });

    // Speed Traps (Radar Cameras)
    SPEED_TRAPS.forEach(trap => {
      const y = this.world.getGroundHeight(trap.x, trap.z);
      const trapGroup = new THREE.Group();
      trapGroup.position.set(trap.x, y, trap.z);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
      );
      pole.position.y = 3;
      trapGroup.add(pole);

      const cameraBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.6, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.4 })
      );
      cameraBox.position.set(0, 5.8, 0);
      trapGroup.add(cameraBox);

      this.eventGateGroup.add(trapGroup);
    });
  }

  initCheckpointVisuals() {
    // Large Glowing Checkpoint Ring
    const cpGroup = new THREE.Group();
    cpGroup.name = "ActiveCheckpoint";

    const ringGeo = new THREE.TorusGeometry(7.5, 0.35, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85
    });
    this.checkpointMesh = new THREE.Mesh(ringGeo, ringMat);
    cpGroup.add(this.checkpointMesh);

    // Floating Arrow on top pointing down
    const arrowGeo = new THREE.ConeGeometry(1.5, 3.0, 8);
    arrowGeo.rotateX(Math.PI);
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 1.0
    });
    this.checkpointArrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    this.checkpointArrowMesh.position.y = 9.5;
    cpGroup.add(this.checkpointArrowMesh);

    cpGroup.visible = false;
    this.scene.add(cpGroup);
    this.checkpointGroup = cpGroup;
  }

  initBadges() {
    // 20 Collectible Festival Badges
    const badgeLocations = [
      { x: 300, z: -350 }, { x: 500, z: -150 }, { x: 600, z: -450 }, { x: 200, z: -550 },
      { x: 750, z: 650 }, { x: 600, z: 250 }, { x: 250, z: 550 }, { x: 450, z: 450 },
      { x: -350, z: -300 }, { x: -500, z: -550 }, { x: -650, z: -650 }, { x: -250, z: -450 },
      { x: -400, z: 250 }, { x: -600, z: 450 }, { x: -200, z: 400 }, { x: -450, z: 600 },
      { x: -650, z: 650 }, { x: -820, z: 0 }, { x: 0, z: 750 }, { x: 0, z: -850 }
    ];

    const badgeGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
    badgeGeo.rotateX(Math.PI / 2);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0xffbb00,
      emissive: 0xff8800,
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
        mesh: mesh
      });
    });
  }

  // Start an event
  startEvent(eventId, vehiclePhysics) {
    const ev = EVENT_DEFINITIONS.find(e => e.id === eventId);
    if (!ev) return;

    this.activeEvent = ev;
    this.eventState = 'COUNTDOWN';
    this.countdownTimer = 3.5;
    this.currentCheckpointIdx = 0;
    this.currentLap = 1;
    this.raceTimer = 0;
    this.cargoHealth = 100;
    this.racePosition = 1;

    // Reposition player to start line
    const groundY = this.world.getGroundHeight(ev.startPos.x, ev.startPos.z);
    vehiclePhysics.position.set(ev.startPos.x, groundY + 0.5, ev.startPos.z);
    vehiclePhysics.velocity.set(0, 0, 0);

    // Initialize AI competitors if circuit race
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
    const time = performance.now() * 0.001;

    // 1. Animate Badges & Checkpoint ring
    if (this.checkpointMesh) {
      this.checkpointMesh.rotation.z += dt * 1.5;
      this.checkpointArrowMesh.position.y = 9.5 + Math.sin(time * 4) * 0.5;
    }

    this.hiddenBadgeMeshes.forEach(b => {
      if (b.mesh.visible) {
        b.mesh.rotation.y += dt * 2.0;
        b.mesh.position.y = b.y + Math.sin(time * 3 + b.index) * 0.3;

        // Check badge collection
        const dist = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, b.x, b.z);
        if (dist < 4.0) {
          if (this.saveManager.collectBadge(b.index)) {
            b.mesh.visible = false;
            this.audioManager.playBadgePickup();
          }
        }
      }
    });

    // 2. Speed Traps Check
    SPEED_TRAPS.forEach(trap => {
      const dist = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, trap.x, trap.z);
      if (dist < 14 && vehiclePhysics.speedMph > 45) {
        // Debounce trigger per second
        if (!trap.lastTriggered || performance.now() - trap.lastTriggered > 3000) {
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

    // 3. Active Event State Machine
    if (!this.activeEvent) return;

    if (this.eventState === 'COUNTDOWN') {
      const prevSec = Math.ceil(this.countdownTimer);
      this.countdownTimer -= dt;
      const currSec = Math.ceil(this.countdownTimer);

      if (currSec < prevSec && currSec > 0) {
        this.audioManager.playCountdownBeep(false);
      }

      if (this.countdownTimer <= 0) {
        this.eventState = 'RACING';
        this.audioManager.playCountdownBeep(true);
      }
    } else if (this.eventState === 'RACING') {
      this.raceTimer += dt;

      // Delivery damage check
      if (this.activeEvent.type === 'DELIVERY') {
        if (vehiclePhysics.velocity.length() > 20 && vehiclePhysics.brake > 0.8) {
          this.cargoHealth = Math.max(0, this.cargoHealth - dt * 2.0);
        }
      }

      // Checkpoint passing detection
      if (this.activeEvent.checkpoints) {
        const cp = this.activeEvent.checkpoints[this.currentCheckpointIdx];
        const distToCp = MathUtils.dist2D(vehiclePhysics.position.x, vehiclePhysics.position.z, cp.x, cp.z);

        if (distToCp < 15.0) {
          this.audioManager.playCheckpoint();
          this.currentCheckpointIdx++;

          // Lap / Finish Check
          if (this.currentCheckpointIdx >= this.activeEvent.checkpoints.length) {
            if (this.activeEvent.type === 'CIRCUIT_RACE' && this.currentLap < (this.activeEvent.laps || 3)) {
              this.currentLap++;
              this.currentCheckpointIdx = 0;
            } else {
              // FINISHED RACE!
              this.finishEvent(onEventFinished, vehiclePhysics);
            }
          }
          this.updateCheckpointVisual();
        }
      }

      // Simulate AI Racers in Circuit Race
      if (this.activeEvent.type === 'CIRCUIT_RACE' && this.aiCompetitors.length > 0) {
        let playerRank = 1;
        this.aiCompetitors.forEach(ai => {
          const targetSpeed = 48 * ai.skill;
          ai.speed = MathUtils.damp(ai.speed, targetSpeed, 2, dt);
          ai.distance += ai.speed * dt;

          // Estimate player distance
          const playerDist = (this.currentLap - 1) * 2000 + this.currentCheckpointIdx * 250;
          if (ai.distance > playerDist) {
            playerRank++;
          }
        });
        this.racePosition = playerRank;
      }
    }
  }

  finishEvent(onEventFinished, vehiclePhysics) {
    this.eventState = 'FINISHED';
    this.checkpointGroup.visible = false;
    this.audioManager.playVictoryFanfare();

    const ev = this.activeEvent;
    let earnedCredits = ev.rewardCredits;
    let earnedXP = ev.rewardXP;
    let stars = 3;

    if (ev.type === 'CIRCUIT_RACE') {
      if (this.racePosition === 1) { earnedCredits *= 1.0; stars = 3; }
      else if (this.racePosition === 2) { earnedCredits *= 0.7; stars = 2; }
      else { earnedCredits *= 0.4; stars = 1; }
    } else if (ev.type === 'DELIVERY') {
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
        stars: stars
      });
    }
  }

  cancelEvent() {
    this.activeEvent = null;
    this.eventState = 'IDLE';
    this.checkpointGroup.visible = false;
  }
}
