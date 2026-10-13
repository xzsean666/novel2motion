import * as THREE from "three";

export type GenderType = "male" | "female";
export type Archetype3D = "male_hero" | "male_shonen" | "male_muscular" | "male_elder" | "female_fairy" | "female_maiden";
export type FaceShape3D = "male_heroic" | "male_shonen" | "male_muscular" | "female_fairy" | "female_maiden";
export type Emotion3D = "neutral" | "battle" | "angry" | "happy" | "shocked";
export type Viseme3D = "silence" | "a" | "i" | "u" | "e" | "o" | "m";
export type HairStyle3D = "high_ponytail" | "daoist_topknot" | "barbarian_wild" | "celestial_buns" | "flowing_long";
export type OutfitStyle3D = "xianxia_robe" | "shonen_battlegarb" | "barbarian_armor" | "fairy_silks";
export type WeaponType3D = "sword_cyan" | "sword_flame" | "sword_ice" | "totem_cleaver" | "none";

export interface CharacterModel3DOptions {
  id: string;
  name: string;
  gender: GenderType;
  archetype?: Archetype3D;
  faceShape?: FaceShape3D;
  hairStyle?: HairStyle3D;
  outfitStyle?: OutfitStyle3D;
  weaponType?: WeaponType3D;
  initialEmotion?: Emotion3D;
  initialViseme?: Viseme3D;
  primaryColor?: number;
  accentColor?: number;
  skinTone?: number;
  hairColor?: number;
}

/**
 * CharacterModel3D: Real 3D Humanoid Game Character in Three.js
 * Builds genuine 3D polygonal anatomy, face topology, layered outfits, hair, and weapons.
 */
export class CharacterModel3D {
  readonly id: string;
  readonly name: string;
  readonly gender: GenderType;
  readonly archetype: Archetype3D;
  readonly faceShape: FaceShape3D;
  readonly hairStyle: HairStyle3D;
  readonly outfitStyle: OutfitStyle3D;
  readonly weaponType: WeaponType3D;

  readonly root: THREE.Group;

  // Major 3D Hierarchy Nodes
  readonly headNode: THREE.Group;
  readonly faceNode: THREE.Group;
  readonly eyesNode: THREE.Group;
  readonly eyebrowsNode: THREE.Group;
  readonly mouthNode: THREE.Group;
  readonly hairNode: THREE.Group;
  readonly torsoNode: THREE.Group;
  readonly armsLeftNode: THREE.Group;
  readonly armsRightNode: THREE.Group;
  readonly legsLeftNode: THREE.Group;
  readonly legsRightNode: THREE.Group;
  readonly outfitNode: THREE.Group;
  readonly weaponNode: THREE.Group;

  // Facial feature meshes for dynamic morphs
  private leftBrowMesh!: THREE.Mesh;
  private rightBrowMesh!: THREE.Mesh;
  private leftEyeMesh!: THREE.Mesh;
  private rightEyeMesh!: THREE.Mesh;
  private upperLipMesh!: THREE.Mesh;
  private lowerLipMesh!: THREE.Mesh;
  private jawMesh!: THREE.Mesh;

  // Colors & Materials
  private readonly skinColor: THREE.Color;
  private readonly hairColor: THREE.Color;
  private readonly primaryColor: THREE.Color;
  private readonly accentColor: THREE.Color;

  private currentEmotion: Emotion3D = "neutral";
  private currentViseme: Viseme3D = "silence";
  private visemeOpenness = 0;

  constructor(options: CharacterModel3DOptions) {
    this.id = options.id;
    this.name = options.name;
    this.gender = options.gender;

    // Resolve defaults based on gender
    if (this.gender === "female") {
      this.archetype = options.archetype || "female_fairy";
      this.faceShape = options.faceShape || "female_fairy";
      this.hairStyle = options.hairStyle || "celestial_buns";
      this.outfitStyle = options.outfitStyle || "fairy_silks";
      this.weaponType = options.weaponType || "sword_ice";
      this.skinColor = new THREE.Color(options.skinTone ?? 0xfff0ea);
      this.hairColor = new THREE.Color(options.hairColor ?? 0x1a1824);
      this.primaryColor = new THREE.Color(options.primaryColor ?? 0xa855f7); // Lavender/purple
      this.accentColor = new THREE.Color(options.accentColor ?? 0x38bdf8); // Ice blue
    } else {
      this.archetype = options.archetype || "male_hero";
      this.faceShape = options.faceShape || (this.archetype === "male_shonen" ? "male_shonen" : this.archetype === "male_muscular" ? "male_muscular" : "male_heroic");
      this.hairStyle = options.hairStyle || (this.archetype === "male_shonen" ? "high_ponytail" : this.archetype === "male_muscular" ? "barbarian_wild" : "daoist_topknot");
      this.outfitStyle = options.outfitStyle || (this.archetype === "male_shonen" ? "shonen_battlegarb" : this.archetype === "male_muscular" ? "barbarian_armor" : "xianxia_robe");
      this.weaponType = options.weaponType || (this.archetype === "male_shonen" ? "sword_flame" : this.archetype === "male_muscular" ? "totem_cleaver" : "sword_cyan");
      this.skinColor = new THREE.Color(options.skinTone ?? (this.archetype === "male_muscular" ? 0xd49b70 : 0xffeedd));
      this.hairColor = new THREE.Color(options.hairColor ?? 0x18181b);
      this.primaryColor = new THREE.Color(options.primaryColor ?? (this.archetype === "male_shonen" ? 0xdc2626 : this.archetype === "male_muscular" ? 0x78350f : 0x059669));
      this.accentColor = new THREE.Color(options.accentColor ?? (this.archetype === "male_shonen" ? 0xf59e0b : this.archetype === "male_muscular" ? 0xd97706 : 0x10b981));
    }

    this.root = new THREE.Group();
    this.root.name = `Character3D_${this.id}`;

    // Initialize node groups
    this.headNode = new THREE.Group();
    this.faceNode = new THREE.Group();
    this.eyesNode = new THREE.Group();
    this.eyebrowsNode = new THREE.Group();
    this.mouthNode = new THREE.Group();
    this.hairNode = new THREE.Group();
    this.torsoNode = new THREE.Group();
    this.armsLeftNode = new THREE.Group();
    this.armsRightNode = new THREE.Group();
    this.legsLeftNode = new THREE.Group();
    this.legsRightNode = new THREE.Group();
    this.outfitNode = new THREE.Group();
    this.weaponNode = new THREE.Group();

    // Assemble Hierarchy
    this.root.add(this.torsoNode);
    this.root.add(this.legsLeftNode);
    this.root.add(this.legsRightNode);
    this.root.add(this.outfitNode);

    this.torsoNode.add(this.headNode);
    this.torsoNode.add(this.armsLeftNode);
    this.torsoNode.add(this.armsRightNode);

    this.headNode.add(this.faceNode);
    this.headNode.add(this.hairNode);
    this.faceNode.add(this.eyesNode);
    this.faceNode.add(this.eyebrowsNode);
    this.faceNode.add(this.mouthNode);

    // Build 3D Geometries & Outfits
    this.buildBodyAnatomy();
    this.buildFaceFeatures();
    this.buildHairstyle();
    this.buildCostume();
    this.buildWeapon();

    // Apply initial emotion & viseme
    this.setEmotion(options.initialEmotion || "neutral");
    this.setViseme(options.initialViseme || "silence", 0);
  }

  /**
   * 1. 3D 身体结构建模 (Body Anatomy)
   */
  private buildBodyAnatomy(): void {
    const isFemale = this.gender === "female";
    const isMuscular = this.archetype === "male_muscular";

    const skinMat = new THREE.MeshStandardMaterial({
      color: this.skinColor,
      roughness: 0.65,
      metalness: 0.05
    });

    // Torso / Chest / Pelvis
    const chestW = isFemale ? 0.28 : isMuscular ? 0.44 : 0.36;
    const chestH = isFemale ? 0.38 : isMuscular ? 0.48 : 0.42;
    const chestD = isFemale ? 0.20 : isMuscular ? 0.28 : 0.24;

    const chestGeo = new THREE.BoxGeometry(chestW, chestH, chestD, 2, 3, 2);
    const chestMesh = new THREE.Mesh(chestGeo, skinMat);
    chestMesh.position.set(0, 1.28, 0);
    this.torsoNode.add(chestMesh);

    // Neck
    const neckR = isFemale ? 0.055 : isMuscular ? 0.085 : 0.07;
    const neckH = isFemale ? 0.16 : 0.14;
    const neckGeo = new THREE.CylinderGeometry(neckR, neckR * 1.1, neckH, 12);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, 1.54, 0.01);
    this.torsoNode.add(neckMesh);

    // Head base (Cranium)
    const headW = isFemale ? 0.20 : isMuscular ? 0.25 : 0.22;
    const headH = isFemale ? 0.26 : isMuscular ? 0.29 : 0.28;
    const headD = isFemale ? 0.22 : isMuscular ? 0.26 : 0.24;
    const headGeo = new THREE.SphereGeometry(headW * 0.72, 14, 12);
    headGeo.scale(1.0, headH / (headW * 0.72), headD / (headW * 0.72));
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, 1.76, 0);
    this.headNode.add(headMesh);

    // Jaw / Chin (3D 脸型核心骨骼)
    const jawW = isFemale ? 0.14 : isMuscular ? 0.22 : 0.17;
    const chinW = isFemale ? 0.06 : isMuscular ? 0.12 : 0.08;
    const jawGeo = new THREE.CylinderGeometry(jawW * 0.65, chinW * 0.5, 0.14, 8);
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.position.set(0, 1.64, 0.06);
    jawMesh.rotation.x = 0.25;
    this.headNode.add(jawMesh);
    this.jawMesh = jawMesh;

    // 3D Arms (Left & Right)
    const armR = isFemale ? 0.045 : isMuscular ? 0.08 : 0.055;
    const armH = 0.32;
    const armGeo = new THREE.CylinderGeometry(armR, armR * 0.85, armH, 8);

    // Left Arm
    const armL = new THREE.Mesh(armGeo, skinMat);
    const armLX = -(chestW / 2 + armR * 1.1);
    armL.position.set(armLX, 1.30, 0);
    armL.rotation.z = isFemale ? 0.12 : 0.20;
    this.armsLeftNode.add(armL);

    // Left Forearm
    const forearmL = new THREE.Mesh(armGeo, skinMat);
    forearmL.position.set(armLX - 0.04, 1.02, 0.04);
    forearmL.rotation.z = isFemale ? 0.08 : 0.15;
    forearmL.rotation.x = -0.15;
    this.armsLeftNode.add(forearmL);

    // Left Hand (with 3D fingers)
    const handGeo = new THREE.BoxGeometry(armR * 1.4, 0.09, armR * 0.8);
    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(armLX - 0.06, 0.84, 0.08);
    this.armsLeftNode.add(handL);

    // Right Arm
    const armR_Mesh = new THREE.Mesh(armGeo, skinMat);
    const armRX = (chestW / 2 + armR * 1.1);
    armR_Mesh.position.set(armRX, 1.30, 0);
    armR_Mesh.rotation.z = isFemale ? -0.12 : -0.20;
    this.armsRightNode.add(armR_Mesh);

    // Right Forearm (Holding weapon stance)
    const forearmR = new THREE.Mesh(armGeo, skinMat);
    forearmR.position.set(armRX + 0.04, 1.05, 0.10);
    forearmR.rotation.x = -0.55; // Arm forward
    this.armsRightNode.add(forearmR);

    // Right Hand
    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(armRX + 0.05, 0.92, 0.22);
    this.armsRightNode.add(handR);

    // 3D Legs (Thighs, Knees, Calves)
    const legR = isFemale ? 0.06 : isMuscular ? 0.10 : 0.075;
    const legH = 0.44;
    const legGeo = new THREE.CylinderGeometry(legR, legR * 0.8, legH, 10);

    const legL_X = -chestW * 0.28;
    const legR_X = chestW * 0.28;

    const thighL = new THREE.Mesh(legGeo, skinMat);
    thighL.position.set(legL_X, 0.88, 0);
    this.legsLeftNode.add(thighL);

    const calfL = new THREE.Mesh(legGeo, skinMat);
    calfL.position.set(legL_X, 0.46, 0);
    this.legsLeftNode.add(calfL);

    const thighR = new THREE.Mesh(legGeo, skinMat);
    thighR.position.set(legR_X, 0.88, 0);
    this.legsRightNode.add(thighR);

    const calfR = new THREE.Mesh(legGeo, skinMat);
    calfR.position.set(legR_X, 0.46, 0);
    this.legsRightNode.add(calfR);

    // 3D Combat Boots / Silk Shoes
    const bootMat = new THREE.MeshStandardMaterial({
      color: isFemale ? this.accentColor : 0x1f2937,
      roughness: 0.5
    });
    const bootGeo = new THREE.BoxGeometry(legR * 2.0, 0.16, legR * 2.8);
    const bootL = new THREE.Mesh(bootGeo, bootMat);
    bootL.position.set(legL_X, 0.10, 0.04);
    this.legsLeftNode.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, bootMat);
    bootR.position.set(legR_X, 0.10, 0.04);
    this.legsRightNode.add(bootR);
  }

  /**
   * 2. 3D 脸型、五官与表情建模 (Face, Eyes, Eyebrows, Lips)
   */
  private buildFaceFeatures(): void {
    const isFemale = this.gender === "female";

    // 3D Nose Bridge
    const noseMat = new THREE.MeshStandardMaterial({
      color: this.skinColor.clone().multiplyScalar(0.96),
      roughness: 0.7
    });
    const noseGeo = new THREE.ConeGeometry(isFemale ? 0.016 : 0.024, isFemale ? 0.06 : 0.08, 4);
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.set(0, 1.74, 0.16);
    noseMesh.rotation.x = 0.2;
    this.faceNode.add(noseMesh);

    // 3D Eyes (Spheres with Iris Cornea Lenses)
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const irisColor = isFemale ? 0x9333ea : 0x0284c7; // Amethyst purple vs Sky blue
    const irisMat = new THREE.MeshBasicMaterial({ color: irisColor });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });

    const eyeR = isFemale ? 0.026 : 0.022;
    const eyeSpacing = isFemale ? 0.065 : 0.075;
    const eyeY = 1.77;
    const eyeZ = 0.145;

    // Left Eye
    const eyeL_White = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 8, 8), eyeWhiteMat);
    eyeL_White.position.set(-eyeSpacing, eyeY, eyeZ);
    const eyeL_Iris = new THREE.Mesh(new THREE.CylinderGeometry(eyeR * 0.72, eyeR * 0.72, 0.01, 8), irisMat);
    eyeL_Iris.rotation.x = Math.PI / 2;
    eyeL_Iris.position.set(0, 0, eyeR * 0.85);
    eyeL_White.add(eyeL_Iris);
    const eyeL_Pupil = new THREE.Mesh(new THREE.CylinderGeometry(eyeR * 0.35, eyeR * 0.35, 0.012, 6), pupilMat);
    eyeL_Pupil.rotation.x = Math.PI / 2;
    eyeL_Pupil.position.set(0, 0, eyeR * 0.88);
    eyeL_White.add(eyeL_Pupil);
    this.eyesNode.add(eyeL_White);
    this.leftEyeMesh = eyeL_White;

    // Right Eye
    const eyeR_White = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 8, 8), eyeWhiteMat);
    eyeR_White.position.set(eyeSpacing, eyeY, eyeZ);
    const eyeR_Iris = new THREE.Mesh(new THREE.CylinderGeometry(eyeR * 0.72, eyeR * 0.72, 0.01, 8), irisMat);
    eyeR_Iris.rotation.x = Math.PI / 2;
    eyeR_Iris.position.set(0, 0, eyeR * 0.85);
    eyeR_White.add(eyeR_Iris);
    const eyeR_Pupil = new THREE.Mesh(new THREE.CylinderGeometry(eyeR * 0.35, eyeR * 0.35, 0.012, 6), pupilMat);
    eyeR_Pupil.rotation.x = Math.PI / 2;
    eyeR_Pupil.position.set(0, 0, eyeR * 0.88);
    eyeR_White.add(eyeR_Pupil);
    this.eyesNode.add(eyeR_White);
    this.rightEyeMesh = eyeR_White;

    // 3D Eyebrows (Articulated for emotions)
    const browMat = new THREE.MeshBasicMaterial({ color: this.hairColor });
    const browGeo = new THREE.BoxGeometry(0.055, 0.008, 0.012);

    this.leftBrowMesh = new THREE.Mesh(browGeo, browMat);
    this.leftBrowMesh.position.set(-eyeSpacing, eyeY + 0.038, eyeZ + 0.01);
    this.eyebrowsNode.add(this.leftBrowMesh);

    this.rightBrowMesh = new THREE.Mesh(browGeo, browMat);
    this.rightBrowMesh.position.set(eyeSpacing, eyeY + 0.038, eyeZ + 0.01);
    this.eyebrowsNode.add(this.rightBrowMesh);

    // 3D Mouth & Lips (Morphable for Visemes)
    const lipColor = isFemale ? 0xf43f5e : 0xb91c1c;
    const lipMat = new THREE.MeshStandardMaterial({
      color: lipColor,
      roughness: 0.4
    });

    const lipW = isFemale ? 0.045 : 0.055;
    const lipGeo = new THREE.BoxGeometry(lipW, 0.008, 0.014);

    this.upperLipMesh = new THREE.Mesh(lipGeo, lipMat);
    this.upperLipMesh.position.set(0, 1.67, 0.155);
    this.mouthNode.add(this.upperLipMesh);

    this.lowerLipMesh = new THREE.Mesh(lipGeo, lipMat);
    this.lowerLipMesh.position.set(0, 1.658, 0.152);
    this.mouthNode.add(this.lowerLipMesh);
  }

  /**
   * 3. 3D 配套发型 (Hair Style & Accessories)
   */
  private buildHairstyle(): void {
    const hairMat = new THREE.MeshStandardMaterial({
      color: this.hairColor,
      roughness: 0.75,
      metalness: 0.1
    });

    const isFemale = this.gender === "female";

    // Hair Base Cap (头顶发盖)
    const capGeo = new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.set(0, 1.78, -0.01);
    this.hairNode.add(capMesh);

    if (this.hairStyle === "high_ponytail") {
      // 少年剑修高马尾 + 3D 红飘带
      const tieMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
      const tieRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 8, 12), tieMat);
      tieRing.position.set(0, 1.94, -0.10);
      tieRing.rotation.x = 0.5;
      this.hairNode.add(tieRing);

      // Ponytail Locks
      const tailGeo = new THREE.ConeGeometry(0.08, 0.55, 8);
      const tailMesh = new THREE.Mesh(tailGeo, hairMat);
      tailMesh.position.set(0, 1.75, -0.32);
      tailMesh.rotation.x = -0.75; // Arching backwards
      this.hairNode.add(tailMesh);

      // Flying Ribbon (红飘带)
      const ribbonGeo = new THREE.BoxGeometry(0.035, 0.45, 0.005);
      const ribbon1 = new THREE.Mesh(ribbonGeo, tieMat);
      ribbon1.position.set(-0.06, 1.78, -0.28);
      ribbon1.rotation.set(-0.6, 0.2, -0.3);
      this.hairNode.add(ribbon1);
    } else if (this.hairStyle === "daoist_topknot") {
      // 成男仙尊束发道髻 + 3D 碧玉发簪
      const bunGeo = new THREE.SphereGeometry(0.07, 10, 8);
      const bunMesh = new THREE.Mesh(bunGeo, hairMat);
      bunMesh.position.set(0, 1.98, -0.02);
      this.hairNode.add(bunMesh);

      // Jade Hairpin (碧玉簪)
      const jadeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2 });
      const pinGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6);
      const pinMesh = new THREE.Mesh(pinGeo, jadeMat);
      pinMesh.rotation.z = Math.PI / 2;
      pinMesh.position.set(0, 1.99, -0.01);
      this.hairNode.add(pinMesh);

      // Cascading back hair
      const backHairGeo = new THREE.BoxGeometry(0.24, 0.52, 0.04);
      const backHair = new THREE.Mesh(backHairGeo, hairMat);
      backHair.position.set(0, 1.54, -0.12);
      this.hairNode.add(backHair);
    } else if (this.hairStyle === "celestial_buns") {
      // 仙子流仙双髻 + 3D 紫霞发饰飘带
      const fairyRibbonMat = new THREE.MeshStandardMaterial({ color: this.accentColor });
      const bunGeo = new THREE.SphereGeometry(0.065, 8, 8);

      const bunL = new THREE.Mesh(bunGeo, hairMat);
      bunL.position.set(-0.11, 1.92, -0.02);
      this.hairNode.add(bunL);

      const bunR = new THREE.Mesh(bunGeo, hairMat);
      bunR.position.set(0.11, 1.92, -0.02);
      this.hairNode.add(bunR);

      // Long Silk Hair Strands falling past shoulders
      const strandGeo = new THREE.BoxGeometry(0.045, 0.65, 0.02);
      const strandL = new THREE.Mesh(strandGeo, hairMat);
      strandL.position.set(-0.12, 1.45, 0.06);
      this.hairNode.add(strandL);

      const strandR = new THREE.Mesh(strandGeo, hairMat);
      strandR.position.set(0.12, 1.45, 0.06);
      this.hairNode.add(strandR);
    } else {
      // 蛮荒狂野发型 (Spiky wild hair)
      for (let s = 0; s < 7; s++) {
        const spikeGeo = new THREE.ConeGeometry(0.045, 0.32, 5);
        const spike = new THREE.Mesh(spikeGeo, hairMat);
        const angle = (s / 7) * Math.PI * 1.6 - Math.PI * 0.8;
        spike.position.set(Math.sin(angle) * 0.14, 1.85 + Math.cos(angle) * 0.08, -0.08);
        spike.rotation.set(-0.4, 0, -angle * 0.8);
        this.hairNode.add(spike);
      }
    }
  }

  /**
   * 4. 3D 配套华美服饰 (Costumes & Robes)
   */
  private buildCostume(): void {
    const robePrimaryMat = new THREE.MeshStandardMaterial({
      color: this.primaryColor,
      roughness: 0.6
    });
    const robeAccentMat = new THREE.MeshStandardMaterial({
      color: this.accentColor,
      roughness: 0.4,
      metalness: 0.2
    });

    const isFemale = this.gender === "female";

    // 3D Outer Robe / Mantle (外套衣袍)
    const robeH = isFemale ? 0.75 : 0.82;
    const robeW = isFemale ? 0.38 : 0.46;
    const robeGeo = new THREE.CylinderGeometry(robeW * 0.75, robeW * 1.3, robeH, 12, 1, true);
    const robeMesh = new THREE.Mesh(robeGeo, robePrimaryMat);
    robeMesh.position.set(0, 0.82, 0);
    this.outfitNode.add(robeMesh);

    // 3D Layered Lapels (交领衣襟)
    const lapelGeo = new THREE.BoxGeometry(robeW * 0.6, 0.28, 0.03);
    const lapelL = new THREE.Mesh(lapelGeo, robeAccentMat);
    lapelL.position.set(-0.06, 1.34, 0.12);
    lapelL.rotation.z = -0.35;
    this.outfitNode.add(lapelL);

    const lapelR = new THREE.Mesh(lapelGeo, robeAccentMat);
    lapelR.position.set(0.06, 1.34, 0.12);
    lapelR.rotation.z = 0.35;
    this.outfitNode.add(lapelR);

    // 3D Waist Sash & Jade Pendant (腰封玉佩)
    const beltGeo = new THREE.CylinderGeometry(robeW * 0.82, robeW * 0.82, 0.09, 12);
    const beltMesh = new THREE.Mesh(beltGeo, robeAccentMat);
    beltMesh.position.set(0, 1.15, 0);
    this.outfitNode.add(beltMesh);

    // Jade Ring Pendant (环佩)
    const jadePendant = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
    jadePendant.position.set(0.08, 1.05, 0.18);
    this.outfitNode.add(jadePendant);

    // 3D Flowing Sleeves (立体广袖)
    const sleeveGeo = new THREE.CylinderGeometry(0.08, 0.18, 0.38, 8);
    const sleeveL = new THREE.Mesh(sleeveGeo, robePrimaryMat);
    sleeveL.position.set(-0.28, 1.12, 0);
    sleeveL.rotation.z = -0.25;
    this.outfitNode.add(sleeveL);

    const sleeveR = new THREE.Mesh(sleeveGeo, robePrimaryMat);
    sleeveR.position.set(0.28, 1.12, 0);
    sleeveR.rotation.z = 0.25;
    this.outfitNode.add(sleeveR);
  }

  /**
   * 5. 3D 配套神兵法宝 (Weapons & Artifacts)
   */
  private buildWeapon(): void {
    if (this.weaponType === "none") return;

    if (this.weaponType === "totem_cleaver") {
      // 蛮神巨石裂山战刃
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.9 });
      const runeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Glowing amber runes

      const bladeGeo = new THREE.BoxGeometry(0.18, 1.10, 0.05);
      const bladeMesh = new THREE.Mesh(bladeGeo, stoneMat);
      bladeMesh.position.set(0.42, 0.95, 0.32);
      bladeMesh.rotation.z = -0.15;
      this.weaponNode.add(bladeMesh);

      const runeGeo = new THREE.BoxGeometry(0.06, 0.85, 0.055);
      const runeMesh = new THREE.Mesh(runeGeo, runeMat);
      runeMesh.position.set(0.42, 0.95, 0.32);
      runeMesh.rotation.z = -0.15;
      this.weaponNode.add(runeMesh);

      this.root.add(this.weaponNode);
      return;
    }

    // 3D Spirit Flying Sword (青竹蜂云剑 / 赤阳神剑 / 冰魄神剑)
    const bladeColor = this.weaponType === "sword_flame" ? 0xef4444 : this.weaponType === "sword_ice" ? 0x67e8f9 : 0x10b981;
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: bladeColor, metalness: 0.6, roughness: 0.1 });

    const swordGroup = new THREE.Group();

    // Double-edged 3D Blade (双刃立体剑身)
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.85, 0.015);
    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    bladeMesh.position.set(0, 0.48, 0);
    swordGroup.add(bladeMesh);

    // Blade Tip (剑尖菱形锥)
    const tipGeo = new THREE.ConeGeometry(0.035, 0.14, 4);
    const tipMesh = new THREE.Mesh(tipGeo, bladeMat);
    tipMesh.position.set(0, 0.96, 0);
    swordGroup.add(tipMesh);

    // Crossguard (剑格护手)
    const guardGeo = new THREE.BoxGeometry(0.16, 0.03, 0.035);
    const guardMesh = new THREE.Mesh(guardGeo, goldMat);
    guardMesh.position.set(0, 0.06, 0);
    swordGroup.add(guardMesh);

    // Hilt / Grip (剑柄)
    const gripGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8);
    const gripMesh = new THREE.Mesh(gripGeo, new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    gripMesh.position.set(0, -0.04, 0);
    swordGroup.add(gripMesh);

    // Pommel (剑首)
    const pommelGeo = new THREE.SphereGeometry(0.025, 8, 6);
    const pommelMesh = new THREE.Mesh(pommelGeo, goldMat);
    pommelMesh.position.set(0, -0.13, 0);
    swordGroup.add(pommelMesh);

    // Position sword in hand
    swordGroup.position.set(0.38, 0.85, 0.25);
    swordGroup.rotation.set(0.4, 0, -0.25);
    this.weaponNode.add(swordGroup);
    this.root.add(this.weaponNode);
  }

  /**
   * 动态设置 3D 表情情感 (Emotions)
   */
  setEmotion(emotion: Emotion3D): void {
    this.currentEmotion = emotion;

    if (emotion === "battle") {
      // 战意坚毅: 剑眉下倾，双目微凝，唇线紧闭
      this.leftBrowMesh.rotation.z = -0.35;
      this.leftBrowMesh.position.y = 1.77 + 0.028;
      this.rightBrowMesh.rotation.z = 0.35;
      this.rightBrowMesh.position.y = 1.77 + 0.028;
      this.leftEyeMesh.scale.set(1.0, 0.82, 1.0);
      this.rightEyeMesh.scale.set(1.0, 0.82, 1.0);
    } else if (emotion === "angry") {
      // 震怒叱咤: 眉头深锁，眉峰倒竖
      this.leftBrowMesh.rotation.z = -0.52;
      this.leftBrowMesh.position.y = 1.77 + 0.022;
      this.rightBrowMesh.rotation.z = 0.52;
      this.rightBrowMesh.position.y = 1.77 + 0.022;
      this.leftEyeMesh.scale.set(1.05, 1.05, 1.0);
      this.rightEyeMesh.scale.set(1.05, 1.05, 1.0);
    } else if (emotion === "happy") {
      // 舒展从容微笑: 眉目舒展，嘴角上翘
      this.leftBrowMesh.rotation.z = 0.15;
      this.leftBrowMesh.position.y = 1.77 + 0.042;
      this.rightBrowMesh.rotation.z = -0.15;
      this.rightBrowMesh.position.y = 1.77 + 0.042;
      this.leftEyeMesh.scale.set(1.0, 0.90, 1.0);
      this.rightEyeMesh.scale.set(1.0, 0.90, 1.0);
      this.upperLipMesh.position.y = 1.675;
    } else if (emotion === "shocked") {
      // 震惊骇然: 眉峰上挑，圆睁双目
      this.leftBrowMesh.rotation.z = 0.32;
      this.leftBrowMesh.position.y = 1.77 + 0.052;
      this.rightBrowMesh.rotation.z = -0.32;
      this.rightBrowMesh.position.y = 1.77 + 0.052;
      this.leftEyeMesh.scale.set(1.25, 1.25, 1.0);
      this.rightEyeMesh.scale.set(1.25, 1.25, 1.0);
    } else {
      // Neutral: 自然舒展
      this.leftBrowMesh.rotation.z = -0.05;
      this.leftBrowMesh.position.y = 1.77 + 0.038;
      this.rightBrowMesh.rotation.z = 0.05;
      this.rightBrowMesh.position.y = 1.77 + 0.038;
      this.leftEyeMesh.scale.set(1.0, 1.0, 1.0);
      this.rightEyeMesh.scale.set(1.0, 1.0, 1.0);
    }
  }

  /**
   * 动态设置 3D 对白口型 (Visemes)
   */
  setViseme(viseme: Viseme3D, openness = 0.5): void {
    this.currentViseme = viseme;
    this.visemeOpenness = openness;

    const baseUpperY = 1.67;
    const baseLowerY = 1.658;
    const gap = 0.025 * openness;

    if (viseme === "a") {
      // 口型大张
      this.upperLipMesh.position.y = baseUpperY + gap * 0.4;
      this.lowerLipMesh.position.y = baseLowerY - gap * 0.8;
      this.lowerLipMesh.scale.set(0.9, 1.4, 1.0);
    } else if (viseme === "o" || viseme === "u") {
      // 缩圆小张
      this.upperLipMesh.position.y = baseUpperY + gap * 0.25;
      this.lowerLipMesh.position.y = baseLowerY - gap * 0.4;
      this.upperLipMesh.scale.set(0.65, 1.0, 1.0);
      this.lowerLipMesh.scale.set(0.65, 1.0, 1.0);
    } else if (viseme === "i" || viseme === "e") {
      // 横向扁平张口
      this.upperLipMesh.position.y = baseUpperY + gap * 0.15;
      this.lowerLipMesh.position.y = baseLowerY - gap * 0.25;
      this.upperLipMesh.scale.set(1.3, 0.8, 1.0);
      this.lowerLipMesh.scale.set(1.3, 0.8, 1.0);
    } else {
      // silence / m: 闭口
      this.upperLipMesh.position.y = baseUpperY;
      this.lowerLipMesh.position.y = baseLowerY;
      this.upperLipMesh.scale.set(1.0, 1.0, 1.0);
      this.lowerLipMesh.scale.set(1.0, 1.0, 1.0);
    }
  }
}
