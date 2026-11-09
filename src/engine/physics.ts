import type { MeshPoint } from './RadialMesh';

// 중력 처짐은 한 프레임에 아주 조금씩 쌓이므로, 상한이 없으면 오래 켜 두었을 때
// 슬라임이 화면 아래로 계속 내려간다. 그래서 휴지 형태 대비 누적 처짐량에 상한을 둔다.
export const DROOP_PER_STEP = 0.012;

/**
 * 이번 스텝에 더할 처짐량을 돌려준다. 누적량이 maxDroop를 넘지 않도록 잘라낸다.
 */
export function droopStep(accumulated: number, gravity: number, maxDroop: number): number {
  if (gravity <= 0 || accumulated >= maxDroop) return 0;
  return Math.min(DROOP_PER_STEP * gravity, maxDroop - accumulated);
}

/** 슬라임 반지름 대비 허용하는 최대 처짐(px). 반지름 120px이면 약 18px. */
export function maxDroopFor(radius: number): number {
  return radius * 0.15;
}

// restoreStrength(0~1)를 스프링 강성(1/s²)으로 바꾼다.
// 0.01(녹는 젤리) → 약 44, 0.4(탱탱) → 약 200. dt=1/60에서 ω·dt < 0.25라 반암시적 오일러로 안정적이다.
export function springStiffnessFor(restoreStrength: number): number {
  return 40 + Math.min(Math.max(restoreStrength, 0), 1) * 400;
}

// 점성이 높을수록 출렁임이 빨리 가라앉는다.
export function dampingFor(viscosity: number): number {
  return 4 + viscosity * 8;
}

export const MAX_POINT_SPEED = 900; // px/s

/**
 * 탭(충격파)·흔들기 힘을 속도로 적분하고, 휴지 위치로 되돌리는 스프링과 감쇠를 적용한다.
 * 힘(fx, fy)은 매 스텝 소비 후 0으로 초기화한다. maxOffset으로 휴지 위치에서 벗어나는 거리를 제한해
 * 큰 충격에서도 메시가 뒤집히지 않게 한다.
 */
export function integratePoint(
  p: MeshPoint,
  dt: number,
  stiffness: number,
  damping: number,
  maxOffset: number,
) {
  p.vx += (p.fx + (p.restX - p.x) * stiffness) * dt;
  p.vy += (p.fy + (p.restY - p.y) * stiffness) * dt;
  p.fx = 0;
  p.fy = 0;

  const decay = Math.exp(-damping * dt);
  p.vx *= decay;
  p.vy *= decay;

  const speed = Math.hypot(p.vx, p.vy);
  if (speed > MAX_POINT_SPEED) {
    const s = MAX_POINT_SPEED / speed;
    p.vx *= s;
    p.vy *= s;
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  const ox = p.x - p.restX;
  const oy = p.y - p.restY;
  const off = Math.hypot(ox, oy);
  if (off > maxOffset) {
    const s = maxOffset / off;
    p.x = p.restX + ox * s;
    p.y = p.restY + oy * s;
  }
}
