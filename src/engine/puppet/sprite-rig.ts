import * as THREE from "three";
import type { ActionPose } from "./action-controller.js";
import { getFaceRoi } from "./face-animator.js";

const smooth = (a: number, b: number, v: number): number => {
  const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A weighted illustration mesh; feet remain fixed while the upper body articulates. */
export class SpriteRig {
  readonly mesh: THREE.SkinnedMesh;
  readonly bones: THREE.Bone[];
  readonly points: THREE.Vector3[];
  readonly sourcePoints: THREE.Vector2[];
  readonly triangles: number[];
  private readonly pet: boolean;

  constructor(readonly characterId: string, readonly aspect: number) {
    this.pet = characterId.includes("rooster");
    const geo = new THREE.PlaneGeometry(aspect, 1, 18, 28);
    geo.translate(0, -0.5, 0);
    const roi = getFaceRoi(characterId);
    const headX = roi.mouthX;
    const neckY = roi.mouthY + 0.035;
    const armY = characterId.includes("evil") ? -0.61 : -0.72;
    const anchors = [[0, 0], [headX, neckY], [-aspect * 0.13, armY],
      [aspect * 0.13, armY], [0, -0.53], [0, -0.87]];
    this.bones = anchors.map(([x, y], i) => {
      const bone = new THREE.Bone();
      bone.name = ["root", "head", "left_arm", "right_arm", "robe", "hair"][i];
      bone.position.set(x, y, 0);
      return bone;
    });
    this.bones.slice(1).forEach(b => this.bones[0].add(b));
    const pos = geo.getAttribute("position");
    const indices: number[] = [];
    const weights: number[] = [];
    this.points = [];
    this.sourcePoints = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = x / aspect + 0.5;
      const v = y + 1;
      const depth = -y;
      const head = smooth(-neckY - 0.055, -neckY + 0.025, -y);
      const armBand = smooth(0.48, 0.6, depth) * (1 - smooth(0.76, 0.84, depth));
      const left = (1 - smooth(0.25, 0.43, u)) * armBand;
      const right = smooth(0.57, 0.75, u) * armBand;
      const robe = (1 - smooth(0.35, 0.53, depth)) * smooth(0.07, 0.18, depth)
        * smooth(0.06, 0.23, Math.abs(u - 0.5));
      const hair = smooth(0.64, 0.84, u) * smooth(0.68, 0.8, depth);
      const influences = this.pet ? [] : [[1, head], [2, left], [3, right], [4, robe], [5, hair]]
        .filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const sum = influences.reduce((n, [, w]) => n + w, 0);
      const normalizer = Math.max(1, sum);
      const entries = [[0, Math.max(0, 1 - sum)], ...influences];
      while (entries.length < 4) entries.push([0, 0]);
      entries.forEach(([index, weight]) => { indices.push(index); weights.push(weight / normalizer); });
      this.points.push(new THREE.Vector3(x, y, 0));
      this.sourcePoints.push(new THREE.Vector2(u, v));
    }
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
    this.triangles = Array.from(geo.index!.array);
    this.mesh = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial({ transparent: true }));
    this.mesh.add(this.bones[0]);
    this.mesh.bind(new THREE.Skeleton(this.bones));
  }

  update(pose: ActionPose | undefined, timeMs: number): void {
    const [, head, left, right, robe, hair] = this.bones;
    // Rotations stay modest for a single illustration; large turns need separated artwork.
    head.rotation.z = (pose?.headRotationZ ?? 0) * 0.65;
    head.position.y = getFaceRoi(this.characterId).mouthY + 0.035
      + (pose?.headNodY ?? 0) / 1400;
    left.rotation.z = (pose?.armsRotationZ ?? 0) * -0.48;
    right.rotation.z = (pose?.gestureArmRotZ ?? pose?.armsRotationZ ?? 0) * 0.62;
    robe.rotation.z = Math.sin(timeMs * 0.003 + 0.8) * 0.035 + (pose?.robeFlutter ?? 0) * 0.25;
    hair.rotation.z = Math.sin(timeMs * 0.0028 - 0.6) * 0.025;
    this.mesh.updateMatrixWorld(true);
    this.mesh.skeleton.update();
    const positions = this.mesh.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      this.points[i].fromBufferAttribute(positions, i);
      this.mesh.applyBoneTransform(i, this.points[i]);
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.skeleton.dispose();
  }
}
