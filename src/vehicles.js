/**
 * OPEN ROAD FESTIVAL - Procedural 3D Vehicle Models & Specifications
 */

export const VEHICLE_DEFINITIONS = {
  'breeze_rs': {
    id: 'breeze_rs',
    name: 'Breeze RS',
    className: 'Compact Hot Hatch',
    description: 'Nimble, lightweight front-wheel-drive hot hatchback. Snappy turn-in, ultra-forgiving, and exceptionally fun on tight city circuits.',
    price: 0, // Starter car
    stats: {
      powerHp: 210,
      massKg: 1150,
      topSpeedMph: 138,
      accel060: 5.8,
      handling: 85,
      braking: 80,
      drivetrain: 'FWD',
      difficulty: 'Easy'
    },
    physics: {
      wheelbase: 2.45,
      trackWidth: 1.55,
      cgHeight: 0.45,
      drivetrain: 'FWD', // 'FWD', 'RWD', 'AWD'
      frontTorqueRatio: 1.0,
      peakTorque: 320,
      maxRpm: 7800,
      idleRpm: 850,
      gearRatios: [3.4, 2.1, 1.45, 1.1, 0.88, 0.72],
      finalDrive: 3.9,
      tireGripBase: 1.15,
      suspensionStiffness: 32000,
      suspensionDamping: 3200,
      suspensionRestLength: 0.38,
      dragCoeff: 0.32,
      downforceCoeff: 0.15
    },
    defaultColor: '#00e5ff'
  },

  'veloce_gt': {
    id: 'veloce_gt',
    name: 'Veloce GT',
    className: 'Sports Coupe',
    description: 'Classic front-engine rear-wheel-drive sports coupe with 50:50 weight balance. Built for carving apexes and holding long power slides.',
    price: 25000,
    stats: {
      powerHp: 370,
      massKg: 1380,
      topSpeedMph: 174,
      accel060: 4.2,
      handling: 90,
      braking: 86,
      drivetrain: 'RWD',
      difficulty: 'Medium'
    },
    physics: {
      wheelbase: 2.62,
      trackWidth: 1.62,
      cgHeight: 0.42,
      drivetrain: 'RWD',
      frontTorqueRatio: 0.0,
      peakTorque: 480,
      maxRpm: 8200,
      idleRpm: 800,
      gearRatios: [3.6, 2.25, 1.55, 1.18, 0.94, 0.78],
      finalDrive: 3.73,
      tireGripBase: 1.25,
      suspensionStiffness: 38000,
      suspensionDamping: 3600,
      suspensionRestLength: 0.35,
      dragCoeff: 0.29,
      downforceCoeff: 0.35
    },
    defaultColor: '#ff3300'
  },

  'apex_nomad': {
    id: 'apex_nomad',
    name: 'Apex Nomad',
    className: 'AWD Rally Crossover',
    description: 'Turbocharged rally-bred all-wheel-drive crossover. High-travel suspension, rugged tires, and unflappable all-weather traction.',
    price: 40000,
    stats: {
      powerHp: 410,
      massKg: 1520,
      topSpeedMph: 158,
      accel060: 3.7,
      handling: 88,
      braking: 85,
      drivetrain: 'AWD',
      difficulty: 'Easy'
    },
    physics: {
      wheelbase: 2.68,
      trackWidth: 1.68,
      cgHeight: 0.52,
      drivetrain: 'AWD',
      frontTorqueRatio: 0.45,
      peakTorque: 540,
      maxRpm: 7600,
      idleRpm: 900,
      gearRatios: [3.8, 2.35, 1.62, 1.22, 0.96, 0.79],
      finalDrive: 4.1,
      tireGripBase: 1.30,
      suspensionStiffness: 28000,
      suspensionDamping: 3100,
      suspensionRestLength: 0.48,
      dragCoeff: 0.36,
      downforceCoeff: 0.22
    },
    defaultColor: '#2ecc71'
  },

  'thunderbolt_454': {
    id: 'thunderbolt_454',
    name: 'Thunderbolt 454',
    className: 'American Muscle',
    description: 'Raw high-displacement V8 muscle car. Huge low-end torque, dramatic burnouts, and demanding rear traction that rewards bold drivers.',
    price: 65000,
    stats: {
      powerHp: 520,
      massKg: 1720,
      topSpeedMph: 168,
      accel060: 3.9,
      handling: 76,
      braking: 78,
      drivetrain: 'RWD',
      difficulty: 'Hard'
    },
    physics: {
      wheelbase: 2.80,
      trackWidth: 1.66,
      cgHeight: 0.48,
      drivetrain: 'RWD',
      frontTorqueRatio: 0.0,
      peakTorque: 720,
      maxRpm: 6800,
      idleRpm: 750,
      gearRatios: [3.3, 2.15, 1.48, 1.12, 0.86, 0.68],
      finalDrive: 3.55,
      tireGripBase: 1.18,
      suspensionStiffness: 35000,
      suspensionDamping: 3400,
      suspensionRestLength: 0.38,
      dragCoeff: 0.38,
      downforceCoeff: 0.18
    },
    defaultColor: '#3498db'
  },

  'phantom_valkyrie': {
    id: 'phantom_valkyrie',
    name: 'Phantom Valkyrie',
    className: 'Track Hypercar',
    description: 'Carbon-fiber aerodynamic hypercar with hybrid AWD, active aero rear wing, razor-sharp steering, and blistering 230+ mph top speed.',
    price: 120000,
    stats: {
      powerHp: 840,
      massKg: 1260,
      topSpeedMph: 236,
      accel060: 2.3,
      handling: 98,
      braking: 98,
      drivetrain: 'AWD',
      difficulty: 'Expert'
    },
    physics: {
      wheelbase: 2.74,
      trackWidth: 1.74,
      cgHeight: 0.35,
      drivetrain: 'AWD',
      frontTorqueRatio: 0.40,
      peakTorque: 950,
      maxRpm: 9200,
      idleRpm: 950,
      gearRatios: [3.9, 2.45, 1.72, 1.30, 1.04, 0.85, 0.70],
      finalDrive: 3.45,
      tireGripBase: 1.55,
      suspensionStiffness: 52000,
      suspensionDamping: 4800,
      suspensionRestLength: 0.28,
      dragCoeff: 0.26,
      downforceCoeff: 0.85
    },
    defaultColor: '#9b59b6'
  }
};

export class VehicleModelBuilder {
  /**
   * Build complete 3D procedural vehicle mesh in Three.js
   */
  static buildVehicle(vehicleId, paintHex = '#00e5ff') {
    const def = VEHICLE_DEFINITIONS[vehicleId] || VEHICLE_DEFINITIONS['breeze_rs'];
    const carGroup = new THREE.Group();
    carGroup.name = `Car_${vehicleId}`;

    // Common materials
    const paintColor = new THREE.Color(paintHex);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: paintColor,
      roughness: 0.22,
      metalness: 0.75,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111114,
      roughness: 0.4,
      metalness: 0.3
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x111822,
      roughness: 0.05,
      metalness: 0.9,
      transparent: true,
      opacity: 0.82
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.1,
      metalness: 0.95
    });

    const headlightGlass = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.5
    });

    const taillightGlass = new THREE.MeshStandardMaterial({
      color: 0xff1122,
      emissive: 0xff0011,
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

    // Build specific body shapes
    if (vehicleId === 'breeze_rs') {
      // --- HATCHBACK ---
      // Lower body
      const lowerGeo = new THREE.BoxGeometry(1.55, 0.45, 3.7);
      const lowerMesh = new THREE.Mesh(lowerGeo, bodyMaterial);
      lowerMesh.position.y = 0.42;
      lowerMesh.castShadow = true;
      chassisGroup.add(lowerMesh);

      // Cabin / Roof
      const cabinGeo = new THREE.BoxGeometry(1.35, 0.5, 2.1);
      const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabinMesh.position.set(0, 0.85, -0.2);
      cabinMesh.castShadow = true;
      chassisGroup.add(cabinMesh);

      // Windows
      const windshieldGeo = new THREE.BoxGeometry(1.32, 0.42, 0.8);
      const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMaterial);
      windshieldMesh.position.set(0, 0.82, 0.55);
      windshieldMesh.rotation.x = 0.35;
      chassisGroup.add(windshieldMesh);

      // Rear hatch spoiler
      const spoilerGeo = new THREE.BoxGeometry(1.3, 0.06, 0.3);
      const spoilerMesh = new THREE.Mesh(spoilerGeo, carbonMaterial);
      spoilerMesh.position.set(0, 1.12, -1.25);
      chassisGroup.add(spoilerMesh);

    } else if (vehicleId === 'veloce_gt') {
      // --- SPORTS COUPE ---
      // Sculpted low chassis
      const baseGeo = new THREE.BoxGeometry(1.62, 0.38, 4.2);
      const baseMesh = new THREE.Mesh(baseGeo, bodyMaterial);
      baseMesh.position.y = 0.38;
      baseMesh.castShadow = true;
      chassisGroup.add(baseMesh);

      // Sloping fastback cabin
      const cabinGeo = new THREE.BoxGeometry(1.38, 0.42, 2.0);
      const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabinMesh.position.set(0, 0.74, -0.35);
      cabinMesh.castShadow = true;
      chassisGroup.add(cabinMesh);

      // Fastback rear glass
      const rearGlassGeo = new THREE.BoxGeometry(1.32, 0.38, 0.9);
      const rearGlassMesh = new THREE.Mesh(rearGlassGeo, glassMaterial);
      rearGlassMesh.position.set(0, 0.72, -1.1);
      rearGlassMesh.rotation.x = -0.5;
      chassisGroup.add(rearGlassMesh);

      // Front windshield
      const frontGlassGeo = new THREE.BoxGeometry(1.34, 0.4, 0.9);
      const frontGlassMesh = new THREE.Mesh(frontGlassGeo, glassMaterial);
      frontGlassMesh.position.set(0, 0.72, 0.45);
      frontGlassMesh.rotation.x = 0.5;
      chassisGroup.add(frontGlassMesh);

      // Front splitter & rear diffuser
      const splitterGeo = new THREE.BoxGeometry(1.64, 0.08, 0.4);
      const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
      splitterMesh.position.set(0, 0.22, 2.05);
      chassisGroup.add(splitterMesh);

      const ducktailGeo = new THREE.BoxGeometry(1.4, 0.1, 0.2);
      const ducktailMesh = new THREE.Mesh(ducktailGeo, bodyMaterial);
      ducktailMesh.position.set(0, 0.65, -2.05);
      chassisGroup.add(ducktailMesh);

    } else if (vehicleId === 'apex_nomad') {
      // --- RALLY CROSSOVER ---
      const bodyGeo = new THREE.BoxGeometry(1.68, 0.55, 4.0);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
      bodyMesh.position.y = 0.58;
      bodyMesh.castShadow = true;
      chassisGroup.add(bodyMesh);

      // Cabin
      const cabinGeo = new THREE.BoxGeometry(1.48, 0.52, 2.3);
      const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabinMesh.position.set(0, 1.05, -0.15);
      cabinMesh.castShadow = true;
      chassisGroup.add(cabinMesh);

      // Roof rack with spare tire & LED light bar
      const rackGeo = new THREE.BoxGeometry(1.3, 0.08, 1.8);
      const rackMesh = new THREE.Mesh(rackGeo, carbonMaterial);
      rackMesh.position.set(0, 1.35, -0.15);
      chassisGroup.add(rackMesh);

      // Roof LED Lightbar
      const lightbarGeo = new THREE.BoxGeometry(1.1, 0.08, 0.1);
      const lightbarMesh = new THREE.Mesh(lightbarGeo, headlightGlass);
      lightbarMesh.position.set(0, 1.42, 0.7);
      chassisGroup.add(lightbarMesh);

      // Fender flares
      [-0.88, 0.88].forEach(x => {
        const flareF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.8), carbonMaterial);
        flareF.position.set(x, 0.52, 1.25);
        chassisGroup.add(flareF);
        const flareR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.8), carbonMaterial);
        flareR.position.set(x, 0.52, -1.25);
        chassisGroup.add(flareR);
      });

    } else if (vehicleId === 'thunderbolt_454') {
      // --- MUSCLE CAR ---
      const muscleGeo = new THREE.BoxGeometry(1.66, 0.44, 4.4);
      const muscleMesh = new THREE.Mesh(muscleGeo, bodyMaterial);
      muscleMesh.position.y = 0.45;
      muscleMesh.castShadow = true;
      chassisGroup.add(muscleMesh);

      // Hood scoop
      const scoopGeo = new THREE.BoxGeometry(0.6, 0.12, 0.9);
      const scoopMesh = new THREE.Mesh(scoopGeo, carbonMaterial);
      scoopMesh.position.set(0, 0.72, 1.1);
      chassisGroup.add(scoopMesh);

      // Cabin
      const cabinGeo = new THREE.BoxGeometry(1.42, 0.44, 2.1);
      const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabinMesh.position.set(0, 0.82, -0.3);
      cabinMesh.castShadow = true;
      chassisGroup.add(cabinMesh);

      // Chrome bumpers
      const fChrome = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 0.15), chromeMaterial);
      fChrome.position.set(0, 0.38, 2.22);
      chassisGroup.add(fChrome);
      const rChrome = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 0.15), chromeMaterial);
      rChrome.position.set(0, 0.42, -2.22);
      chassisGroup.add(rChrome);

    } else if (vehicleId === 'phantom_valkyrie') {
      // --- TRACK HYPERCAR ---
      const hyperBaseGeo = new THREE.BoxGeometry(1.74, 0.28, 4.3);
      const hyperBaseMesh = new THREE.Mesh(hyperBaseGeo, bodyMaterial);
      hyperBaseMesh.position.y = 0.32;
      hyperBaseMesh.castShadow = true;
      chassisGroup.add(hyperBaseMesh);

      // Aerodynamic cockpit teardrop
      const domeGeo = new THREE.SphereGeometry(0.68, 16, 12);
      domeGeo.scale(1.0, 0.6, 2.2);
      const domeMesh = new THREE.Mesh(domeGeo, glassMaterial);
      domeMesh.position.set(0, 0.55, 0.1);
      chassisGroup.add(domeMesh);

      // Active Aero Wing (rotates on heavy braking)
      const wingGroup = new THREE.Group();
      wingGroup.position.set(0, 0.68, -1.9);

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.04, 0.35), carbonMaterial);
      wingBlade.castShadow = true;
      wingGroup.add(wingBlade);

      // Struts
      [-0.45, 0.45].forEach(x => {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.15), carbonMaterial);
        strut.position.set(x, -0.15, 0);
        wingGroup.add(strut);
      });

      chassisGroup.add(wingGroup);
      activeWingMesh = wingGroup;
    }

    // --- LIGHTS & GRILLES ---
    // Front Headlights
    [-0.55, 0.55].forEach(x => {
      const hlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.1), headlightGlass);
      hlMesh.position.set(x, 0.46, (def.physics.wheelbase * 0.5) + 0.85);
      chassisGroup.add(hlMesh);
    });

    // Rear Taillights
    [-0.55, 0.55].forEach(x => {
      const tlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), taillightGlass);
      tlMesh.position.set(x, 0.48, -(def.physics.wheelbase * 0.5) - 0.85);
      chassisGroup.add(tlMesh);
    });

    // Interior Cockpit & Steering Wheel
    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, 0.45, 0.2);

    // Dashboard
    const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.4), carbonMaterial);
    dashMesh.position.set(0, 0.25, 0.35);
    interiorGroup.add(dashMesh);

    // Steering wheel
    const wheelTorus = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 16), carbonMaterial);
    wheelTorus.position.set(-0.32, 0.28, 0.15);
    wheelTorus.rotation.x = 0.35;
    interiorGroup.add(wheelTorus);
    steeringWheelMesh = wheelTorus;

    chassisGroup.add(interiorGroup);

    // --- 4 WHEELS ---
    const wheelMeshes = [];
    const wb = def.physics.wheelbase;
    const tw = def.physics.trackWidth;
    const wheelPositions = [
      { name: 'FL', pos: new THREE.Vector3(-tw * 0.5, 0.32, wb * 0.5), isFront: true },
      { name: 'FR', pos: new THREE.Vector3(tw * 0.5, 0.32, wb * 0.5), isFront: true },
      { name: 'RL', pos: new THREE.Vector3(-tw * 0.5, 0.32, -wb * 0.5), isFront: false },
      { name: 'RR', pos: new THREE.Vector3(tw * 0.5, 0.32, -wb * 0.5), isFront: false }
    ];

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181a,
      roughness: 0.85,
      metalness: 0.1
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.25,
      metalness: 0.85
    });

    const brakeCaliperMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      roughness: 0.3,
      metalness: 0.6
    });

    wheelPositions.forEach((wp, index) => {
      const wheelHub = new THREE.Group();
      wheelHub.name = `Wheel_${wp.name}`;
      wheelHub.position.copy(wp.pos);

      // Rotating wheel cylinder
      const wheelSpinGroup = new THREE.Group();

      const tireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.26, 20);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMesh = new THREE.Mesh(tireGeo, tireMaterial);
      tireMesh.castShadow = true;
      wheelSpinGroup.add(tireMesh);

      // Rim
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.27, 12);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
      wheelSpinGroup.add(rimMesh);

      wheelHub.add(wheelSpinGroup);

      // Static brake caliper
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
      bodyMaterial: bodyMaterial,
      wheels: wheelMeshes,
      activeWing: activeWingMesh,
      steeringWheel: steeringWheelMesh,
      taillightMaterial: taillightGlass,
      def: def
    };
  }
}
