import { describe, it, expect } from 'vitest';
import { droopStep, maxDroopFor, integratePoint, springStiffnessFor, dampingFor, DROOP_PER_STEP } from './physics';
import { RadialMesh, type MeshPoint } from './RadialMesh';

const point = (x = 0, y = 0): MeshPoint => ({
  x, y, vx: 0, vy: 0, fx: 0, fy: 0, restX: x, restY: y, prevX: x, prevY: y,
});

describe('droopStep', () => {
  it('상한 전에는 gravity에 비례해 처진다', () => {
    expect(droopStep(0, 0.5, 10)).toBeCloseTo(DROOP_PER_STEP * 0.5);
  });

  it('오래 반복해도 누적 처짐이 상한을 넘지 않는다', () => {
    const max = maxDroopFor(120);
    let acc = 0;
    // 60fps로 10시간 분량, 무거운 gravity
    for (let i = 0; i < 60 * 60 * 60 * 10; i++) acc += droopStep(acc, 5, max);
    expect(acc).toBeCloseTo(max, 6);
    expect(droopStep(acc, 5, max)).toBe(0);
  });

  it('상한 직전에서는 남은 양만큼만 더한다', () => {
    expect(droopStep(9.99, 10, 10)).toBeCloseTo(0.01);
  });

  it('gravity가 0 이하면 처지지 않는다', () => {
    expect(droopStep(0, 0, 10)).toBe(0);
  });
});

describe('integratePoint', () => {
  it('힘은 한 스텝에 소비되고, 출렁임은 휴지 위치로 가라앉는다', () => {
    const p = point(100, 100);
    p.fx = 15000;
    const k = springStiffnessFor(0.4);
    const c = dampingFor(0.2);
    integratePoint(p, 1 / 60, k, c, 40);
    expect(p.fx).toBe(0);
    expect(p.x).toBeGreaterThan(100);
    for (let i = 0; i < 600; i++) integratePoint(p, 1 / 60, k, c, 40);
    expect(Math.abs(p.x - 100)).toBeLessThan(0.5);
    expect(Math.abs(p.vx)).toBeLessThan(1);
  });

  it('아주 큰 힘에도 휴지 위치에서 maxOffset 넘게 벗어나지 않는다', () => {
    const p = point(0, 0);
    p.fx = 1e9;
    p.fy = -1e9;
    let maxOff = 0;
    for (let i = 0; i < 120; i++) {
      integratePoint(p, 1 / 60, springStiffnessFor(0.01), dampingFor(0.1), 36);
      maxOff = Math.max(maxOff, Math.hypot(p.x, p.y));
    }
    expect(maxOff).toBeLessThanOrEqual(36 + 1e-9);
    expect(Number.isFinite(p.x)).toBe(true);
  });
});

describe('RadialMesh 힘 적용', () => {
  it('탭 충격파는 탭 지점에서 바깥 방향으로 힘을 준다', () => {
    const mesh = new RadialMesh({ cx: 0, cy: 0, radius: 100, pointCount: 4 });
    mesh.applyShockwave(0, 0, 1000);
    const right = mesh.points[0]; // 각도 0 → (100, 0)
    expect(right.fx).toBeGreaterThan(0);
    expect(Math.abs(right.fy)).toBeLessThan(1e-9);
  });

  it('centroid는 현재 제어점 위치를 따른다', () => {
    const mesh = new RadialMesh({ cx: 50, cy: 50, radius: 100, pointCount: 8 });
    for (const p of mesh.points) p.y += 10;
    const c = mesh.centroid();
    expect(c.x).toBeCloseTo(50);
    expect(c.y).toBeCloseTo(60);
  });
});
