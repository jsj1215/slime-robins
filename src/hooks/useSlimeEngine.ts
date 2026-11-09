import { useRef, useEffect } from 'react';
import { RadialMesh } from '../engine/RadialMesh';
import { SlimeRenderer } from '../engine/SlimeRenderer';
import { SimulationLoop } from '../engine/SimulationLoop';
import { SpecialEffects } from '../engine/SpecialEffects';
import type { MixedMark, MarkStyle } from '../engine/SlimeRenderer';
import { droopStep, maxDroopFor, springStiffnessFor, dampingFor, integratePoint } from '../engine/physics';
import { SlimeSoundBank } from '../sound/SlimeSoundBank';
import { GestureAudioMapper } from '../sound/GestureAudioMapper';
import { GestureRecognizer } from '../gesture/GestureRecognizer';
import { createPointerState, bindPointerTracker } from '../gesture/PointerTracker';
import { AudioEngine } from '../sound/AudioEngine';
import type { ResolvedSlime } from '../types/slime';
import type { GestureEvent, GestureType } from '../gesture/GestureTypes';

interface Interaction {
  type: GestureType;
  x: number;
  y: number;
  grabRestX: number;
  grabRestY: number;
  active: boolean;
}

function findClosestIdx(pts: Array<{ restX: number; restY: number }>, x: number, y: number) {
  let best = 0, bestD = Infinity;
  pts.forEach((p, i) => {
    const d = (p.restX - x) ** 2 + (p.restY - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// 탭 충격파 / 흔들기 힘의 세기(가속도, px/s²). 한 스텝(1/60초) 동안 적용되어 대략 200~250px/s의 초기 속도가 된다.
const TAP_SHOCK = 15000;
const SHAKE_FORCE = 12000;
// 움직임 줄이기 설정이면 출렁임 세기를 줄인다.
const REDUCED_MOTION_SCALE = 0.35;

// 스페이스바 입력을 가로채면 안 되는 대상(버튼, 입력창 등)
function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(target.tagName);
}

// Random interval between min and max ms
function randInterval(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function useSlimeEngine(slime: ResolvedSlime) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;

    const mesh = new RadialMesh({
      cx: w / 2, cy: h / 2,
      radius: slime.visual.meshRadius,
      pointCount: slime.physics.meshPoints,
    });
    const renderer = new SlimeRenderer(ctx, slime.id, slime.visual);

    // ── Pre-mixed initial elements for specific slimes ──────────────
    // Some slimes start with sugar crystals, beads, or rainbow chunks already mixed in
    {
      type PreMixEntry = { type: 'sand' | 'blob'; style: MarkStyle; colors: string[]; count: number; maxR: number };
      const PRE_MIX: Record<number, PreMixEntry> = {
        19: { type: 'sand', style: 'sand',  colors: ['#FFE566','#FFF0AA','#FFFFDD'], count: 50, maxR: 2.5 },  // 바삭이: 팝콘알갱이
        20: { type: 'sand', style: 'choco', colors: ['#5C2F0A','#3A1A06','#7A4418'], count: 22, maxR: 4 },    // 크런치볼: 초코칩
        21: { type: 'sand', style: 'sugar', colors: ['#EAFAFF','#C8F4FF','#FFFFFF'], count: 30, maxR: 3.5 },  // 아이스볼: 얼음크리스탈
        22: { type: 'sand', style: 'sugar', colors: ['#F5E8B0','#EEDC90','#FFF5CC'], count: 40, maxR: 3 },   // 모래성이: 설탕슈가
        23: { type: 'blob', style: 'blob',  colors: ['#FFFFFF','#F5F0FF','#E8F0FF'], count: 14, maxR: 7 },   // 비즈볼: 진주알
        24: { type: 'sand', style: 'mousse',colors: ['#FFCCDD','#FFB0C8','#FF88AA'], count: 10, maxR: 9 },   // 폼클레이: 딸기무스
        25: { type: 'blob', style: 'mousse',colors: ['#E0AAFF','#FFAADD','#AAD8FF'], count: 9,  maxR: 11 },  // 솜사탕: 색깔무스
        26: { type: 'sand', style: 'star',  colors: ['#FFFFFF','#E8F4FF','#CCE8FF'], count: 18, maxR: 4.5 }, // 구름이: 슈팅스타
        28: { type: 'sand', style: 'choco', colors: ['#2A0E04','#1A0602','#3D1808'], count: 18, maxR: 4.5 }, // 무스케익: 초코칩
        31: { type: 'blob', style: 'star',  colors: ['#FF3366','#FF9900','#00BBFF','#BB44FF','#00DD88'], count: 14, maxR: 7 }, // 레인보우: 무지개별
      };
      const preset = PRE_MIX[slime.id];
      if (preset) {
        let s = slime.id * 9973 + 11317;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
        const pts = mesh.points;
        const pn = pts.length;
        const ccx = pts.reduce((a, p) => a + p.x, 0) / pn;
        const ccy = pts.reduce((a, p) => a + p.y, 0) / pn;
        const initialMarks: MixedMark[] = [];
        for (let i = 0; i < preset.count; i++) {
          const tp = pts[Math.floor(rand() * pn)];
          const blend = rand() * 0.9;
          const wx = ccx + (tp.x - ccx) * blend;
          const wy = ccy + (tp.y - ccy) * blend;
          const idx = pts.reduce((bi, p, pi) =>
            (p.x - wx) ** 2 + (p.y - wy) ** 2 < (pts[bi].x - wx) ** 2 + (pts[bi].y - wy) ** 2 ? pi : bi, 0);
          const mp = pts[idx];
          initialMarks.push({
            attachIdx: idx,
            ox: wx - mp.x,
            oy: wy - mp.y,
            radius: preset.maxR * (0.5 + rand() * 0.5),
            color: preset.colors[Math.floor(rand() * preset.colors.length)],
            opacity: 0.55 + rand() * 0.4,
            type: preset.type,
            style: preset.style,
            angle: rand() * Math.PI * 2,
          });
        }
        renderer.addMixedMarks(initialMarks);
      }
    }

    const fx = new SpecialEffects();
    const soundBank = new SlimeSoundBank(slime.sound);
    const audioMapper = new GestureAudioMapper(soundBank);
    const pointerState = createPointerState();

    const interaction: Interaction = {
      type: 'idle', x: 0, y: 0,
      grabRestX: 0, grabRestY: 0, active: false,
    };

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      // 고해상도 기기(DPR 3 등)에서 캔버스 픽셀 수가 9배로 늘어나는 것을 막기 위해 2로 제한한다.
      // 창을 다른 모니터로 옮기면 DPR이 바뀌므로 리사이즈마다 다시 읽는다.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mesh.reposition(w / 2, h / 2);
    };

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const motionScale = reducedMotion ? REDUCED_MOTION_SCALE : 1;

    // ── Random special effect scheduler ──────────────────────────
    // 반짝이처럼 잠깐 나타났다 사라지는 효과는 어색해서 빼고, 슬라임에 섞여 남는 효과만 쓴다.
    const EFFECT_TYPES = ['sand', 'colorblob'] as const;
    let effectTimer: ReturnType<typeof setTimeout> | null = null;

    // Helper: find nearest mesh point index to world position (x, y)
    function nearestMeshIdx(x: number, y: number): number {
      let best = 0, bestD = Infinity;
      mesh.points.forEach((p, i) => {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    // Convert effect to permanent MixedMark — distributed across CURRENT slime area
    function createPermanentMarks(type: typeof EFFECT_TYPES[number]): MixedMark[] {
      const marks: MixedMark[] = [];
      const pts = mesh.points;
      const pn = pts.length;
      const { x: ccx, y: ccy } = mesh.centroid();

      const colors = ['#FF3366', '#FF9900', '#FFDD00', '#00DD88', '#00BBFF', '#BB44FF'];
      const count = type === 'sand' ? 45 + Math.floor(Math.random() * 25) : 5 + Math.floor(Math.random() * 5);

      for (let i = 0; i < count; i++) {
        // Sample positions across the ACTUAL deformed mesh:
        // Blend between centroid and a random mesh point → covers full stretched area
        const targetPt = pts[Math.floor(Math.random() * pn)];
        const blend = Math.random() * 0.92; // 0=center, 0.92=near edge
        const wx = ccx + (targetPt.x - ccx) * blend;
        const wy = ccy + (targetPt.y - ccy) * blend;

        const idx = nearestMeshIdx(wx, wy);
        const mp = mesh.points[idx];
        marks.push({
          attachIdx: idx,
          ox: wx - mp.x,
          oy: wy - mp.y,
          radius: type === 'sand' ? 1.5 + Math.random() * 2.5 : 10 + Math.random() * 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: type === 'sand' ? 0.55 + Math.random() * 0.4 : 0.28 + Math.random() * 0.3,
          type: type === 'sand' ? 'sand' : 'blob',
        });
      }
      return marks;
    }

    function scheduleNextEffect() {
      const delay = randInterval(8000, 25000);
      effectTimer = setTimeout(() => {
        const type = EFFECT_TYPES[Math.floor(Math.random() * EFFECT_TYPES.length)];
        // 드래그로 옮겨진 현재 위치에서 효과가 나도록 리사이즈 때의 중심이 아니라 현재 무게중심을 쓴다.
        const { x: cx, y: cy } = mesh.centroid();
        const r = slime.visual.meshRadius;
        if (type === 'sand') fx.triggerSand(cx, cy, r);
        else fx.triggerColorBlob(cx, cy, r);
        // Permanent marks mixed into slime
        const marks = createPermanentMarks(type);
        if (marks.length > 0) renderer.addMixedMarks(marks);
        scheduleNextEffect();
      }, delay);
    }

    scheduleNextEffect();

    // ── Gesture handler ───────────────────────────────────────────
    // 메시 처리를 먼저 하고 소리는 마지막에 낸다. 오디오에서 문제가 생겨도 모양 변화는 항상 반영된다.
    const handleGesture = (evt: GestureEvent) => {
      applyGestureToMesh(evt);
      audioMapper.onGesture(evt);
    };

    const applyGestureToMesh = (evt: GestureEvent) => {
      if (evt.type === 'idle') {
        // 손을 뗀 모양을 새 휴지 모양으로 삼는다(점토처럼 모양이 남음). 남은 출렁임은 새 휴지 모양을 중심으로 가라앉는다.
        for (const p of mesh.points) { p.restX = p.x; p.restY = p.y; }
        interaction.active = false;
        interaction.type = 'idle';
        return;
      }

      interaction.type = evt.type;
      interaction.x = evt.x;
      interaction.y = evt.y;

      if (evt.type === 'press' || evt.type === 'drag' || evt.type === 'stretch') {
        if (!interaction.active) {
          const idx = findClosestIdx(mesh.points, evt.x, evt.y);
          interaction.grabRestX = mesh.points[idx].restX;
          interaction.grabRestY = mesh.points[idx].restY;
          interaction.active = true;
        }
      } else if (evt.type === 'tap') {
        mesh.applyShockwave(evt.x, evt.y, TAP_SHOCK * motionScale);
        interaction.active = false;
      } else if (evt.type === 'shake') {
        mesh.applyShake(SHAKE_FORCE * motionScale);
        const c = mesh.centroid();
        fx.triggerColorBlob(c.x, c.y, slime.visual.meshRadius);
        // Shake mixes colors permanently into slime
        renderer.addMixedMarks(createPermanentMarks('colorblob'));
      }
    };

    const recognizer = new GestureRecognizer(handleGesture, slime.visual.meshRadius);

    const stiffness = springStiffnessFor(slime.physics.restoreStrength);
    const damping = dampingFor(slime.physics.viscosity);
    const maxOffset = mesh.radius * 0.3;
    const maxDroop = maxDroopFor(mesh.radius);
    let droop = 0;
    // 렌더용 보간 좌표 버퍼. 매 프레임 새 배열을 만들지 않고 재사용한다.
    const interpolated = mesh.points.map((p) => ({ x: p.x, y: p.y }));

    const loop = new SimulationLoop(
      (dt) => {
        mesh.saveRenderPrevious();
        const n = mesh.points.length;
        const { viscosity } = slime.physics;
        // Narrow starting radius: only the grabbed spot and immediate neighbors move
        const influenceRadius = mesh.radius * 0.65;

        if (interaction.active && (interaction.type === 'drag' || interaction.type === 'press' || interaction.type === 'stretch')) {
          const dispX = interaction.x - interaction.grabRestX;
          const dispY = interaction.y - interaction.grabRestY;
          const totalPull = Math.sqrt(dispX * dispX + dispY * dispY);

          // As you pull further, influence radius SHRINKS → only the neck stretches
          // This creates the natural "long neck" of stretched slime
          const dynamicRadius = influenceRadius * Math.max(0.35, 1 - totalPull / (mesh.radius * 2.2));

          for (let i = 0; i < n; i++) {
            const p = mesh.points[i];
            const dx = p.restX - interaction.grabRestX;
            const dy = p.restY - interaction.grabRestY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const norm = Math.max(0, 1 - dist / dynamicRadius);

            // Cubic falloff: steeper than smoothstep → sharper neck, not a dome
            const t = norm * norm * (3 - 2 * norm) * norm;

            const targetX = p.restX + dispX * t;
            const targetY = p.restY + dispY * t;

            // Follow speed proportional to kernel weight:
            // Close to grab = fast (tip tracks finger), far away = slow (gooey body stays)
            const baseSpeed = 0.12 + (1 - viscosity) * 0.18;
            const followSpeed = baseSpeed + t * 0.42;

            p.x += (targetX - p.x) * followSpeed;
            p.y += (targetY - p.y) * followSpeed;

            // 잡고 있는 동안 흔들기 힘은 손가락 추적 위에 얹히는 출렁임으로만 반영한다.
            // 손가락 추적(followSpeed)이 위치를 계속 끌어당기므로 스프링 없이 감쇠만 준다.
            p.vx = (p.vx + p.fx * dt) * Math.exp(-damping * dt);
            p.vy = (p.vy + p.fy * dt) * Math.exp(-damping * dt);
            p.fx = 0; p.fy = 0;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
          }
        } else {
          // 중력 처짐: 휴지 위치와 현재 위치를 같은 양만큼 옮긴다. 둘이 어긋나면 다음 터치 때 모양이 튄다.
          // 누적량에 상한을 둬 오래 두어도 화면 밖으로 흘러내리지 않는다.
          const d = droopStep(droop, slime.physics.gravity, maxDroop);
          droop += d;
          for (let i = 0; i < n; i++) {
            const p = mesh.points[i];
            p.restY += d;
            p.y += d;
            // 탭 충격파 / 흔들기 힘 → 속도 → 위치, 스프링으로 휴지 모양에 돌아온다.
            integratePoint(p, dt, stiffness, damping, maxOffset);
          }
        }

        // Update special effects particles
        fx.update(dt);
      },
      (alpha) => {
        renderer.clear(w, h);
        for (let i = 0; i < interpolated.length; i++) {
          const p = mesh.points[i];
          interpolated[i].x = p.prevX + (p.x - p.prevX) * alpha;
          interpolated[i].y = p.prevY + (p.y - p.prevY) * alpha;
        }
        // 이번 프레임 윤곽 경로와 무게중심을 한 번만 계산해 아래 그리기에서 같이 쓴다
        renderer.beginFrame(interpolated);
        // Color blobs + sand INSIDE slime (clipped — mixed in effect)
        renderer.renderBlobsInside(fx.blobs);
        renderer.renderSandInside(fx.particles);
        renderer.render();
      },
    );

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const unbind = bindPointerTracker(
      canvas, pointerState,
      () => {
        // 누르기/늘이기 판정은 현재 무게중심 기준 (슬라임이 옮겨지거나 처져도 맞게)
        const c = mesh.centroid();
        recognizer.onDown(pointerState, c.x, c.y);
        AudioEngine.resume();
      },
      () => {
        const c = mesh.centroid();
        recognizer.onMove(pointerState, c.x, c.y);
      },
      () => recognizer.onUp(pointerState),
    );

    // ── Spacebar: sprinkle elements across full current slime area ──
    const SPACE_STYLES: MarkStyle[] = ['choco', 'sugar', 'star', 'mousse', 'sand', 'blob'];
    const SPACE_COLORS = [
      ['#5C2F0A','#3A1A06'],     // choco
      ['#FFFFFF','#FFF8CC','#FFFAAA'], // sugar
      ['#FFD700','#FF9900','#FF66CC','#00CCFF'], // star
      ['#FF88AA','#FFBBCC','#CC44AA'], // mousse
      ['#FF6B9D','#00CCAA','#FFAA00'], // sand
      ['#BB44FF','#FF3366','#00BB88'], // blob
    ];

    const handleSpacebar = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      // 뒤로가기 버튼 등에 포커스가 있을 때는 스페이스바 기본 동작(버튼 누르기)을 막지 않는다
      if (isInteractiveTarget(e.target)) return;
      e.preventDefault();

      const pts = mesh.points;
      const pn = pts.length;
      const { x: ccx, y: ccy } = mesh.centroid();
      const styleIdx = Math.floor(Math.random() * SPACE_STYLES.length);
      const style = SPACE_STYLES[styleIdx];
      const colors = SPACE_COLORS[styleIdx];

      const count = 25 + Math.floor(Math.random() * 20);
      const marks: MixedMark[] = [];

      for (let i = 0; i < count; i++) {
        const tp = pts[Math.floor(Math.random() * pn)];
        const blend = Math.random() * 0.92;
        const wx = ccx + (tp.x - ccx) * blend;
        const wy = ccy + (tp.y - ccy) * blend;
        const idx = nearestMeshIdx(wx, wy);
        const mp = mesh.points[idx];
        const isBig = style === 'mousse' || style === 'blob';
        marks.push({
          attachIdx: idx,
          ox: wx - mp.x,
          oy: wy - mp.y,
          radius: isBig ? 6 + Math.random() * 10 : 2 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: 0.6 + Math.random() * 0.35,
          type: (style === 'blob' || style === 'mousse') ? 'blob' : 'sand',
          style,
          angle: Math.random() * Math.PI * 2,
        });
      }
      renderer.addMixedMarks(marks);
    };

    window.addEventListener('keydown', handleSpacebar);

    loop.start();

    return () => {
      if (effectTimer) clearTimeout(effectTimer);
      window.removeEventListener('keydown', handleSpacebar);
      loop.stop();
      audioMapper.stopAll();
      recognizer.dispose();
      unbind();
      resizeObserver.disconnect();
      fx.clear();
    };
  }, [slime]);

  return { canvasRef };
}
