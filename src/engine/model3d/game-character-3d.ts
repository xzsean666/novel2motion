import * as THREE from "three";
import {
  Gender3D,
  FaceShape3D,
  Emotion3D,
  Viseme3D,
  HairStyle3D,
  Outfit3D,
  Weapon3D,
  Pose3D,
  GameCharacter3DConfig
} from "./types.js";

function parseHexColor(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const normalized = value.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? parseInt(normalized, 16) : fallback;
}

/**
 * GameCharacter3D: Genuine 3D Humanoid Game Character Model System in Three.js
 * Provides authentic 3D humanoid anatomy (Male & Female), sculpted face shapes,
 * dynamic facial emotions, lip-synced visemes, layered outfits, hairstyles, and weapons.
 */
export class GameCharacter3D {
  readonly config: GameCharacter3DConfig;
  readonly root: THREE.Group;

  // Major 3D Skeletal Nodes
  readonly pelvisNode: THREE.Group;
  readonly spineNode: THREE.Group;
  readonly chestNode: THREE.Group;
  readonly neckNode: THREE.Group;
  readonly headNode: THREE.Group;

  readonly faceNode: THREE.Group;
  readonly eyesNode: THREE.Group;
  readonly eyebrowsNode: THREE.Group;
  readonly mouthNode: THREE.Group;
  readonly hairNode: THREE.Group;

  readonly shoulderLNode: THREE.Group;
  readonly armLNode: THREE.Group;
  readonly forearmLNode: THREE.Group;
  readonly handLNode: THREE.Group;

  readonly shoulderRNode: THREE.Group;
  readonly armRNode: THREE.Group;
  readonly forearmRNode: THREE.Group;
  readonly handRNode: THREE.Group;

  readonly thighLNode: THREE.Group;
  readonly calfLNode: THREE.Group;
  readonly footLNode: THREE.Group;

  readonly thighRNode: THREE.Group;
  readonly calfRNode: THREE.Group;
  readonly footRNode: THREE.Group;

  readonly costumeNode: THREE.Group;
  readonly weaponNode: THREE.Group;
  readonly mountNode: THREE.Group;

  // Facial feature meshes for emotion / viseme morphing
  private leftBrowMesh!: THREE.Mesh;
  private rightBrowMesh!: THREE.Mesh;
  private leftEyeGroup!: THREE.Group;
  private rightEyeGroup!: THREE.Group;
  private upperLipMesh!: THREE.Mesh;
  private lowerLipMesh!: THREE.Mesh;
  private oralCavityMesh!: THREE.Mesh;
  private teethMesh!: THREE.Mesh;
  private jawMesh!: THREE.Mesh;

  // State
  private currentEmotion: Emotion3D = "neutral";
  private currentViseme: Viseme3D = "silence";
  private currentPose: Pose3D = "idle_stand";
  private facing: "left" | "right" = "right";

  constructor(config: GameCharacter3DConfig) {
    this.config = config;
    this.facing = config.facing ?? "right";

    this.root = new THREE.Group();
    this.root.name = `GameChar3D_${config.id}`;
    this.root.scale.setScalar(Math.max(0.5, Math.min(1.8, config.heightScale ?? 1)));

    // 1. Initialize Skeleton Nodes
    this.pelvisNode = new THREE.Group();
    this.spineNode = new THREE.Group();
    this.chestNode = new THREE.Group();
    this.neckNode = new THREE.Group();
    this.headNode = new THREE.Group();

    this.faceNode = new THREE.Group();
    this.eyesNode = new THREE.Group();
    this.eyebrowsNode = new THREE.Group();
    this.mouthNode = new THREE.Group();
    this.hairNode = new THREE.Group();

    this.shoulderLNode = new THREE.Group();
    this.armLNode = new THREE.Group();
    this.forearmLNode = new THREE.Group();
    this.handLNode = new THREE.Group();

    this.shoulderRNode = new THREE.Group();
    this.armRNode = new THREE.Group();
    this.forearmRNode = new THREE.Group();
    this.handRNode = new THREE.Group();

    this.thighLNode = new THREE.Group();
    this.calfLNode = new THREE.Group();
    this.footLNode = new THREE.Group();

    this.thighRNode = new THREE.Group();
    this.calfRNode = new THREE.Group();
    this.footRNode = new THREE.Group();

    this.costumeNode = new THREE.Group();
    this.weaponNode = new THREE.Group();
    this.mountNode = new THREE.Group();

    // 2. Assemble 3D Skeletal Hierarchy
    this.root.add(this.pelvisNode);
    this.root.add(this.mountNode);

    this.pelvisNode.add(this.spineNode);
    this.spineNode.add(this.chestNode);
    this.chestNode.add(this.neckNode);
    this.neckNode.add(this.headNode);

    this.headNode.add(this.faceNode);
    this.headNode.add(this.hairNode);
    this.faceNode.add(this.eyesNode);
    this.faceNode.add(this.eyebrowsNode);
    this.faceNode.add(this.mouthNode);

    // Left Arm Chain
    this.chestNode.add(this.shoulderLNode);
    this.shoulderLNode.add(this.armLNode);
    this.armLNode.add(this.forearmLNode);
    this.forearmLNode.add(this.handLNode);

    // Right Arm Chain
    this.chestNode.add(this.shoulderRNode);
    this.shoulderRNode.add(this.armRNode);
    this.armRNode.add(this.forearmRNode);
    this.forearmRNode.add(this.handRNode);
    this.handRNode.add(this.weaponNode);

    // Left Leg Chain
    this.pelvisNode.add(this.thighLNode);
    this.thighLNode.add(this.calfLNode);
    this.calfLNode.add(this.footLNode);

    // Right Leg Chain
    this.pelvisNode.add(this.thighRNode);
    this.thighRNode.add(this.calfRNode);
    this.calfRNode.add(this.footRNode);

    // Costumes attach to spine & chest
    this.spineNode.add(this.costumeNode);

    // 3. Build Meshes with anatomical topology & cel-shading materials
    this.buildBodyMeshes();
    this.buildFacialMeshes();
    this.buildHairMeshes();
    this.buildCostumeMeshes();
    this.buildWeaponMesh();
    this.buildMountMesh();

    // 4. Initial Pose & Emotion
    this.setFacing(this.facing);
    this.setPose(config.pose ?? "idle_stand");
    this.setEmotion(config.emotion ?? "neutral");
    this.setViseme(config.viseme ?? "silence", config.visemeOpenness ?? 0);
  }

  /**
   * 1. 3D 身体解剖结构 (Male vs Female 3D Body Anatomy)
   */
  private buildBodyMeshes(): void {
    const isFemale = this.config.gender === "female";
    const isMuscular = this.config.faceShape === "male_muscular";

    const skinColorHex = this.config.colors?.skinTone
      ? parseHexColor(this.config.colors.skinTone, isFemale ? 0xffeedd : isMuscular ? 0xd49b70 : 0xffe4cc)
      : isFemale
      ? 0xffeedd
      : isMuscular
      ? 0xd49b70
      : 0xffe4cc;

    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColorHex,
      roughness: 0.55,
      metalness: 0.05
    });

    // Anatomical Proportions
    const chestW = isFemale ? 0.32 : isMuscular ? 0.48 : 0.40;
    const chestH = isFemale ? 0.30 : isMuscular ? 0.38 : 0.34;
    const chestD = isFemale ? 0.22 : isMuscular ? 0.30 : 0.26;

    // Pelvis
    const pelvisW = isFemale ? 0.34 : isMuscular ? 0.38 : 0.34;
    const pelvisGeo = new THREE.CylinderGeometry(pelvisW * 0.48, pelvisW * 0.44, 0.18, 20);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, skinMat);
    this.pelvisNode.position.set(0, 0.98, 0);
    this.pelvisNode.add(pelvisMesh);

    // Spine & Waist
    const waistW = isFemale ? 0.24 : isMuscular ? 0.34 : 0.28;
    const waistGeo = new THREE.CylinderGeometry(waistW * 0.50, pelvisW * 0.48, 0.20, 20);
    const waistMesh = new THREE.Mesh(waistGeo, skinMat);
    this.spineNode.position.set(0, 0.16, 0);
    this.spineNode.add(waistMesh);

    // Chest & Ribcage (Pectorals vs Feminine Bust)
    const chestGeo = new THREE.CylinderGeometry(chestW * 0.50, waistW * 0.50, chestH, 24);
    chestGeo.scale(1.0, 1.0, chestD / chestW);
    const chestMesh = new THREE.Mesh(chestGeo, skinMat);
    this.chestNode.position.set(0, 0.24, 0);
    this.chestNode.add(chestMesh);

    if (isFemale) {
      // Feminine bust curves
      const bustGeo = new THREE.SphereGeometry(0.088, 16, 12);
      bustGeo.scale(1.0, 0.90, 1.15);
      const bustL = new THREE.Mesh(bustGeo, skinMat);
      bustL.position.set(-0.078, 0.05, 0.12);
      this.chestNode.add(bustL);

      const bustR = new THREE.Mesh(bustGeo, skinMat);
      bustR.position.set(0.078, 0.05, 0.12);
      this.chestNode.add(bustR);
    }

    // Neck
    const neckR = isFemale ? 0.052 : isMuscular ? 0.082 : 0.065;
    const neckGeo = new THREE.CylinderGeometry(neckR, neckR * 1.08, 0.14, 20);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    this.neckNode.position.set(0, chestH * 0.5 + 0.06, 0);
    this.neckNode.add(neckMesh);

    // Head Cranium
    const headW = isFemale ? 0.22 : isMuscular ? 0.26 : 0.235;
    const headH = isFemale ? 0.27 : isMuscular ? 0.30 : 0.28;
    const headD = isFemale ? 0.22 : isMuscular ? 0.26 : 0.24;

    const headGeo = new THREE.SphereGeometry(headW * 0.72, 24, 18);
    headGeo.scale(1.0, headH / (headW * 0.72), headD / (headW * 0.72));
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headNode.position.set(0, 0.16, 0);
    this.headNode.add(headMesh);

    // Sculpted Jawline (Distinct Face Topology)
    const jawGeo = new THREE.ConeGeometry(headW * 0.44, 0.17, 16);
    jawGeo.scale(1.0, 1.0, 0.72);
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.rotation.x = Math.PI - 0.28;
    jawMesh.position.set(0, -0.065, 0.08);
    this.headNode.add(jawMesh);
    this.jawMesh = jawMesh;

    // Arms
    const armR = isFemale ? 0.046 : isMuscular ? 0.085 : 0.058;
    const armGeo = new THREE.CylinderGeometry(armR, armR * 0.88, 0.32, 16);
    const forearmGeo = new THREE.CylinderGeometry(armR * 0.88, armR * 0.75, 0.30, 16);
    const handGeo = new THREE.BoxGeometry(armR * 1.3, 0.08, armR * 0.75);

    // Left Arm Setup
    this.shoulderLNode.position.set(-chestW * 0.55, 0.08, 0);
    const armLMesh = new THREE.Mesh(armGeo, skinMat);
    armLMesh.position.set(0, -0.16, 0);
    this.armLNode.add(armLMesh);
    this.shoulderLNode.add(this.armLNode);

    this.armLNode.position.set(0, 0, 0);
    this.forearmLNode.position.set(0, -0.32, 0);
    const forearmLMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmLMesh.position.set(0, -0.15, 0);
    this.forearmLNode.add(forearmLMesh);

    this.handLNode.position.set(0, -0.30, 0);
    const handLMesh = new THREE.Mesh(handGeo, skinMat);
    this.handLNode.add(handLMesh);

    // Right Arm Setup
    this.shoulderRNode.position.set(chestW * 0.55, 0.08, 0);
    const armRMesh = new THREE.Mesh(armGeo, skinMat);
    armRMesh.position.set(0, -0.16, 0);
    this.armRNode.add(armRMesh);
    this.shoulderRNode.add(this.armRNode);

    this.armRNode.position.set(0, 0, 0);
    this.forearmRNode.position.set(0, -0.32, 0);
    const forearmRMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmRMesh.position.set(0, -0.15, 0);
    this.forearmRNode.add(forearmRMesh);

    this.handRNode.position.set(0, -0.30, 0);
    const handRMesh = new THREE.Mesh(handGeo, skinMat);
    this.handRNode.add(handRMesh);

    // Legs
    const legR = isFemale ? 0.062 : isMuscular ? 0.105 : 0.078;
    const thighGeo = new THREE.CylinderGeometry(legR, legR * 0.85, 0.44, 16);
    const calfGeo = new THREE.CylinderGeometry(legR * 0.85, legR * 0.72, 0.42, 16);
    const legSpacing = chestW * 0.28;

    this.thighLNode.position.set(-legSpacing, -0.06, 0);
    const thighLMesh = new THREE.Mesh(thighGeo, skinMat);
    thighLMesh.position.set(0, -0.22, 0);
    this.thighLNode.add(thighLMesh);

    this.calfLNode.position.set(0, -0.44, 0);
    const calfLMesh = new THREE.Mesh(calfGeo, skinMat);
    calfLMesh.position.set(0, -0.21, 0);
    this.calfLNode.add(calfLMesh);

    this.footLNode.position.set(0, -0.42, 0.04);
    const bootGeo = new THREE.BoxGeometry(legR * 1.8, 0.12, legR * 2.8);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const bootL = new THREE.Mesh(bootGeo, bootMat);
    this.footLNode.add(bootL);

    this.thighRNode.position.set(legSpacing, -0.06, 0);
    const thighRMesh = new THREE.Mesh(thighGeo, skinMat);
    thighRMesh.position.set(0, -0.22, 0);
    this.thighRNode.add(thighRMesh);

    this.calfRNode.position.set(0, -0.44, 0);
    const calfRMesh = new THREE.Mesh(calfGeo, skinMat);
    calfRMesh.position.set(0, -0.21, 0);
    this.calfRNode.add(calfRMesh);

    this.footRNode.position.set(0, -0.42, 0.04);
    const bootR = new THREE.Mesh(bootGeo, bootMat);
    this.footRNode.add(bootR);
  }

  /**
   * 2. 3D 脸型、五官与情感系统 (Anime Face, Expressive 3D Eyes, Eyebrows, Lips)
   */
  private buildFacialMeshes(): void {
    const isFemale = this.config.gender === "female";

    // 3D Nose Bridge & Tip
    const noseMat = new THREE.MeshStandardMaterial({
      color: isFemale ? 0xffdfd0 : 0xf2caa7,
      roughness: 0.55
    });
    const noseGeo = new THREE.ConeGeometry(isFemale ? 0.015 : 0.024, isFemale ? 0.065 : 0.08, 8);
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    // Face features sit in front of the cranium surface so the CPU rasterizer
    // and WebGL renderer agree on the visible facial layer.
    noseMesh.position.set(0, -0.016, 0.235);
    noseMesh.rotation.x = 0.24;
    this.faceNode.add(noseMesh);

    // 3D Stylized Anime Eyes
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xfdfdfd });
    const irisColor = isFemale ? 0x9333ea : this.config.faceShape === "male_shonen" ? 0xd97706 : 0x0284c7;
    const irisMat = new THREE.MeshBasicMaterial({ color: irisColor });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lashMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });

    const eyeR = isFemale ? 0.030 : 0.026;
    const eyeSpacing = isFemale ? 0.064 : 0.072;
    const eyeY = 0.022;
    const eyeZ = 0.225;

    // Left Eye
    this.leftEyeGroup = new THREE.Group();
    this.leftEyeGroup.position.set(-eyeSpacing, eyeY, eyeZ);

    const whiteL = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 16, 12), eyeWhiteMat);
    whiteL.scale.set(1.15, 0.88, 0.6);
    this.leftEyeGroup.add(whiteL);

    const irisL = new THREE.Mesh(new THREE.CircleGeometry(eyeR * 0.72, 16), irisMat);
    irisL.position.set(0, 0, eyeR * 0.58);
    this.leftEyeGroup.add(irisL);

    const pupilL = new THREE.Mesh(new THREE.CircleGeometry(eyeR * 0.36, 14), pupilMat);
    pupilL.position.set(0, 0, eyeR * 0.60);
    this.leftEyeGroup.add(pupilL);

    const sparkL = new THREE.Mesh(new THREE.CircleGeometry(eyeR * 0.20, 10), sparkMat);
    sparkL.position.set(eyeR * 0.25, eyeR * 0.22, eyeR * 0.62);
    this.leftEyeGroup.add(sparkL);

    const lashGeoL = new THREE.TorusGeometry(eyeR * 1.15, 0.0055, 8, 16, Math.PI * 0.75);
    const lashL = new THREE.Mesh(lashGeoL, lashMat);
    lashL.rotation.z = Math.PI * 0.13;
    lashL.position.set(0, eyeR * 0.40, eyeR * 0.60);
    this.leftEyeGroup.add(lashL);

    this.eyesNode.add(this.leftEyeGroup);

    // Right Eye
    this.rightEyeGroup = new THREE.Group();
    this.rightEyeGroup.position.set(eyeSpacing, eyeY, eyeZ);

    const whiteR = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 16, 12), eyeWhiteMat);
    whiteR.scale.set(1.15, 0.88, 0.6);
    this.rightEyeGroup.add(whiteR);

    const irisR = new THREE.Mesh(new THREE.CircleGeometry(eyeR * 0.72, 16), irisMat);
    irisR.position.set(0, 0, eyeR * 0.58);
    this.rightEyeGroup.add(irisR);

    const pupilR = new THREE.Mesh(new THREE.CircleGeometry(eyeR * 0.36, 14), pupilMat);
    pupilR.position.set(0, 0, eyeR * 0.60);
    this.rightEyeGroup.add(pupilR);

    const sparkR = new THREE.Mesh(new THREE.CircleGeometry(eyeR * 0.20, 10), sparkMat);
    sparkR.position.set(eyeR * 0.25, eyeR * 0.22, eyeR * 0.62);
    this.rightEyeGroup.add(sparkR);

    const lashGeoR = new THREE.TorusGeometry(eyeR * 1.15, 0.0055, 8, 16, Math.PI * 0.75);
    const lashR = new THREE.Mesh(lashGeoR, lashMat);
    lashR.rotation.z = Math.PI * 0.12;
    lashR.position.set(0, eyeR * 0.40, eyeR * 0.60);
    this.rightEyeGroup.add(lashR);

    this.eyesNode.add(this.rightEyeGroup);

    // 3D Eyebrows (Dynamic for emotions)
    const hairColorHex = this.config.colors?.hairColor
      ? parseInt(this.config.colors.hairColor.replace("#", ""), 16)
      : isFemale
      ? 0x2e1065
      : 0x1e293b;
    const browMat = new THREE.MeshBasicMaterial({ color: hairColorHex });
    const browGeo = new THREE.BoxGeometry(0.062, 0.009, 0.015);

    this.leftBrowMesh = new THREE.Mesh(browGeo, browMat);
    this.leftBrowMesh.position.set(-eyeSpacing, eyeY + 0.040, eyeZ + 0.012);
    this.eyebrowsNode.add(this.leftBrowMesh);

    this.rightBrowMesh = new THREE.Mesh(browGeo, browMat);
    this.rightBrowMesh.position.set(eyeSpacing, eyeY + 0.040, eyeZ + 0.012);
    this.eyebrowsNode.add(this.rightBrowMesh);

    // 3D Mouth & Speaking Lips (Morphable for Visemes)
    const lipMat = new THREE.MeshStandardMaterial({
      color: isFemale ? 0xf43f5e : 0xb91c1c,
      roughness: 0.35
    });

    const lipW = isFemale ? 0.048 : 0.058;
    this.upperLipMesh = new THREE.Mesh(new THREE.BoxGeometry(lipW, 0.008, 0.014), lipMat);
    this.upperLipMesh.position.set(0, -0.066, 0.232);
    this.mouthNode.add(this.upperLipMesh);

    this.lowerLipMesh = new THREE.Mesh(new THREE.BoxGeometry(lipW, 0.009, 0.014), lipMat);
    this.lowerLipMesh.position.set(0, -0.080, 0.229);
    this.mouthNode.add(this.lowerLipMesh);

    // Oral cavity & pearlescent teeth
    this.oralCavityMesh = new THREE.Mesh(
      new THREE.BoxGeometry(lipW * 0.85, 0.01, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x450a0a })
    );
    this.oralCavityMesh.position.set(0, -0.073, 0.224);
    this.oralCavityMesh.visible = false;
    this.mouthNode.add(this.oralCavityMesh);

    this.teethMesh = new THREE.Mesh(
      new THREE.BoxGeometry(lipW * 0.75, 0.007, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.teethMesh.position.set(0, -0.070, 0.227);
    this.teethMesh.visible = false;
    this.mouthNode.add(this.teethMesh);
  }

  /**
   * 3. 3D 配套发型 (Hair Style & Accessories)
   */
  private buildHairMeshes(): void {
    const hairColorHex = this.config.colors?.hairColor
      ? parseInt(this.config.colors.hairColor.replace("#", ""), 16)
      : this.config.gender === "female"
      ? 0x1e1b4b
      : this.config.faceShape === "male_muscular"
      ? 0x0f172a
      : 0x18181b;

    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColorHex,
      roughness: 0.65,
      metalness: 0.1
    });

    // Hair Cranium Cap
    const capGeo = new THREE.SphereGeometry(0.185, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.set(0, 0.035, -0.015);
    this.hairNode.add(capMesh);

    // Bangs / Front Locks
    for (const x of [-0.07, -0.02, 0.03, 0.07]) {
      const bangGeo = new THREE.ConeGeometry(0.026, 0.12, 8);
      const bang = new THREE.Mesh(bangGeo, hairMat);
      bang.rotation.z = x * 1.5;
      bang.rotation.x = 0.35;
      bang.position.set(x, 0.08, 0.22);
      this.hairNode.add(bang);
    }

    if (this.config.hairStyle === "high_ponytail") {
      // 少年高马尾 + 3D 红发带
      const tieMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
      const tieRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 8, 16), tieMat);
      tieRing.position.set(0, 0.16, -0.14);
      this.hairNode.add(tieRing);

      const ponyGeo = new THREE.ConeGeometry(0.08, 0.52, 12);
      ponyGeo.scale(1.0, 1.0, 0.7);
      const ponytail = new THREE.Mesh(ponyGeo, hairMat);
      ponytail.rotation.x = -0.55;
      ponytail.position.set(0, -0.02, -0.26);
      this.hairNode.add(ponytail);

      for (const rx of [-0.03, 0.03]) {
        const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.38, 0.005), tieMat);
        ribbon.rotation.x = -0.45;
        ribbon.rotation.z = rx * 2;
        ribbon.position.set(rx, 0.01, -0.22);
        this.hairNode.add(ribbon);
      }
    } else if (this.config.hairStyle === "celestial_buns") {
      // 仙子流仙双髻 + 金钗飘带
      const bunGeo = new THREE.TorusGeometry(0.065, 0.032, 10, 16);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 });

      for (const bSide of [-1, 1]) {
        const bun = new THREE.Mesh(bunGeo, hairMat);
        bun.position.set(bSide * 0.12, 0.16, -0.02);
        bun.rotation.y = bSide * 0.35;
        this.hairNode.add(bun);

        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 8), goldMat);
        pin.rotation.z = bSide * 0.8;
        pin.position.set(bSide * 0.14, 0.18, 0.02);
        this.hairNode.add(pin);

        const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.012, 0.55, 10), hairMat);
        lock.position.set(bSide * 0.13, -0.15, 0.04);
        this.hairNode.add(lock);
      }
    } else if (this.config.hairStyle === "daoist_topknot") {
      // 道髻 + 碧玉簪
      const knotMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 14), hairMat);
      knotMesh.position.set(0, 0.22, -0.02);
      this.hairNode.add(knotMesh);

      const jadeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.25, metalness: 0.1 });
      const jadePin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 8), jadeMat);
      jadePin.rotation.z = Math.PI / 2;
      jadePin.position.set(0, 0.22, 0.01);
      this.hairNode.add(jadePin);
    } else if (this.config.hairStyle === "barbarian_wild") {
      // 蛮荒狂野棘发
      for (const angle of [0, 0.8, -0.8, 1.6, -1.6]) {
        const spikeGeo = new THREE.ConeGeometry(0.055, 0.28, 8);
        const spike = new THREE.Mesh(spikeGeo, hairMat);
        spike.rotation.z = angle;
        spike.rotation.x = -0.35;
        spike.position.set(angle * 0.10, 0.18, -0.05);
        this.hairNode.add(spike);
      }
    }
  }

  /**
   * 4. 3D 配套服饰 (Layered Outfits)
   */
  private buildCostumeMeshes(): void {
    const isFemale = this.config.gender === "female";
    const chestW = isFemale ? 0.32 : this.config.faceShape === "male_muscular" ? 0.48 : 0.40;
    const chestH = isFemale ? 0.30 : this.config.faceShape === "male_muscular" ? 0.38 : 0.34;
    const chestD = isFemale ? 0.22 : this.config.faceShape === "male_muscular" ? 0.30 : 0.26;

    let robeColor = 0x059669; // Emerald Daoist
    let accentColor = 0xf59e0b; // Gold trim
    if (this.config.outfit === "fairy_silks") {
      robeColor = 0x9333ea; // Lavender purple
      accentColor = 0x38bdf8; // Ice blue
    } else if (this.config.outfit === "shonen_battlegarb") {
      robeColor = 0xdc2626; // Crimson red
      accentColor = 0xf59e0b; // Gold
    } else if (this.config.outfit === "barbarian_armor") {
      robeColor = 0x78350f; // Leather brown
      accentColor = 0xd97706; // Bronze
    }
    robeColor = parseHexColor(this.config.colors?.primaryCostume, robeColor);
    accentColor = parseHexColor(this.config.colors?.accentCostume, accentColor);

    const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.3 });

    // Main Robe / Tunic Torso
    const robeTorso = new THREE.Mesh(new THREE.CylinderGeometry(chestW * 0.54, chestW * 0.48, chestH * 1.05, 24), robeMat);
    robeTorso.scale.set(1.0, 1.0, (chestD / chestW) * 1.08);
    robeTorso.position.set(0, 0.24, 0);
    this.costumeNode.add(robeTorso);

    // V-Neck White Inner Collar
    const collarMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 4), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }));
    collarMesh.rotation.x = Math.PI;
    collarMesh.position.set(0, 0.33, 0.12);
    this.costumeNode.add(collarMesh);

    // Shoulder Guards / Pauldrons
    for (const sSide of [-1, 1]) {
      const pauldronGeo = new THREE.SphereGeometry(0.095, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const pauldron = new THREE.Mesh(pauldronGeo, trimMat);
      pauldron.rotation.z = -sSide * 0.4;
      pauldron.position.set(sSide * (chestW * 0.58), 0.36, 0);
      this.costumeNode.add(pauldron);
    }

    // Flowing Lower Skirt / Robe Hem
    const skirtGeo = new THREE.CylinderGeometry(chestW * 0.48, chestW * 0.72, 0.65, 24, 1, true);
    const skirtMesh = new THREE.Mesh(skirtGeo, robeMat);
    skirtMesh.position.set(0, -0.25, 0);
    this.costumeNode.add(skirtMesh);

    // Golden Waist Sash / Belt
    const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(chestW * 0.50, chestW * 0.50, 0.07, 24), trimMat);
    beltMesh.position.set(0, 0.05, 0);
    this.costumeNode.add(beltMesh);
  }

  /**
   * 5. 3D 配套神兵武器 (Flying Swords, Cleaver)
   */
  private buildWeaponMesh(): void {
    if (this.config.weapon === "none") return;

    let bladeColor = 0x10b981; // Cyan
    if (this.config.weapon === "sword_flame") bladeColor = 0xef4444; // Flame red
    if (this.config.weapon === "sword_ice") bladeColor = 0x38bdf8; // Ice cyan
    if (this.config.weapon === "totem_cleaver") bladeColor = 0x334155; // Stone

    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeColor,
      roughness: 0.2,
      metalness: 0.6
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 });

    if (this.config.weapon === "totem_cleaver") {
      const cleaverMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.035), bladeMat);
      cleaverMesh.position.set(0, 0.35, 0);
      this.weaponNode.add(cleaverMesh);
    } else {
      const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.85, 0.012), bladeMat);
      bladeMesh.position.set(0, 0.42, 0);
      this.weaponNode.add(bladeMesh);

      const tipMesh = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.12, 4), bladeMat);
      tipMesh.position.set(0, 0.90, 0);
      this.weaponNode.add(tipMesh);

      const guardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.024, 0.035), trimMat);
      guardMesh.position.set(0, 0.0, 0);
      this.weaponNode.add(guardMesh);

      const hiltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 10), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      hiltMesh.position.set(0, -0.09, 0);
      this.weaponNode.add(hiltMesh);
    }
  }

  /**
   * 6. 脚底灵光法宝 / 御剑底座 (Mount / Aura Base)
   */
  private buildMountMesh(): void {
    const mountType = this.config.weapon === "sword_cyan" ? "flying_sword" : "aura_ring";
    if (mountType === "flying_sword") {
      const swordBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.02, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.8 })
      );
      swordBase.position.set(0, 0.01, 0);
      this.mountNode.add(swordBase);
    }
  }

  // --- Dynamic State Controllers ---

  public setFacing(facing: "left" | "right"): void {
    this.facing = facing;
    this.root.rotation.y = facing === "left" ? -Math.PI * 0.18 : Math.PI * 0.18;
  }

  public setEmotion(emotion: Emotion3D, weight = 1): void {
    this.currentEmotion = emotion;
    if (!this.leftBrowMesh || !this.rightBrowMesh) return;

    const intensity = Math.max(0, Math.min(1, weight));
    const setBrowPose = (leftRot: number, rightRot: number, y: number) => {
      this.leftBrowMesh.rotation.z = leftRot * intensity;
      this.rightBrowMesh.rotation.z = rightRot * intensity;
      this.leftBrowMesh.position.y = 0.062 + (y - 0.062) * intensity;
      this.rightBrowMesh.position.y = 0.062 + (y - 0.062) * intensity;
    };

    if (emotion === "battle") {
      setBrowPose(-0.22, 0.22, 0.054);
    } else if (emotion === "angry") {
      setBrowPose(-0.38, 0.38, 0.048);
    } else if (emotion === "happy") {
      setBrowPose(0.15, -0.15, 0.068);
    } else if (emotion === "shocked") {
      setBrowPose(0.05, -0.05, 0.077);
    } else if (emotion === "smug") {
      setBrowPose(0.18, -0.04, 0.066);
    } else if (emotion === "hurt") {
      setBrowPose(-0.08, 0.08, 0.073);
    } else {
      setBrowPose(0, 0, 0.062);
    }
  }

  public setViseme(viseme: Viseme3D, openness = 0): void {
    this.currentViseme = viseme;
    if (!this.upperLipMesh || !this.lowerLipMesh) return;

    let effOpen = openness;
    if (effOpen === 0 && viseme !== "silence") {
      if (viseme === "a") effOpen = 0.85;
      else if (viseme === "o") effOpen = 0.70;
      else if (viseme === "e") effOpen = 0.55;
      else if (viseme === "u") effOpen = 0.45;
      else if (viseme === "i") effOpen = 0.35;
      else if (viseme === "m") effOpen = 0.05;
    }

    this.upperLipMesh.position.y = -0.066 + effOpen * 0.006;
    this.lowerLipMesh.position.y = -0.080 - effOpen * 0.024;

    if (effOpen > 0.15) {
      this.oralCavityMesh.visible = true;
      this.teethMesh.visible = true;
      this.oralCavityMesh.scale.set(1.0, effOpen * 3.0, 1.0);
    } else {
      this.oralCavityMesh.visible = false;
      this.teethMesh.visible = false;
    }
  }

  public setPose(pose: Pose3D): void {
    this.currentPose = pose;

    this.pelvisNode.position.y = 0.98;
    for (const node of [this.spineNode, this.chestNode, this.neckNode, this.headNode,
      this.armLNode, this.forearmLNode, this.handLNode,
      this.armRNode, this.forearmRNode, this.handRNode,
      this.thighLNode, this.calfLNode, this.footLNode,
      this.thighRNode, this.calfRNode, this.footRNode]) {
      node.rotation.set(0, 0, 0);
    }

    if (pose === "combat_ready") {
      this.armRNode.rotation.x = -0.65;
      this.armRNode.rotation.z = 0.35;
      this.forearmRNode.rotation.x = -0.55;

      this.armLNode.rotation.x = 0.35;
      this.armLNode.rotation.z = -0.25;

      this.thighLNode.rotation.x = 0.20;
      this.thighRNode.rotation.x = -0.15;
    } else if (pose === "sword_flight") {
      this.pelvisNode.position.y = 1.05;
      this.spineNode.rotation.x = 0.15;
      this.armLNode.rotation.z = -0.65;
      this.armRNode.rotation.z = 0.65;
    } else if (pose === "slash_strike") {
      this.spineNode.rotation.y = 0.35;
      this.armRNode.rotation.x = -1.2;
      this.armRNode.rotation.z = -0.45;
      this.forearmRNode.rotation.x = -0.3;
    } else if (pose === "cast_spell") {
      this.armLNode.rotation.x = -0.85;
      this.armLNode.rotation.z = 0.45;
      this.armRNode.rotation.x = -0.85;
      this.armRNode.rotation.z = -0.45;
    } else {
      // idle_stand
      this.armRNode.rotation.set(0, 0, 0);
      this.forearmRNode.rotation.set(0, 0, 0);
      this.armLNode.rotation.set(0, 0, 0);
      this.forearmLNode.rotation.set(0, 0, 0);
      this.thighLNode.rotation.set(0, 0, 0);
      this.thighRNode.rotation.set(0, 0, 0);
    }
  }
}
