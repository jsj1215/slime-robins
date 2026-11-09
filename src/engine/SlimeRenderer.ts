import type { VisualConfig } from '../types/slime';

type Pt = { x: number; y: number };

// 정렬된 제어점으로 Catmull-Rom → 베지어 곡선 경로를 만든다. 컨트롤 포인트 길이를 현 길이의 42%로 제한해
// 크게 늘였을 때 곡선이 꼬이는 것을 막는다.
function buildPath(sorted: Pt[]): Path2D {
  const path = new Path2D();
  const n = sorted.length;
  if (n < 3) return path;
  for (let i = 0; i < n; i++) {
    const p0 = sorted[(i - 1 + n) % n];
    const p1 = sorted[i];
    const p2 = sorted[(i + 1) % n];
    const p3 = sorted[(i + 2) % n];
    let cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    let cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    const chord = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const maxC = Math.max(chord * 0.42, 2);
    const d1 = Math.sqrt((cp1x - p1.x) ** 2 + (cp1y - p1.y) ** 2);
    if (d1 > maxC) { const s = maxC / d1; cp1x = p1.x + (cp1x - p1.x) * s; cp1y = p1.y + (cp1y - p1.y) * s; }
    const d2 = Math.sqrt((cp2x - p2.x) ** 2 + (cp2y - p2.y) ** 2);
    if (d2 > maxC) { const s = maxC / d2; cp2x = p2.x + (cp2x - p2.x) * s; cp2y = p2.y + (cp2y - p2.y) * s; }
    if (i === 0) path.moveTo(p1.x, p1.y);
    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  path.closePath();
  return path;
}

function blendHex(a: string, b: string, r: number): string {
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const ca = p(a.length >= 7 ? a : '#888888');
  const cb = p(b.length >= 7 ? b : '#888888');
  const c = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * r).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}

// Compression per point: > 1 = thick/gathered, < 1 = thin/stretched
function calcCompression(pts: Pt[], expected: number, out: Float32Array) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const next = pts[(i + 1) % n];
    const d = Math.sqrt((next.x - p.x) ** 2 + (next.y - p.y) ** 2);
    out[i] = d < 0.5 ? 1 : Math.min(expected / d, 3.5);
  }
}

function findPileCenter(pts: Pt[], compression: Float32Array) {
  let wx = 0, wy = 0, totalW = 0;
  for (let i = 0; i < pts.length; i++) {
    const w = Math.max(0, compression[i] - 1.5);
    wx += pts[i].x * w; wy += pts[i].y * w; totalW += w;
  }
  if (totalW < 0.5) return null;
  return { x: wx / totalW, y: wy / totalW, strength: Math.min(totalW / pts.length, 1) };
}

// Mesh-attached texture dots — follow mesh deformation
const DOTS_PER_POINT = 3;
type MeshDot = { ox: number; oy: number; r: number; bright: number };
const meshDotCache = new Map<string, MeshDot[][]>();

function getMeshDots(slimeId: number, n: number): MeshDot[][] {
  const key = `${slimeId}_${n}`;
  if (meshDotCache.has(key)) return meshDotCache.get(key)!;
  const result: MeshDot[][] = [];
  for (let i = 0; i < n; i++) {
    let s = (slimeId * 7919 + i * 1301 + 9817) % 2147483647;
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    result.push(Array.from({ length: DOTS_PER_POINT }, () => {
      const angle = rand() * Math.PI * 2;
      const dist = (0.15 + rand() * 0.65) * 18;
      return { ox: Math.cos(angle) * dist, oy: Math.sin(angle) * dist, r: 2.5 + rand() * 3.5, bright: rand() > 0.5 ? 1 : -1 };
    }));
  }
  meshDotCache.set(key, result);
  return result;
}

export type MarkStyle = 'sand' | 'blob' | 'choco' | 'sugar' | 'star' | 'mousse';

// Permanent mixed-in marks per slime (survive across renders)
export interface MixedMark {
  attachIdx: number;
  ox: number; oy: number;
  radius: number;
  color: string;
  opacity: number;
  type: 'blob' | 'sand';   // style이 없을 때 쓰는 기본 모양
  style?: MarkStyle;        // 지정하면 type 대신 이 모양으로 그림
  angle?: number;           // for star/sugar rotation
}

// 프레임마다 같은 색 계산을 반복하지 않도록 슬라임별로 한 번만 섞어 둔 색
interface PaletteCache {
  rimMid: string;
  rimEdge: string;
  domeCore: string;
  domeMid: string;
  dotBright: string;
  dotDark: string;
  edge: string;
}

function buildPalette(v: VisualConfig): PaletteCache {
  return {
    rimMid: blendHex(v.primaryColor, '#000000', 0.18) + '44',
    rimEdge: blendHex(v.primaryColor, '#000000', 0.3) + '99',
    domeCore: blendHex(v.secondaryColor, '#ffffff', 0.3) + 'CC',
    domeMid: blendHex(v.secondaryColor, v.primaryColor, 0.4) + '77',
    dotBright: blendHex(v.primaryColor, '#ffffff', 0.3),
    dotDark: blendHex(v.primaryColor, v.secondaryColor, 0.6),
    edge: blendHex(v.secondaryColor, '#ffffff', 0.25),
  };
}

export class SlimeRenderer {
  private ctx: CanvasRenderingContext2D;
  private slimeId: number;
  private visual: VisualConfig;
  private palette: PaletteCache;
  // 프레임마다 다시 쓰는 버퍼 (매 프레임 배열 할당을 줄이기 위함)
  private sorted: Pt[] = [];
  private compression = new Float32Array(0);
  private path: Path2D | null = null;
  private points: Pt[] = [];
  /** 이번 프레임 제어점의 무게중심 */
  cx = 0;
  cy = 0;
  // Permanent marks that stay mixed into the slime
  mixedMarks: MixedMark[] = [];

  constructor(ctx: CanvasRenderingContext2D, slimeId: number, visual: VisualConfig) {
    this.ctx = ctx;
    this.slimeId = slimeId;
    this.visual = visual;
    this.palette = buildPalette(visual);
  }

  private byAngle = (a: Pt, b: Pt) =>
    Math.atan2(a.y - this.cy, a.x - this.cx) - Math.atan2(b.y - this.cy, b.x - this.cx);

  /**
   * 한 프레임에 한 번 호출. 무게중심을 구하고, 각도순으로 정렬한 윤곽 경로(Path2D)를 만들어
   * clip/fill/stroke에서 같이 쓴다. (정렬은 꼬인 메시에서 구멍이 생기는 것을 막기 위함)
   */
  beginFrame(points: Pt[]) {
    const n = points.length;
    this.points = points;
    let sx = 0, sy = 0;
    for (let i = 0; i < n; i++) { sx += points[i].x; sy += points[i].y; }
    this.cx = sx / n;
    this.cy = sy / n;
    this.sorted.length = n;
    for (let i = 0; i < n; i++) this.sorted[i] = points[i];
    this.sorted.sort(this.byAngle);
    this.path = buildPath(this.sorted);
  }

  // Add marks from effects — these STAY in the slime permanently
  addMixedMarks(marks: MixedMark[]) {
    this.mixedMarks.push(...marks);
    // Cap total marks to avoid performance issues
    if (this.mixedMarks.length > 200) {
      this.mixedMarks = this.mixedMarks.slice(-200);
    }
  }

  // Color blobs inside slime (clipped, temporary)
  renderBlobsInside(blobs: Array<{ x: number; y: number; radius: number; color: string; life: number }>) {
    if (blobs.length === 0 || !this.path) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.clip(this.path);
    for (const b of blobs) {
      const a = b.life * b.life * 0.6;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
      g.addColorStop(0, b.color + Math.round(a * 255).toString(16).padStart(2, '0'));
      g.addColorStop(0.5, b.color + Math.round(a * 140).toString(16).padStart(2, '0'));
      g.addColorStop(1, b.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Sand particles inside slime (clipped, temporary)
  renderSandInside(particles: Array<{ x: number; y: number; size: number; color: string; life: number }>) {
    if (particles.length === 0 || !this.path) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.clip(this.path);
    for (const p of particles) {
      ctx.globalAlpha = p.life * 0.75;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  render() {
    const path = this.path;
    if (!path) return;
    const ctx = this.ctx;
    const visual = this.visual;
    const pal = this.palette;
    const points = this.points;
    const cx = this.cx;
    const cy = this.cy;
    const r = visual.meshRadius;
    const n = points.length;

    if (this.compression.length !== n) this.compression = new Float32Array(n);
    const compression = this.compression;
    calcCompression(points, (2 * Math.PI * r) / n, compression);
    const pileCenter = findPileCenter(points, compression);
    let compSum = 0;
    for (let i = 0; i < n; i++) compSum += compression[i];
    const avgComp = compSum / n;

    ctx.save();

    // ── GROUND SHADOW ─────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = visual.opacity * 0.15;
    const shadow = ctx.createRadialGradient(cx, cy + r * 0.55, 0, cx, cy + r * 0.55, r * 0.72);
    shadow.addColorStop(0, 'rgba(0,0,0,0.48)'); shadow.addColorStop(1, 'transparent');
    ctx.fillStyle = shadow;
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.5, r * 0.8, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── BASE FILL — flat solid color, no inner circle artifact ────
    ctx.globalAlpha = visual.opacity;
    ctx.fillStyle = visual.primaryColor;
    ctx.fill(path);

    // ── DEPTH GRADIENT — edge vignette (inner radius = 0 to avoid circle artifact) ──
    ctx.save(); ctx.clip(path);
    const rim = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.05);
    rim.addColorStop(0, 'transparent');
    rim.addColorStop(0.55, 'transparent');
    rim.addColorStop(0.82, pal.rimMid);
    rim.addColorStop(1, pal.rimEdge);
    ctx.fillStyle = rim; ctx.fill(path);
    ctx.restore();

    // ── THICKNESS VARIATION — stretched areas lighter (no hard circle edge) ──
    if (avgComp > 1.06) {
      ctx.save();
      ctx.clip(path);
      // Start from center (radius 0) to avoid inner circle artifact
      const stretchWash = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.08);
      stretchWash.addColorStop(0, 'transparent');
      stretchWash.addColorStop(0.62, 'transparent');
      stretchWash.addColorStop(1, `rgba(255,255,255,${Math.min((avgComp - 1) * 0.42, 0.35)})`);
      ctx.globalAlpha = visual.opacity * 0.65;
      ctx.fillStyle = stretchWash; ctx.fill(path);
      ctx.restore();
    }

    // ── PILE DOME — only where actually piled up ───────────────────
    if (pileCenter) {
      ctx.save();
      ctx.clip(path);
      const pR = r * 0.5 * Math.sqrt(pileCenter.strength);
      const dome = ctx.createRadialGradient(pileCenter.x, pileCenter.y - pR * 0.1, pR * 0.04, pileCenter.x, pileCenter.y, pR);
      dome.addColorStop(0, pal.domeCore);
      dome.addColorStop(0.35, pal.domeMid);
      dome.addColorStop(1, 'transparent');
      ctx.globalAlpha = visual.opacity * Math.min(pileCenter.strength * 1.1, 0.82);
      ctx.fillStyle = dome;
      ctx.beginPath(); ctx.arc(pileCenter.x, pileCenter.y, pR, 0, Math.PI * 2); ctx.fill();
      // Pile specular
      ctx.globalAlpha = visual.opacity * visual.glossiness * pileCenter.strength * 0.5;
      ctx.beginPath(); ctx.arc(pileCenter.x - pR * 0.18, pileCenter.y - pR * 0.22, pR * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
      ctx.restore();
    }

    // ── PERMANENT MIXED MARKS — stays in slime forever ────────────
    if (this.mixedMarks.length > 0) {
      ctx.save();
      ctx.clip(path);
      for (const mark of this.mixedMarks) {
        // Anchor mark to nearest mesh point (follows deformation)
        const mp = points[Math.min(mark.attachIdx, points.length - 1)];
        const wx = mp.x + mark.ox;
        const wy = mp.y + mark.oy;
        const style = mark.style ?? (mark.type === 'sand' ? 'sand' : 'blob');
        const a = visual.opacity * mark.opacity;

        ctx.save();
        ctx.globalAlpha = a;

        if (style === 'choco') {
          // 초코칩: 진한 타원 + 상단 광택
          ctx.fillStyle = mark.color;
          ctx.beginPath();
          ctx.ellipse(wx, wy, mark.radius * 0.85, mark.radius * 0.65, mark.angle ?? 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = a * 0.4;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.ellipse(wx - mark.radius * 0.22, wy - mark.radius * 0.25, mark.radius * 0.25, mark.radius * 0.15, -0.5, 0, Math.PI * 2);
          ctx.fill();

        } else if (style === 'sugar') {
          // 설탕 크리스탈: 다이아몬드 + 반짝임
          ctx.translate(wx, wy); ctx.rotate(mark.angle ?? 0);
          ctx.fillStyle = mark.color;
          const r2 = mark.radius;
          ctx.beginPath();
          ctx.moveTo(0, -r2); ctx.lineTo(r2 * 0.55, 0); ctx.lineTo(0, r2); ctx.lineTo(-r2 * 0.55, 0);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = a * 0.6;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.moveTo(0, -r2 * 0.55); ctx.lineTo(r2 * 0.22, -r2 * 0.1); ctx.lineTo(0, r2 * 0.1); ctx.lineTo(-r2 * 0.22, -r2 * 0.1);
          ctx.closePath(); ctx.fill();

        } else if (style === 'star') {
          // 슈팅스타: 4방향 뾰족별 + 중심 글로우
          ctx.translate(wx, wy); ctx.rotate(mark.angle ?? 0);
          ctx.fillStyle = mark.color;
          ctx.beginPath();
          for (let j = 0; j < 8; j++) {
            const ang2 = (j / 8) * Math.PI * 2;
            const rr = j % 2 === 0 ? mark.radius : mark.radius * 0.35;
            if (j === 0) ctx.moveTo(Math.cos(ang2) * rr, Math.sin(ang2) * rr);
          else ctx.lineTo(Math.cos(ang2) * rr, Math.sin(ang2) * rr);
          }
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = a * 0.75;
          const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, mark.radius * 0.5);
          sg.addColorStop(0, 'rgba(255,255,255,0.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(0, 0, mark.radius * 0.5, 0, Math.PI * 2); ctx.fill();

        } else if (style === 'mousse') {
          // 딸기무스: 겹쳐진 소프트 블롭
          for (let layer = 2; layer >= 0; layer--) {
            const scale = 0.55 + layer * 0.2;
            const offX = (layer % 2 === 0 ? 1 : -1) * mark.radius * 0.15 * layer;
            const offY = layer * mark.radius * 0.08;
            ctx.globalAlpha = (1 - layer * 0.22) * a;
            const g = ctx.createRadialGradient(wx + offX, wy + offY, 0, wx + offX, wy + offY, mark.radius * scale);
            g.addColorStop(0, mark.color + 'CC'); g.addColorStop(1, mark.color + '00');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(wx + offX, wy + offY, mark.radius * scale, 0, Math.PI * 2); ctx.fill();
          }

        } else if (style === 'blob') {
          const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, mark.radius);
          g.addColorStop(0, mark.color + 'CC'); g.addColorStop(0.55, mark.color + '88'); g.addColorStop(1, mark.color + '00');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(wx, wy, mark.radius, 0, Math.PI * 2); ctx.fill();

        } else {
          // sand (default)
          ctx.fillStyle = mark.color;
          ctx.beginPath(); ctx.arc(wx, wy, mark.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    // ── MESH-ATTACHED BOSL TEXTURE DOTS ───────────────────────────
    {
      ctx.save();
      ctx.clip(path);
      const dots = getMeshDots(this.slimeId, n);
      for (let i = 0; i < n; i++) {
        const mp = points[i];
        for (const dot of dots[i]) {
          const dc = dot.bright > 0 ? pal.dotBright : pal.dotDark;
          const g = ctx.createRadialGradient(mp.x + dot.ox, mp.y + dot.oy, 0, mp.x + dot.ox, mp.y + dot.oy, dot.r);
          g.addColorStop(0, dc + '99'); g.addColorStop(1, dc + '00');
          ctx.globalAlpha = visual.opacity * 0.4;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(mp.x + dot.ox, mp.y + dot.oy, dot.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // ── GLOSS ─────────────────────────────────────────────────────
    if (visual.glossiness > 0.05) {
      ctx.save();
      ctx.clip(path);
      const gloss = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, 1, cx - r * 0.1, cy - r * 0.15, r * 0.5);
      gloss.addColorStop(0, `rgba(255,255,255,${visual.glossiness * 0.65})`);
      gloss.addColorStop(0.42, `rgba(255,255,255,${visual.glossiness * 0.1})`);
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = visual.opacity; ctx.fillStyle = gloss; ctx.fill(path);
      ctx.beginPath(); ctx.arc(cx - r * 0.18, cy - r * 0.28, r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${visual.glossiness * 0.45})`; ctx.fill();
      ctx.restore();
    }

    // ── SOFT TRANSLUCENT EDGE ─────────────────────────────────────
    ctx.globalAlpha = visual.opacity * 0.1;
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = 4; ctx.stroke(path);

    ctx.restore();
  }

  clear(width: number, height: number) {
    this.ctx.clearRect(0, 0, width, height);
  }
}
