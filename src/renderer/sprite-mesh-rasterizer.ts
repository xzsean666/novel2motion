import { createCanvas, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { SpriteRig } from "../engine/puppet/sprite-rig.js";
import { FaceAnimator } from "../engine/puppet/face-animator.js";
import type { ActionPose } from "../engine/puppet/action-controller.js";

export class SpriteMeshRasterizer {
  private readonly rigs = new Map<string, SpriteRig>();
  private readonly textures = new Map<string, Canvas>();

  render(ctx: SKRSContext2D, img: Image, characterId: string, pose: ActionPose | undefined,
    timeMs: number, speaking: boolean, expression: string, width: number, height: number): void {
    const key = `${characterId}:${img.width}:${img.height}`;
    let rig = this.rigs.get(key);
    if (!rig) { rig = new SpriteRig(characterId, img.width / img.height); this.rigs.set(key, rig); }
    let texture = this.textures.get(key);
    if (!texture) { texture = createCanvas(img.width, img.height); this.textures.set(key, texture); }
    const paint = texture.getContext("2d");
    paint.clearRect(0, 0, img.width, img.height);
    paint.drawImage(img, 0, 0);
    paint.save();
    paint.translate(img.width / 2, img.height);
    // Facial details are part of the texture, so they follow the head's bone transform.
    FaceAnimator.renderFace(paint, { timeMs, isSpeaking: speaking, expression,
      targetH: img.height, targetW: img.width, scale: img.height / 720, characterId, image: img });
    paint.restore();
    rig.update(pose, timeMs);

    const pts = rig.points;
    const uv = rig.sourcePoints;
    for (let i = 0; i < rig.triangles.length; i += 3) {
      const ids = rig.triangles.slice(i, i + 3);
      const source = ids.map(id => ({ x: uv[id].x * img.width, y: uv[id].y * img.height }));
      const dest = ids.map(id => ({ x: pts[id].x / rig.aspect * width, y: pts[id].y * height }));
      const [s0, s1, s2] = source;
      const [d0, d1, d2] = dest;
      const sx1 = s1.x - s0.x, sy1 = s1.y - s0.y;
      const sx2 = s2.x - s0.x, sy2 = s2.y - s0.y;
      const det = sx1 * sy2 - sx2 * sy1;
      if (Math.abs(det) < 0.001) continue;
      const dx1 = d1.x - d0.x, dy1 = d1.y - d0.y;
      const dx2 = d2.x - d0.x, dy2 = d2.y - d0.y;
      const a = (dx1 * sy2 - dx2 * sy1) / det;
      const b = (dy1 * sy2 - dy2 * sy1) / det;
      const c = (dx2 * sx1 - dx1 * sx2) / det;
      const d = (dy2 * sx1 - dy1 * sx2) / det;
      ctx.save();
      ctx.beginPath();
      // Slightly overlapping clips prevent antialiasing gaps between triangles.
      const cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3;
      dest.forEach((p, j) => {
        const len = Math.hypot(p.x - cx, p.y - cy) || 1;
        const x = p.x + (p.x - cx) / len * 0.4;
        const y = p.y + (p.y - cy) / len * 0.4;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath(); ctx.clip();
      ctx.transform(a, b, c, d, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - d * s0.y);
      const minX = Math.max(0, Math.floor(Math.min(...source.map(p => p.x)) - 1));
      const minY = Math.max(0, Math.floor(Math.min(...source.map(p => p.y)) - 1));
      const maxX = Math.min(img.width, Math.ceil(Math.max(...source.map(p => p.x)) + 1));
      const maxY = Math.min(img.height, Math.ceil(Math.max(...source.map(p => p.y)) + 1));
      ctx.drawImage(texture, minX, minY, maxX - minX, maxY - minY,
        minX, minY, maxX - minX, maxY - minY);
      ctx.restore();
    }
  }

  dispose(): void {
    this.rigs.forEach(rig => rig.dispose());
    this.rigs.clear(); this.textures.clear();
  }
}
