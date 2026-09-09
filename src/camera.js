/**
 * OPEN ROAD FESTIVAL - Multi-Camera Controller
 * Smooth Spring-Arm Chase, Hood, Cockpit, Orbit Showcase, and Drone views.
 */

import { MathUtils } from './math.js';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.mode = 0; // 0: Chase, 1: Close Chase, 2: Hood, 3: Cockpit, 4: Orbit, 5: Drone
    this.modeNames = ['Chase Cam', 'Close Chase', 'Hood Cam', 'Cockpit Cam', 'Orbit Showcase', 'Drone Cam'];

    // Camera current position & target
    this.currentPos = new THREE.Vector3(0, 10, -20);
    this.currentTarget = new THREE.Vector3();

    // Orbit angle for showcase mode
    this.orbitAngle = 0;
    this.orbitRadius = 7.5;
    this.idleTimer = 0;

    // Camera screen shake
    this.shakeAmount = 0;

    // FOV base settings
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

    // Decay shake
    this.shakeAmount = Math.max(0, this.shakeAmount - dt * 2.5);
    const shakeOffset = new THREE.Vector3(
      (Math.random() - 0.5) * this.shakeAmount * 0.4,
      (Math.random() - 0.5) * this.shakeAmount * 0.4,
      (Math.random() - 0.5) * this.shakeAmount * 0.4
    );

    // Dynamic FOV scaling with speed
    const speedFactor = MathUtils.clamp(speedMph / 180, 0, 1);
    const targetFov = MathUtils.lerp(this.baseFov, this.maxFov, speedFactor * speedFactor);
    this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    // Forward, Right, Up vectors
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(carQuat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(carQuat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(carQuat);

    // Idle timer for auto orbit
    if (speedMph < 1.0) {
      this.idleTimer += dt;
    } else {
      this.idleTimer = 0;
    }

    let desiredPos = new THREE.Vector3();
    let desiredTarget = new THREE.Vector3();

    if (this.mode === 0) {
      // --- DEFAULT SPRING-ARM CHASE CAM ---
      const followDist = 6.2 + speedFactor * 1.5;
      const followHeight = 2.4;

      // Lateral drift swing (camera swings outward during high angle drifts)
      const driftSwing = right.clone().multiplyScalar(-vehiclePhysics.slipAngle * 1.8);

      desiredPos.copy(carPos)
        .addScaledVector(forward, -followDist)
        .addScaledVector(up, followHeight)
        .add(driftSwing);

      desiredTarget.copy(carPos).addScaledVector(forward, 6.0).addScaledVector(up, 1.2);

      this.currentPos.lerp(desiredPos, 1 - Math.exp(-8 * dt));
      this.currentTarget.lerp(desiredTarget, 1 - Math.exp(12 * dt));

    } else if (this.mode === 1) {
      // --- CLOSE CHASE CAM ---
      desiredPos.copy(carPos)
        .addScaledVector(forward, -4.5)
        .addScaledVector(up, 1.7);

      desiredTarget.copy(carPos).addScaledVector(forward, 8.0).addScaledVector(up, 1.0);

      this.currentPos.lerp(desiredPos, 1 - Math.exp(-12 * dt));
      this.currentTarget.lerp(desiredTarget, 1 - Math.exp(14 * dt));

    } else if (this.mode === 2) {
      // --- HOOD / BUMPER CAM ---
      desiredPos.copy(carPos)
        .addScaledVector(forward, 1.4)
        .addScaledVector(up, 0.85);

      desiredTarget.copy(carPos).addScaledVector(forward, 25.0).addScaledVector(up, 0.7);

      this.currentPos.copy(desiredPos);
      this.currentTarget.copy(desiredTarget);

    } else if (this.mode === 3) {
      // --- INTERIOR / COCKPIT CAM ---
      desiredPos.copy(carPos)
        .addScaledVector(forward, 0.1)
        .addScaledVector(right, -0.32)
        .addScaledVector(up, 0.95);

      desiredTarget.copy(carPos).addScaledVector(forward, 20.0).addScaledVector(up, 0.85);

      this.currentPos.copy(desiredPos);
      this.currentTarget.copy(desiredTarget);

    } else if (this.mode === 4) {
      // --- ORBIT SHOWCASE CAM ---
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
      // --- DRONE / HELICOPTER CAM ---
      desiredPos.copy(carPos)
        .addScaledVector(forward, -14.0)
        .addScaledVector(up, 9.0);

      desiredTarget.copy(carPos);

      this.currentPos.lerp(desiredPos, 1 - Math.exp(-5 * dt));
      this.currentTarget.lerp(desiredTarget, 1 - Math.exp(8 * dt));
    }

    // Apply positions with shake
    this.camera.position.copy(this.currentPos).add(shakeOffset);
    this.camera.lookAt(this.currentTarget);
  }
}
