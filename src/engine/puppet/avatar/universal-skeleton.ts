import * as THREE from "three";
import type { BodyArchetype } from "../../../core/models/modular-character.js";
export type { BodyArchetype };

export interface ArchetypeProportions {
  totalHeight: number;       // In pixels/world units (e.g. 720)
  headScale: number;         // Relative to totalHeight
  shoulderWidth: number;     // Distance between shoulder joints
  pelvisY: number;           // Height from ground
  chestLength: number;       // Torso segment
  neckLength: number;
  upperArmLength: number;
  forearmLength: number;
  thighLength: number;
  calfLength: number;
  stanceWidth: number;
}

export const ARCHETYPE_PROPORTIONS: Record<BodyArchetype, ArchetypeProportions> = {
  male_adult: {
    totalHeight: 720,
    headScale: 124,
    shoulderWidth: 200,
    pelvisY: 350,
    chestLength: 140,
    neckLength: 42,
    upperArmLength: 110,
    forearmLength: 105,
    thighLength: 175,
    calfLength: 165,
    stanceWidth: 60
  },
  female_adult: {
    totalHeight: 680,
    headScale: 120,
    shoulderWidth: 165,
    pelvisY: 335,
    chestLength: 130,
    neckLength: 40,
    upperArmLength: 102,
    forearmLength: 98,
    thighLength: 165,
    calfLength: 160,
    stanceWidth: 50
  },
  male_youth: {
    totalHeight: 620,
    headScale: 122,
    shoulderWidth: 160,
    pelvisY: 295,
    chestLength: 115,
    neckLength: 36,
    upperArmLength: 95,
    forearmLength: 90,
    thighLength: 145,
    calfLength: 140,
    stanceWidth: 52
  },
  female_youth: {
    totalHeight: 590,
    headScale: 120,
    shoulderWidth: 145,
    pelvisY: 280,
    chestLength: 105,
    neckLength: 34,
    upperArmLength: 88,
    forearmLength: 85,
    thighLength: 138,
    calfLength: 132,
    stanceWidth: 44
  },
  male_muscular: {
    totalHeight: 750,
    headScale: 135,
    shoulderWidth: 260,
    pelvisY: 365,
    chestLength: 160,
    neckLength: 45,
    upperArmLength: 125,
    forearmLength: 118,
    thighLength: 180,
    calfLength: 175,
    stanceWidth: 85
  },
  male_elder: {
    totalHeight: 660,
    headScale: 125,
    shoulderWidth: 180,
    pelvisY: 320,
    chestLength: 135,
    neckLength: 38,
    upperArmLength: 100,
    forearmLength: 95,
    thighLength: 155,
    calfLength: 150,
    stanceWidth: 55
  },
  chibi_universal: {
    totalHeight: 420,
    headScale: 168,
    shoulderWidth: 130,
    pelvisY: 155,
    chestLength: 70,
    neckLength: 20,
    upperArmLength: 55,
    forearmLength: 50,
    thighLength: 75,
    calfLength: 70,
    stanceWidth: 40
  }
};

export type BoneName =
  | "root"
  | "pelvis"
  | "spine"
  | "chest"
  | "neck"
  | "head"
  | "arm_upper_l"
  | "arm_forearm_l"
  | "hand_l"
  | "arm_upper_r"
  | "arm_forearm_r"
  | "hand_r"
  | "thigh_l"
  | "calf_l"
  | "foot_l"
  | "thigh_r"
  | "calf_r"
  | "foot_r"
  // Flexible dynamics bones
  | "hair_chain_1"
  | "hair_chain_2"
  | "cloak_chain_1"
  | "cloak_chain_2"
  | "sleeve_l"
  | "sleeve_r";

export type SocketName =
  | "hand_r"
  | "hand_l"
  | "back"
  | "head_top"
  | "waist"
  | "feet"
  | "aura";

export interface SocketTransform {
  position: THREE.Vector3;
  rotationZ: number;
  scale: THREE.Vector3;
}

/**
 * Universal Skeleton Rig:
 * Standardized 2.5D skeletal hierarchy and socket attachment tree for all humanoid characters.
 */
export class UniversalSkeleton {
  readonly archetype: BodyArchetype;
  readonly proportions: ArchetypeProportions;

  // Three.js bone objects
  readonly bones = new Map<BoneName, THREE.Bone>();
  readonly sockets = new Map<SocketName, THREE.Group>();
  readonly root: THREE.Group;

  constructor(archetype: BodyArchetype = "male_adult") {
    this.archetype = archetype;
    this.proportions = ARCHETYPE_PROPORTIONS[archetype] || ARCHETYPE_PROPORTIONS.male_adult;

    this.root = new THREE.Group();
    this.root.name = `UniversalSkeleton_${archetype}`;

    this.buildHierarchy();
  }

  private createBone(name: BoneName, x = 0, y = 0): THREE.Bone {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(x, y, 0);
    this.bones.set(name, bone);
    return bone;
  }

  private createSocket(name: SocketName, parent: THREE.Object3D, x = 0, y = 0): THREE.Group {
    const socket = new THREE.Group();
    socket.name = `Socket_${name}`;
    socket.position.set(x, y, 0);
    parent.add(socket);
    this.sockets.set(name, socket);
    return socket;
  }

  private buildHierarchy(): void {
    const p = this.proportions;

    // 1. Root & Pelvis
    const rootBone = this.createBone("root", 0, 0);
    this.root.add(rootBone);

    const pelvis = this.createBone("pelvis", 0, p.pelvisY);
    rootBone.add(pelvis);

    // 2. Spine, Chest, Neck, Head
    const spine = this.createBone("spine", 0, p.chestLength * 0.45);
    pelvis.add(spine);

    const chest = this.createBone("chest", 0, p.chestLength * 0.55);
    spine.add(chest);

    const neck = this.createBone("neck", 0, p.chestLength * 0.55);
    chest.add(neck);

    const head = this.createBone("head", 0, p.neckLength);
    neck.add(head);

    // Secondary hair dynamic bones (attached to head)
    const hairChain1 = this.createBone("hair_chain_1", 0, -p.headScale * 0.3);
    head.add(hairChain1);
    const hairChain2 = this.createBone("hair_chain_2", 0, -p.headScale * 0.35);
    hairChain1.add(hairChain2);

    // 3. Left Arm (Clavicle -> UpperArm -> Forearm -> Hand)
    const halfShoulder = p.shoulderWidth / 2;
    const armUpperL = this.createBone("arm_upper_l", -halfShoulder, p.chestLength * 0.35);
    chest.add(armUpperL);

    const armForearmL = this.createBone("arm_forearm_l", -p.upperArmLength * 0.2, -p.upperArmLength);
    armUpperL.add(armForearmL);

    const handL = this.createBone("hand_l", 0, -p.forearmLength);
    armForearmL.add(handL);

    const sleeveL = this.createBone("sleeve_l", -10, -p.forearmLength * 0.5);
    armForearmL.add(sleeveL);

    // 4. Right Arm (Clavicle -> UpperArm -> Forearm -> Hand)
    const armUpperR = this.createBone("arm_upper_r", halfShoulder, p.chestLength * 0.35);
    chest.add(armUpperR);

    const armForearmR = this.createBone("arm_forearm_r", p.upperArmLength * 0.2, -p.upperArmLength);
    armUpperR.add(armForearmR);

    const handR = this.createBone("hand_r", 0, -p.forearmLength);
    armForearmR.add(handR);

    const sleeveR = this.createBone("sleeve_r", 10, -p.forearmLength * 0.5);
    armForearmR.add(sleeveR);

    // 5. Lower Body (Legs)
    const halfStance = p.stanceWidth / 2;
    const thighL = this.createBone("thigh_l", -halfStance, 0);
    pelvis.add(thighL);

    const calfL = this.createBone("calf_l", 0, -p.thighLength);
    thighL.add(calfL);

    const footL = this.createBone("foot_l", 0, -p.calfLength);
    calfL.add(footL);

    const thighR = this.createBone("thigh_r", halfStance, 0);
    pelvis.add(thighR);

    const calfR = this.createBone("calf_r", 0, -p.thighLength);
    thighR.add(calfR);

    const footR = this.createBone("foot_r", 0, -p.calfLength);
    calfR.add(footR);

    // Secondary Cloak bones (attached to Chest back)
    const cloakChain1 = this.createBone("cloak_chain_1", 0, -p.chestLength * 0.2);
    chest.add(cloakChain1);
    const cloakChain2 = this.createBone("cloak_chain_2", 0, -p.pelvisY * 0.6);
    cloakChain1.add(cloakChain2);

    // 6. Setup Standard Sockets
    this.createSocket("hand_r", handR, 0, -15);
    this.createSocket("hand_l", handL, 0, -15);
    this.createSocket("back", chest, 0, p.chestLength * 0.2);
    this.createSocket("head_top", head, 0, p.headScale * 0.5);
    this.createSocket("waist", pelvis, 0, 0);
    this.createSocket("feet", rootBone, 0, 0);
    this.createSocket("aura", pelvis, 0, p.chestLength * 0.3);
  }

  getBone(name: BoneName): THREE.Bone {
    const bone = this.bones.get(name);
    if (!bone) throw new Error(`Bone not found: ${name}`);
    return bone;
  }

  getSocket(name: SocketName): THREE.Group {
    const socket = this.sockets.get(name);
    if (!socket) throw new Error(`Socket not found: ${name}`);
    return socket;
  }

  /**
   * Reset all bones to standard rest pose
   */
  resetRestPose(): void {
    for (const bone of this.bones.values()) {
      bone.rotation.set(0, 0, 0);
      bone.scale.set(1, 1, 1);
    }
  }

  /**
   * Get world transform of a socket
   */
  getSocketTransform(name: SocketName): SocketTransform {
    const socket = this.getSocket(name);
    socket.updateMatrixWorld(true);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    socket.matrixWorld.decompose(position, quaternion, scale);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position,
      rotationZ: euler.z,
      scale
    };
  }

  /**
   * Get world transform of a bone for 2D Canvas rendering (with inverted Y and rotation)
   */
  getBoneTransform2D(name: BoneName): { x: number; y: number; rotZ: number } {
    const bone = this.getBone(name);
    this.root.updateMatrixWorld(true);

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    bone.matrixWorld.decompose(pos, quat, scale);
    const euler = new THREE.Euler().setFromQuaternion(quat);

    return {
      x: pos.x,
      y: -pos.y, // Canvas 2D Y is inverted
      rotZ: -euler.z // Canvas 2D rotation is clockwise
    };
  }

  /**
   * Apply dynamic secondary flutter to hair, cloak, and sleeves
   */
  applySecondaryDynamics(windX: number, swayFactor: number, timeMs: number): void {
    const hair1 = this.bones.get("hair_chain_1");
    const hair2 = this.bones.get("hair_chain_2");
    const cloak1 = this.bones.get("cloak_chain_1");
    const cloak2 = this.bones.get("cloak_chain_2");
    const sleeveL = this.bones.get("sleeve_l");
    const sleeveR = this.bones.get("sleeve_r");

    const t = timeMs * 0.003;
    const wave = Math.sin(t) * swayFactor;
    const waveBack = Math.sin(t * 1.3 + 0.8) * swayFactor;

    if (hair1) hair1.rotation.z = wave * 0.12 - windX * 0.002;
    if (hair2) hair2.rotation.z = waveBack * 0.18 - windX * 0.003;

    if (cloak1) cloak1.rotation.z = wave * 0.15 - windX * 0.004;
    if (cloak2) cloak2.rotation.z = waveBack * 0.22 - windX * 0.005;

    if (sleeveL) sleeveL.rotation.z = wave * 0.1 - windX * 0.002;
    if (sleeveR) sleeveR.rotation.z = waveBack * 0.1 - windX * 0.002;
  }
}
