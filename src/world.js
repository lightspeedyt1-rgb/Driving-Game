/**
 * OPEN ROAD FESTIVAL - Procedural World Generator & Environment System
 */

import { MathUtils } from './math.js';

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // Time & Weather
    this.timeOfDay = 0.35; // 0.0 to 1.0 (0.25=dawn, 0.4=day, 0.75=sunset, 0.9=night)
    this.daySpeed = 0.003; // Full day in ~5.5 minutes
    this.weather = 'clear'; // 'clear', 'sunset', 'rain', 'night'
    this.isDynamicTime = true;

    // Environmental Lights & Sky
    this.sunLight = null;
    this.ambientLight = null;
    this.hemiLight = null;
    this.fog = null;
    this.rainParticles = null;

    // Landmark animated parts
    this.animatedProps = [];
    this.streetLamps = [];
    this.buildingMeshes = [];

    // Road Network Waypoints & Splines
    this.roadSegments = [];
    this.roadMeshGroup = new THREE.Group();
    this.roadMeshGroup.name = "RoadNetwork";
    this.scene.add(this.roadMeshGroup);

    // World collision boxes (buildings, barriers, props)
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
    this.ambientLight = new THREE.AmbientLight(0xddeeff, 0.6);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d4a36, 0.5);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
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
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Atmospheric Fog
    this.fog = new THREE.FogExp2(0x9fc8e8, 0.0008);
    this.scene.fog = this.fog;
  }

  // --- PROCEDURAL HEIGHTMAP ---
  getGroundHeight(x, z) {
    const distFromCenter = Math.sqrt(x * x + z * z);
    // Island drop-off at edge
    if (distFromCenter > 1100) {
      const drop = (distFromCenter - 1100) * 0.15;
      return Math.max(0.2, 2.0 - drop);
    }

    let h = 3.0; // Base elevation

    // North-West Mountain Ridge (-800 to -150 X, -900 to -150 Z)
    if (x < 0 && z < 0) {
      const mX = (x + 500) / 450;
      const mZ = (z + 550) / 450;
      const mountainFactor = Math.exp(-(mX * mX + mZ * mZ));
      h += mountainFactor * 85.0;

      // Extra rocky ridges
      h += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 6.0 * mountainFactor;
    }

    // West Farmland / Rolling Hills (-800 to -100 X, 100 to 800 Z)
    if (x < 0 && z > 0) {
      h += (Math.sin(x * 0.012) + Math.cos(z * 0.012)) * 7.0 + 5.0;
    }

    // South-East Coast & Marina (100 to 900 X, 200 to 900 Z)
    if (x > 0 && z > 0) {
      const coastDist = Math.max(0, (distFromCenter - 450) / 600);
      h = MathUtils.lerp(4.0, 1.2, coastDist);
    }

    // Downtown City (100 to 700 X, -700 to 100 Z)
    if (x > 0 && z <= 0) {
      h = 3.5 + Math.sin(x * 0.005) * 1.5;
    }

    return Math.max(0.5, h);
  }

  // Surface type detection
  getSurfaceType(x, z) {
    const roadInfo = this.getRoadInfo(x, z);
    if (roadInfo.onRoad) {
      if (this.weather === 'rain') return 'WET_ASPHALT';
      return roadInfo.surface || 'ASPHALT';
    }

    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter > 950 && (x > 0 || z > 0)) {
      return 'SAND';
    }

    if (x < -200 && z < -200) {
      return 'DIRT'; // Mountain & Forest dirt trails
    }

    return 'GRASS';
  }

  // --- ROAD NETWORK DEFINITION ---
  generateRoadNetwork() {
    // 1. Grand Highway Ring (Expressway)
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
    this.addRoadLoop(highwayNodes, "HIGHWAY", 0x222428, true);

    // 2. Downtown City Grid Loop
    const cityLoop = [
      { x: 200, z: -150, w: 16, name: "Festival Boulevard", speedLimit: 45 },
      { x: 600, z: -150, w: 16, name: "Metropolis Avenue", speedLimit: 45 },
      { x: 600, z: -550, w: 16, name: "Skyscraper Way", speedLimit: 45 },
      { x: 200, z: -550, w: 16, name: "Grand Central Street", speedLimit: 45 }
    ];
    this.addRoadLoop(cityLoop, "CITY_STREET", 0x2a2c30, false);

    // Downtown Cross Streets
    this.addRoadSegment([
      { x: 200, z: -350, w: 14, name: "Plaza Crossway", speedLimit: 40 },
      { x: 600, z: -350, w: 14, name: "Plaza Crossway", speedLimit: 40 }
    ], "CITY_STREET", 0x2a2c30);

    this.addRoadSegment([
      { x: 400, z: -150, w: 14, name: "Commerce Row", speedLimit: 40 },
      { x: 400, z: -550, w: 14, name: "Commerce Row", speedLimit: 40 }
    ], "CITY_STREET", 0x2a2c30);

    // 3. Alpine Mountain Switchback Pass
    const mountainPass = [
      { x: -200, z: -150, w: 12, name: "Alpine Ascent", speedLimit: 40 },
      { x: -350, z: -300, w: 12, name: "Switchback Turn 1", speedLimit: 35 },
      { x: -250, z: -450, w: 12, name: "Ridge Hairpin 2", speedLimit: 30 },
      { x: -500, z: -550, w: 12, name: "Alpine Peak Pass", speedLimit: 40 },
      { x: -400, z: -700, w: 12, name: "Summit Descent", speedLimit: 35 },
      { x: -650, z: -650, w: 12, name: "Tunnel Approach", speedLimit: 45 }
    ];
    this.addRoadSegment(mountainPass, "MOUNTAIN_ROAD", 0x33363b);

    // 4. Coastal Promenade & Marina Loop
    const coastalLoop = [
      { x: 200, z: 200, w: 15, name: "Festival South Gate", speedLimit: 45 },
      { x: 550, z: 250, w: 15, name: "Marina Boardwalk", speedLimit: 40 },
      { x: 750, z: 500, w: 15, name: "Ocean View Boulevard", speedLimit: 50 },
      { x: 600, z: 650, w: 15, name: "Lighthouse Pier Road", speedLimit: 45 },
      { x: 250, z: 550, w: 15, name: "Palm Coastal Drive", speedLimit: 45 }
    ];
    this.addRoadLoop(coastalLoop, "COASTAL_ROAD", 0x303338, false);

    // 5. Farmland & Forest Dirt Rally Stage
    const dirtRally = [
      { x: -150, z: 150, w: 10, name: "Highland Forest Trail", speedLimit: 55, surface: 'DIRT' },
      { x: -400, z: 250, w: 10, name: "Pine Wood Rally", speedLimit: 50, surface: 'DIRT' },
      { x: -600, z: 450, w: 10, name: "Windmill Dirt Sprint", speedLimit: 55, surface: 'DIRT' },
      { x: -450, z: 600, w: 10, name: "Farmland Gravel Pass", speedLimit: 50, surface: 'DIRT' },
      { x: -200, z: 400, w: 10, name: "Ranch Jump Trail", speedLimit: 55, surface: 'DIRT' }
    ];
    this.addRoadLoop(dirtRally, "DIRT_TRAIL", 0x5a4632, false, 'DIRT');

    // 6. Central Festival Plaza Hub Circle
    const festivalHub = [
      { x: 0, z: 80, w: 20, name: "Festival Central Ring", speedLimit: 35 },
      { x: 80, z: 0, w: 20, name: "Festival Central Ring", speedLimit: 35 },
      { x: 0, z: -80, w: 20, name: "Festival Central Ring", speedLimit: 35 },
      { x: -80, z: 0, w: 20, name: "Festival Central Ring", speedLimit: 35 }
    ];
    this.addRoadLoop(festivalHub, "FESTIVAL_HUB", 0x1f2228, false);

    // Connectors from Hub to all zones
    this.addRoadSegment([{ x: 0, z: 80, w: 16 }, { x: 200, z: 200, w: 16 }], "CONNECTOR", 0x25282d);
    this.addRoadSegment([{ x: 80, z: 0, w: 16 }, { x: 200, z: -150, w: 16 }], "CONNECTOR", 0x25282d);
    this.addRoadSegment([{ x: -80, z: 0, w: 16 }, { x: -200, z: -150, w: 16 }], "CONNECTOR", 0x25282d);
    this.addRoadSegment([{ x: 0, z: 80, w: 14 }, { x: -150, z: 150, w: 14 }], "CONNECTOR", 0x25282d);

    // Build 3D Road Meshes from segments
    this.buildRoadMeshes();
  }

  addRoadLoop(nodes, type, colorHex, isDivided = false, surface = 'ASPHALT') {
    const loopNodes = [...nodes, nodes[0]]; // Close the loop
    this.addRoadSegment(loopNodes, type, colorHex, isDivided, surface);
  }

  addRoadSegment(nodes, type, colorHex, isDivided = false, surface = 'ASPHALT') {
    // Interpolate points along nodes for smooth spline
    const points = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const y = this.getGroundHeight(node.x, node.z) + 0.12;
      points.push({
        x: node.x,
        y: y,
        z: node.z,
        w: node.w || 14,
        name: node.name || "Open Road",
        speedLimit: node.speedLimit || 50,
        surface: surface
      });
    }

    this.roadSegments.push({
      points: points,
      type: type,
      colorHex: colorHex,
      isDivided: isDivided,
      surface: surface
    });
  }

  buildRoadMeshes() {
    this.roadSegments.forEach(seg => {
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

        // Tangent & Normal vectors
        const tx = next.x - prev.x;
        const tz = next.z - prev.z;
        const tLen = Math.sqrt(tx * tx + tz * tz) || 1;
        const dirX = tx / tLen;
        const dirZ = tz / tLen;

        // Perpendicular road normal (horizontal)
        const perpX = -dirZ;
        const perpZ = dirX;

        const halfW = curr.w * 0.5;

        // Left & Right road vertices
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

      roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      roadGeo.setIndex(indices);

      const mat = new THREE.MeshStandardMaterial({
        color: seg.colorHex || 0x25282d,
        roughness: seg.surface === 'DIRT' ? 0.9 : 0.6,
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

    const halfW = closestPt ? (closestPt.w * 0.5) + 1.5 : 8.0;
    const onRoad = closestDist <= halfW;

    return {
      onRoad: onRoad,
      distanceToRoad: closestDist,
      roadName: roadName,
      speedLimit: speedLimit,
      surface: surface,
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
    const colorAsphalt = new THREE.Color(0x2c333d);
    const colorGrass = new THREE.Color(0x2d5a27);
    const colorLush = new THREE.Color(0x3e7a35);
    const colorRock = new THREE.Color(0x5a5b5e);
    const colorSand = new THREE.Color(0xd4b886);
    const colorDirt = new THREE.Color(0x54402d);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = this.getGroundHeight(vx, vz);
      pos.setY(i, vy);

      // Vertex color blending based on height and zone
      let col = colorGrass.clone();
      const dist = Math.sqrt(vx * vx + vz * vz);

      if (dist > 950) {
        col.lerp(colorSand, Math.min(1.0, (dist - 950) / 100));
      } else if (vy > 45) {
        col.lerp(colorRock, Math.min(1.0, (vy - 45) / 30));
      } else if (vx < -150 && vz < -150) {
        col.lerp(colorDirt, 0.45);
      } else if (vx > 100 && vz < 0) {
        col.lerp(colorAsphalt, 0.35); // Downtown paved foundation
      } else {
        col.lerp(colorLush, (Math.sin(vx * 0.05) + 1) * 0.2);
      }

      colors.push(col.r, col.g, col.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);

    // Ocean Water Plane
    const oceanGeo = new THREE.PlaneGeometry(3600, 3600);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a4b78,
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
    // 1. Pine Trees (Mountains & Forests)
    const pineCount = 500;
    const pineTrunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 3, 6);
    const pineFoliageGeo = new THREE.ConeGeometry(2.5, 7, 7);
    pineFoliageGeo.translate(0, 4.5, 0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1e3f20, roughness: 0.8 });

    const pineInstTrunk = new THREE.InstancedMesh(pineTrunkGeo, trunkMat, pineCount);
    const pineInstFoliage = new THREE.InstancedMesh(pineFoliageGeo, pineMat, pineCount);
    pineInstTrunk.castShadow = true;
    pineInstFoliage.castShadow = true;

    const dummy = new THREE.Object3D();
    let pIdx = 0;

    for (let i = 0; i < pineCount; i++) {
      const rx = (Math.random() - 0.5) * 2000;
      const rz = (Math.random() - 0.5) * 2000;
      const roadInfo = this.getRoadInfo(rx, rz);

      // Keep trees off asphalt road surface
      if (!roadInfo.onRoad && Math.sqrt(rx * rx + rz * rz) < 1000) {
        const ry = this.getGroundHeight(rx, rz);
        const scale = 0.8 + Math.random() * 0.6;

        dummy.position.set(rx, ry + 1.5, rz);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.updateMatrix();

        pineInstTrunk.setMatrixAt(pIdx, dummy.matrix);
        pineInstFoliage.setMatrixAt(pIdx, dummy.matrix);

        // Add tree collider
        this.colliders.push({
          type: 'cylinder',
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

    // 2. Palm Trees (Coastal Marina)
    const palmCount = 120;
    const palmFoliageGeo = new THREE.SphereGeometry(2.2, 8, 6);
    palmFoliageGeo.scale(1.8, 0.4, 1.8);
    palmFoliageGeo.translate(0, 5.5, 0);
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x2e6b27, roughness: 0.7 });

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

    // 3. Street Lamps (Roadsides)
    const lampCount = 200;
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444850, metalness: 0.8, roughness: 0.3 });
    const lampInst = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);

    const bulbGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff0cc,
      emissive: 0xffaa33,
      emissiveIntensity: 0.2
    });
    const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);

    let lIdx = 0;
    this.roadSegments.forEach(seg => {
      for (let i = 0; i < seg.points.length; i += 2) {
        if (lIdx >= lampCount) break;
        const pt = seg.points[i];
        const offset = (pt.w * 0.5) + 1.8;

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

    // 4. City Skyscrapers & Buildings
    this.generateCityBuildings();
  }

  generateCityBuildings() {
    const buildingGroup = new THREE.Group();
    buildingGroup.name = "DowntownSkyscrapers";

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a2636,
      roughness: 0.15,
      metalness: 0.85
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x3a3f4a,
      roughness: 0.7,
      metalness: 0.2
    });

    // Downtown grid bounds: X: 220..580, Z: -520..-180
    const cityBlocks = [
      { x: 300, z: -250, w: 70, d: 70, h: 85 },
      { x: 500, z: -250, w: 65, d: 65, h: 110 },
      { x: 300, z: -450, w: 70, d: 70, h: 95 },
      { x: 500, z: -450, w: 65, d: 65, h: 140 }, // Tallest Tower
      { x: 400, z: -250, w: 45, d: 55, h: 60 },
      { x: 400, z: -450, w: 55, d: 45, h: 75 },
      { x: 250, z: -350, w: 50, d: 50, h: 55 },
      { x: 550, z: -350, w: 55, d: 55, h: 68 },
      // Industrial Warehouses (South-West)
      { x: -600, z: 550, w: 90, d: 60, h: 22, mat: concreteMat },
      { x: -720, z: 580, w: 80, d: 70, h: 20, mat: concreteMat },
      { x: -550, z: 700, w: 100, d: 50, h: 25, mat: concreteMat }
    ];

    cityBlocks.forEach(b => {
      const y = this.getGroundHeight(b.x, b.z);
      const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const bMesh = new THREE.Mesh(bGeo, b.mat || glassMat);
      bMesh.position.set(b.x, y + b.h * 0.5, b.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      buildingGroup.add(bMesh);

      // Building Collider
      this.colliders.push({
        type: 'box',
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
    // 1. Festival Main Stage (Center Plaza)
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, this.getGroundHeight(0, 0), 0);

    const platformGeo = new THREE.CylinderGeometry(28, 30, 3, 24);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.8, roughness: 0.3 });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = 1.5;
    stageGroup.add(platformMesh);

    // Festival Arch / Truss
    const archGeo = new THREE.TorusGeometry(18, 0.8, 8, 24, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 0.6 });
    const archMesh = new THREE.Mesh(archGeo, archMat);
    archMesh.position.set(0, 3, 0);
    stageGroup.add(archMesh);

    // Searchlights
    const lightBeamGeo = new THREE.ConeGeometry(8, 80, 16, 1, true);
    lightBeamGeo.translate(0, 40, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });

    [-12, 12].forEach(x => {
      const beam = new THREE.Mesh(lightBeamGeo, beamMat);
      beam.position.set(x, 2, 0);
      stageGroup.add(beam);
      this.animatedProps.push({ type: 'searchlight', mesh: beam, speed: 1.5, offset: x });
    });

    this.scene.add(stageGroup);

    // 2. Coastal Lighthouse (South-East Pier)
    const lhGroup = new THREE.Group();
    const lhY = this.getGroundHeight(750, 750);
    lhGroup.position.set(750, lhY, 750);

    const towerGeo = new THREE.CylinderGeometry(3, 5.5, 28, 16);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 });
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.y = 14;
    towerMesh.castShadow = true;
    lhGroup.add(towerMesh);

    // Lighthouse Lamp
    const lhBulbGeo = new THREE.SphereGeometry(1.5, 12, 12);
    const lhBulbMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff55, emissiveIntensity: 1.5 });
    const lhBulb = new THREE.Mesh(lhBulbGeo, lhBulbMat);
    lhBulb.position.y = 28.5;
    lhGroup.add(lhBulb);

    this.animatedProps.push({ type: 'lighthouse', mesh: lhBulb, speed: 0.8 });
    this.scene.add(lhGroup);

    // 3. Mountain Wind Turbines
    const turbinePositions = [
      { x: -550, z: -350 },
      { x: -680, z: -450 },
      { x: -450, z: -750 }
    ];

    turbinePositions.forEach(tp => {
      const ty = this.getGroundHeight(tp.x, tp.z);
      const wtGroup = new THREE.Group();
      wtGroup.position.set(tp.x, ty, tp.z);

      // Mast
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 42, 12), towerMat);
      mast.position.y = 21;
      mast.castShadow = true;
      wtGroup.add(mast);

      // Rotor Hub & Blades
      const hub = new THREE.Group();
      hub.position.set(0, 42, 1.5);

      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 18, 0.15), towerMat);
        blade.position.y = 9;
        const bladeArm = new THREE.Group();
        bladeArm.rotation.z = (b * Math.PI * 2) / 3;
        bladeArm.add(blade);
        hub.add(bladeArm);
      }

      wtGroup.add(hub);
      this.animatedProps.push({ type: 'turbine', mesh: hub, speed: 1.2 });
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

    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xaaaaee,
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
    // 1. Day / Night Cycle Progression
    if (this.isDynamicTime) {
      this.timeOfDay = (this.timeOfDay + this.daySpeed * dt) % 1.0;
    }

    this.updateAtmosphere(this.timeOfDay);

    // 2. Animate landmarks
    const time = performance.now() * 0.001;
    this.animatedProps.forEach(prop => {
      if (prop.type === 'searchlight') {
        prop.mesh.rotation.z = Math.sin(time * prop.speed + prop.offset) * 0.45;
        prop.mesh.rotation.x = Math.cos(time * prop.speed * 0.7) * 0.35;
      } else if (prop.type === 'lighthouse') {
        prop.mesh.rotation.y = time * prop.speed;
      } else if (prop.type === 'turbine') {
        prop.mesh.rotation.z += dt * prop.speed;
      }
    });

    // 3. Rain particle follow player
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
    // t: 0.0 (midnight) -> 0.25 (dawn) -> 0.5 (noon) -> 0.75 (sunset) -> 1.0 (midnight)
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
      // Day
      skyColor.setHex(0x87ceeb);
      fogColor.setHex(0xb2d9f7);
      sunColor.setHex(0xfffaed);
      sunIntensity = 1.4;
      if (this.bulbMaterial) this.bulbMaterial.emissiveIntensity = 0.1;
    } else if (sunHeight > -0.1) {
      // Sunset / Dawn Golden Hour
      skyColor.setHex(0xff7744);
      fogColor.setHex(0xe87a5d);
      sunColor.setHex(0xffaa55);
      sunIntensity = 0.9;
      if (this.bulbMaterial) this.bulbMaterial.emissiveIntensity = 0.8;
    } else {
      // Night
      skyColor.setHex(0x060814);
      fogColor.setHex(0x0c1020);
      sunColor.setHex(0x4466aa);
      sunIntensity = 0.2;
      isNight = true;
      if (this.bulbMaterial) this.bulbMaterial.emissiveIntensity = 1.5;
    }

    if (this.weather === 'rain') {
      skyColor.setHex(0x3a424d);
      fogColor.setHex(0x4a525d);
      sunIntensity = 0.4;
      this.fog.density = 0.0022;
      this.rainParticles.visible = true;
    } else {
      this.fog.density = 0.0008;
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
    if (weatherType === 'sunset') {
      this.timeOfDay = 0.74;
      this.isDynamicTime = false;
    } else if (weatherType === 'night') {
      this.timeOfDay = 0.95;
      this.isDynamicTime = false;
    } else if (weatherType === 'clear') {
      this.timeOfDay = 0.4;
      this.isDynamicTime = true;
    }
  }
}
