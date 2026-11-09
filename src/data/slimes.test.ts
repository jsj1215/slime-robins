import { describe, it, expect } from 'vitest';
import { SLIMES, resolveSlime, getAllResolved } from './slimes';
import { ARCHETYPES, getArchetype } from './archetypes';

describe('resolveSlime', () => {
  it('슬라임은 31종이고 id가 겹치지 않는다', () => {
    expect(SLIMES).toHaveLength(31);
    expect(new Set(SLIMES.map((s) => s.id)).size).toBe(31);
    expect(getAllResolved()).toHaveLength(31);
  });

  it('모든 슬라임이 존재하는 아키타입을 가리킨다', () => {
    const ids = new Set(ARCHETYPES.map((a) => a.id));
    for (const s of SLIMES) expect(ids.has(s.archetypeId)).toBe(true);
  });

  it('아키타입 기본값 위에 슬라임이 지정한 값만 덮어쓴다', () => {
    for (const s of SLIMES) {
      const a = getArchetype(s.archetypeId);
      const r = resolveSlime(s);
      expect(r.physics).toEqual({ ...a.physics, ...s.physics });
      expect(r.sound).toEqual({ ...a.sound, ...s.sound });
      expect(r.visual).toEqual({ ...a.visual, ...s.visual });
    }
    // 구체 사례: 2번은 viscosity만 바꾸고 나머지 물리값은 아키타입 1을 따른다
    const mango = resolveSlime(SLIMES.find((s) => s.id === 2)!);
    const base = getArchetype(1);
    expect(mango.physics.viscosity).toBe(0.85);
    expect(mango.physics.gravity).toBe(base.physics.gravity);
    expect(mango.sound.pitchRange).toEqual(base.sound.pitchRange);
  });

  it('병합 결과의 물리/사운드 값이 엔진이 기대하는 범위 안에 있다', () => {
    for (const r of getAllResolved()) {
      expect(r.physics.restoreStrength).toBeGreaterThanOrEqual(0);
      expect(r.physics.restoreStrength).toBeLessThanOrEqual(1);
      const [lo, hi] = r.sound.pitchRange;
      expect(lo).toBeLessThan(hi);
      expect(r.sound.attackTime).toBeGreaterThan(0);
      expect(r.sound.releaseTime).toBeGreaterThan(0);
    }
  });
});
