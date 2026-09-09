/**
 * OPEN ROAD FESTIVAL - Vehicle Physics & Dynamics Engine
 * Arcade-Simulation Hybrid physics with 4-wheel contact, weight transfer,
 * Pacejka-inspired tire friction circle, and active driving assists.
 */

import { MathUtils } from './math.js';

export class VehiclePhysics {
  constructor(vehicleDef, world, saveManager) {
    this.def = vehicleDef;
    this.world = world;
    this.saveManager = saveManager;

    // Position & Orientation
    this.position = new THREE.Vector3(0, 4, 80);
    this.quaternion = new THREE.Quaternion();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();

    // Drivetrain & Engine state
    this.engineRpm = this.def.physics.idleRpm;
    this.currentGear = 1;
    this.gearShiftTimer = 0;
    this.throttle = 0;
    this.brake = 0;
    this.steerInput = 0;
    this.handbrake = 0;
    this.steeringAngle = 0;

    // Nitro boost system
    this.nitro = 1.0; // 0.0 to 1.0 tank
    this.isNitroActive = false;

    // Dynamic metrics
    this.speedMps = 0;
    this.speedMph = 0;
    this.speedKmh = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.slipAngle = 0;
    this.driftScore = 0;
    this.isDrifting = false;

    // Chassis visual tilts
    this.bodyPitch = 0;
    this.bodyRoll = 0;

    // Assists status
    this.absActive = false;
    this.tcsActive = false;
    this.espActive = false;

    // Reset & upside-down detection
    this.upsideDownTimer = 0;

    // Upgrades multiplier
    this.powerMultiplier = 1.0;
    this.gripMultiplier = 1.0;
    this.weightMultiplier = 1.0;
    this.hasNitroUpgrade = false;

    this.applyUpgrades();
  }

  applyUpgrades() {
    const upgrades = this.saveManager.data.vehicleUpgrades[this.def.id] || { engine: 0, tires: 0, weight: 0, nitro: 0 };
    this.powerMultiplier = 1.0 + (upgrades.engine || 0) * 0.15;
    this.gripMultiplier = 1.0 + (upgrades.tires || 0) * 0.12;
    this.weightMultiplier = 1.0 - (upgrades.weight || 0) * 0.08;
    this.hasNitroUpgrade = (upgrades.nitro || 0) > 0;
  }

  update(dt, input, carGroup, chassisMesh, wheelMeshes, activeWingMesh, steeringWheelMesh) {
    if (dt > 0.1) dt = 0.1; // Clamp delta time

    const p = this.def.physics;
    const settings = this.saveManager.data.settings;

    // 1. Process Raw Inputs & Steering curve
    this.throttle = input.throttle || 0;
    this.brake = input.brake || 0;
    this.handbrake = input.handbrake ? 1.0 : 0.0;
    this.steerInput = input.steer || 0;

    // Speed-sensitive steering: high angle at low speed, tightened at 150+ mph
    const maxSteerAngle = MathUtils.degToRad(36) / (1.0 + (this.speedMps / 26));
    const targetSteer = this.steerInput * maxSteerAngle;
    const steerRate = 8.0 * (settings.steerSensitivity || 1.0);
    this.steeringAngle = MathUtils.damp(this.steeringAngle, targetSteer, steerRate, dt);

    // 2. Nitro Boost logic
    if (input.nitro && this.hasNitroUpgrade && this.nitro > 0.05 && this.throttle > 0.5) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - dt * 0.35);
    } else {
      this.isNitroActive = false;
      // Nitro slowly refills over time
      this.nitro = Math.min(1.0, this.nitro + dt * 0.08);
    }

    // 3. Vehicle Vectors (Forward, Right, Up)
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);

    // Linear Velocity decomposition
    this.forwardSpeed = this.velocity.dot(forward);
    this.lateralSpeed = this.velocity.dot(right);
    this.speedMps = this.velocity.length();
    this.speedMph = this.speedMps * 2.23694;
    this.speedKmh = this.speedMps * 3.6;

    // 4. Ground height & 4-Wheel Contact
    const groundY = this.world.getGroundHeight(this.position.x, this.position.z);
    const surfaceType = this.world.getSurfaceType(this.position.x, this.position.z);

    // Surface friction coefficients
    let surfaceGrip = 1.0;
    if (surfaceType === 'WET_ASPHALT') surfaceGrip = 0.78;
    else if (surfaceType === 'DIRT') surfaceGrip = 0.58;
    else if (surfaceType === 'GRASS') surfaceGrip = 0.42;
    else if (surfaceType === 'SAND') surfaceGrip = 0.48;

    // Off-road AWD bonus: rally cars maintain better traction on dirt/grass
    if (p.drivetrain === 'AWD' && (surfaceType === 'DIRT' || surfaceType === 'GRASS')) {
      surfaceGrip *= 1.25;
    }

    const isGrounded = this.position.y <= groundY + 0.65;

    // 5. Gearbox & Transmission Logic
    this.gearShiftTimer += dt;
    if (this.currentGear > 0) {
      // Automatic upshift / downshift
      const gearRatio = p.gearRatios[this.currentGear - 1] || 1.0;
      const expectedRpm = (Math.abs(this.forwardSpeed) / (0.33 * 2 * Math.PI)) * 60 * gearRatio * p.finalDrive;
      this.engineRpm = MathUtils.clamp(expectedRpm + (this.throttle * 1200), p.idleRpm, p.maxRpm);

      if (this.engineRpm > p.maxRpm - 500 && this.currentGear < p.gearRatios.length && this.gearShiftTimer > 0.4) {
        this.currentGear++;
        this.gearShiftTimer = 0;
      } else if (this.engineRpm < 2600 && this.currentGear > 1 && this.gearShiftTimer > 0.4) {
        this.currentGear--;
        this.gearShiftTimer = 0;
      }

      // Reverse shift
      if (this.forwardSpeed < 0.5 && this.brake > 0.5 && this.throttle === 0) {
        this.currentGear = -1;
      }
    } else if (this.currentGear === -1) {
      this.engineRpm = MathUtils.clamp(p.idleRpm + this.brake * 3500, p.idleRpm, 5000);
      if (this.forwardSpeed > -0.5 && this.throttle > 0.5) {
        this.currentGear = 1;
      }
    }

    // 6. Engine Drive Force Calculation
    let driveForce = 0;
    const effectiveTorque = p.peakTorque * this.powerMultiplier * (this.isNitroActive ? 1.45 : 1.0);

    if (this.currentGear > 0) {
      const gearRatio = p.gearRatios[this.currentGear - 1] || 1.0;
      driveForce = (effectiveTorque * gearRatio * p.finalDrive * this.throttle) / 0.33;
    } else if (this.currentGear === -1) {
      driveForce = -(effectiveTorque * 3.2 * p.finalDrive * this.brake) / 0.33;
    }

    // 7. Braking & Drag Forces
    let brakeForce = 0;
    if (this.currentGear > 0 && this.brake > 0) {
      brakeForce = this.brake * 14000;
      if (settings.abs) {
        this.absActive = true;
      }
    } else {
      this.absActive = false;
    }

    // Aerodynamic Drag & Downforce
    const airDensity = 1.225;
    const dragForce = 0.5 * airDensity * p.dragCoeff * 2.2 * (this.speedMps * this.speedMps);
    const downforce = 0.5 * airDensity * p.downforceCoeff * 2.2 * (this.speedMps * this.speedMps);

    // 8. Lateral Grip & Drift Slip Physics (Pacejka Curve)
    this.slipAngle = Math.atan2(this.lateralSpeed, Math.max(1.0, Math.abs(this.forwardSpeed)));
    const totalMass = p.massKg * this.weightMultiplier;
    const normalLoad = (totalMass * 9.81) + downforce;

    let lateralFriction = p.tireGripBase * this.gripMultiplier * surfaceGrip;

    // Handbrake: dramatically drops rear lateral grip to initiate drifts
    if (this.handbrake > 0.5) {
      lateralFriction *= 0.32;
    }

    // Drift detection & scoring
    const absSlipDeg = Math.abs(MathUtils.radToDeg(this.slipAngle));
    if (absSlipDeg > 12 && this.speedMph > 22 && isGrounded) {
      this.isDrifting = true;
      const driftMult = Math.min(5, 1 + Math.floor(this.driftScore / 2500));
      this.driftScore += Math.round(absSlipDeg * (this.speedMph / 25) * driftMult * dt * 4);
    } else {
      this.isDrifting = false;
    }

    // Lateral cornering force opposing slide
    let corneringForce = -Math.sin(this.slipAngle) * normalLoad * lateralFriction;

    // Stability Control (ESP): prevents extreme spinouts by applying counter-yaw
    if (settings.esp && Math.abs(this.slipAngle) > 0.5) {
      corneringForce *= 1.4;
      this.espActive = true;
    } else {
      this.espActive = false;
    }

    // 9. Drivetrain Yaw Response (Steering Torque)
    // Front wheel directional pull & RWD power oversteer
    let steerYawRate = this.steeringAngle * (this.forwardSpeed / p.wheelbase);

    if (p.drivetrain === 'RWD' && this.throttle > 0.7 && absSlipDeg > 10) {
      // Throttle kicks out the rear
      steerYawRate += Math.sign(this.steeringAngle || this.lateralSpeed) * 0.45;
    } else if (p.drivetrain === 'FWD' && this.throttle > 0.7) {
      // FWD understeer pull
      steerYawRate *= 0.82;
    }

    // Apply linear acceleration
    if (isGrounded) {
      const netLongitudinalForce = (driveForce - Math.sign(this.forwardSpeed) * (brakeForce + dragForce));
      const accelLong = netLongitudinalForce / totalMass;
      const accelLat = corneringForce / totalMass;

      // Update velocity in vehicle frame
      const newForwardSpeed = this.forwardSpeed + accelLong * dt;
      const newLateralSpeed = this.lateralSpeed + accelLat * dt;

      this.velocity.copy(forward).multiplyScalar(newForwardSpeed).add(right.clone().multiplyScalar(newLateralSpeed));

      // Update yaw rotation
      this.angularVelocity.y = MathUtils.damp(this.angularVelocity.y, steerYawRate, 14, dt);
    } else {
      // In air: gravity pulls down, air drag
      this.velocity.y -= 9.81 * 1.8 * dt;
      this.angularVelocity.multiplyScalar(0.95);
    }

    // Integrate Position & Orientation
    this.position.addScaledVector(this.velocity, dt);

    // Apply Yaw Rotation
    const deltaRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * dt);
    this.quaternion.multiply(deltaRot);

    // Ground Clamping & Suspension response
    if (this.position.y < groundY + 0.35) {
      this.position.y = groundY + 0.35;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    // 10. Chassis Pitch & Roll (Visual Weight Transfer)
    const targetPitch = MathUtils.clamp((-this.forwardSpeed * 0.005) + (this.brake * 0.08) - (this.throttle * 0.05), -0.15, 0.15);
    const targetRoll = MathUtils.clamp((-this.angularVelocity.y * 0.12), -0.18, 0.18);
    this.bodyPitch = MathUtils.damp(this.bodyPitch, targetPitch, 10, dt);
    this.bodyRoll = MathUtils.damp(this.bodyRoll, targetRoll, 10, dt);

    // 11. World Obstacle Collisions
    this.resolveWorldCollisions();

    // 12. Upside-down & Off-map Safe Auto-Reset
    const carUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    if (carUp.y < 0.2 || this.position.y < -5) {
      this.upsideDownTimer += dt;
      if (this.upsideDownTimer > 2.5) {
        this.resetVehicle();
      }
    } else {
      this.upsideDownTimer = 0;
    }

    // 13. Update 3D Visual Mesh Transforms
    if (carGroup) {
      carGroup.position.copy(this.position);
      carGroup.quaternion.copy(this.quaternion);

      if (chassisMesh) {
        chassisMesh.rotation.x = this.bodyPitch;
        chassisMesh.rotation.z = this.bodyRoll;
      }

      // Wheels animation
      if (wheelMeshes) {
        const spinDelta = (this.forwardSpeed / 0.33) * dt;
        wheelMeshes.forEach(w => {
          w.spinner.rotation.x += spinDelta;
          if (w.isFront) {
            w.hub.rotation.y = this.steeringAngle;
          }
        });
      }

      // Steering wheel turns in cockpit
      if (steeringWheelMesh) {
        steeringWheelMesh.rotation.z = -this.steeringAngle * 2.8;
      }

      // Active Aero Wing (Phantom Valkyrie airbrake on braking)
      if (activeWingMesh) {
        const brakeTilt = (this.brake > 0.3 && this.speedMph > 60) ? 0.6 : 0.0;
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
      if (col.type === 'cylinder') {
        const dist = MathUtils.dist2D(this.position.x, this.position.z, col.x, col.z);
        const minDist = carRadius + col.radius;
        if (dist < minDist && dist > 0.001) {
          // Push car out
          const overlap = minDist - dist;
          const nx = (this.position.x - col.x) / dist;
          const nz = (this.position.z - col.z) / dist;

          this.position.x += nx * overlap;
          this.position.z += nz * overlap;

          // Inelastic velocity reflection with speed loss
          this.velocity.x *= 0.4;
          this.velocity.z *= 0.4;
        }
      } else if (col.type === 'box') {
        if (this.position.x > col.minX - carRadius && this.position.x < col.maxX + carRadius &&
            this.position.z > col.minZ - carRadius && this.position.z < col.maxZ + carRadius) {

          // Find closest push-out edge
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

    // World Outer Boundary Clamping
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
      // Find nearest road segment
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
}
