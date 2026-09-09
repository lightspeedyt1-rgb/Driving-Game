/**
 * OPEN ROAD FESTIVAL - AI Traffic System
 * Navigating AI vehicles with lane following, obstacle avoidance, and collision physics.
 */

import { MathUtils } from './math.js';

export class TrafficSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.vehicles = [];
    this.maxTraffic = 14;

    this.initTraffic();
  }

  initTraffic() {
    const trafficTypes = [
      { name: 'Sedan', w: 1.6, h: 0.7, l: 3.8, color: 0x3498db },
      { name: 'SUV', w: 1.8, h: 0.9, l: 4.2, color: 0xe74c3c },
      { name: 'Compact', w: 1.4, h: 0.65, l: 3.2, color: 0xf1c40f },
      { name: 'Van', w: 1.9, h: 1.1, l: 4.8, color: 0xecf0f1 }
    ];

    const trafficColors = [0x2c3e50, 0x95a5a6, 0xc0392b, 0x2980b9, 0xd35400, 0x16a085, 0x7f8c8d];

    // Distribute traffic across different road segments
    for (let i = 0; i < this.maxTraffic; i++) {
      const type = trafficTypes[i % trafficTypes.length];
      const color = trafficColors[i % trafficColors.length];

      const carMesh = this.buildTrafficMesh(type, color);
      this.scene.add(carMesh);

      // Assign to a random road segment
      const segIndex = i % this.world.roadSegments.length;
      const seg = this.world.roadSegments[segIndex];
      const ptIndex = Math.floor(Math.random() * (seg.points.length - 1));

      const v = {
        mesh: carMesh,
        segIndex: segIndex,
        ptIndex: ptIndex,
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
      color: 0x111620,
      roughness: 0.1,
      metalness: 0.9
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8
    });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(type.w, type.h * 0.6, type.l), bodyMat);
    body.position.y = (type.h * 0.6) * 0.5 + 0.25;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(type.w * 0.88, type.h * 0.5, type.l * 0.55), glassMat);
    cabin.position.set(0, type.h * 0.75 + 0.25, -type.l * 0.05);
    cabin.castShadow = true;
    group.add(cabin);

    // 4 Wheels
    [-type.w * 0.5, type.w * 0.5].forEach(x => {
      [-type.l * 0.32, type.l * 0.32].forEach(z => {
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

      // Obstacle detection ahead
      let obstacleAhead = false;

      // Check distance to player
      if (playerPosition) {
        const distToPlayer = MathUtils.dist2D(v.position.x, v.position.z, playerPosition.x, playerPosition.z);
        if (distToPlayer < 12) {
          const toPlayer = new THREE.Vector3().subVectors(playerPosition, v.position).normalize();
          if (v.forward.dot(toPlayer) > 0.6) {
            obstacleAhead = true;
          }
        }

        // Collision response with player car
        if (distToPlayer < 2.8 && playerPhysics) {
          const pushDir = new THREE.Vector3().subVectors(v.position, playerPosition).normalize();
          v.position.addScaledVector(pushDir, 1.2);
          playerPhysics.velocity.multiplyScalar(0.7);
        }

        // Respawn if too far from player
        if (distToPlayer > 400) {
          this.respawnNearPlayer(v, playerPosition);
        }
      }

      // Check distance to other AI cars ahead
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

      // Speed control
      if (obstacleAhead) {
        v.speed = MathUtils.damp(v.speed, 0, 8, dt);
      } else {
        const roadSpeedLimit = seg.points[v.ptIndex]?.speedLimit || 45;
        const targetMps = roadSpeedLimit * 0.44704 * 0.8;
        v.speed = MathUtils.damp(v.speed, targetMps, 3, dt);
      }

      // Advance along road segment
      const p1 = seg.points[v.ptIndex];
      const nextIdx = (v.ptIndex + 1) % seg.points.length;
      const p2 = seg.points[nextIdx];

      const segmentDist = MathUtils.dist2D(p1.x, p1.z, p2.x, p2.z) || 1;
      v.progress += (v.speed * dt) / segmentDist;

      if (v.progress >= 1.0) {
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

    // Spline tangent & normal
    const tx = p2.x - p1.x;
    const tz = p2.z - p1.z;
    const tLen = Math.sqrt(tx * tx + tz * tz) || 1;
    const dirX = tx / tLen;
    const dirZ = tz / tLen;

    // Perpendicular
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
    // Pick a random road near player
    v.segIndex = Math.floor(Math.random() * this.world.roadSegments.length);
    const seg = this.world.roadSegments[v.segIndex];
    v.ptIndex = Math.floor(Math.random() * (seg.points.length - 1));
    v.progress = Math.random();
    v.speed = 15;
    this.updateVehicleTransform(v, 0);
  }
}
