import { describe, it, expect, beforeEach } from 'vitest';
import { GestureRecognizer, PRESS_DELAY_MS, SHAKE_WINDOW_MS } from './GestureRecognizer';
import { createPointerState, type PointerState } from './PointerTracker';
import type { GestureEvent, GestureType } from './GestureTypes';

// 시간과 타이머를 직접 진행시키는 테스트용 시계
function createClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    timers: {
      setTimeout: (fn: () => void, ms: number) => {
        const id = nextId++;
        timers.set(id, { at: now + ms, fn });
        return id;
      },
      clearTimeout: (id: unknown) => { timers.delete(id as number); },
    },
    advance(ms: number) {
      now += ms;
      for (const [id, t] of [...timers]) {
        if (t.at <= now) { timers.delete(id); t.fn(); }
      }
    },
  };
}

const CX = 200;
const CY = 200;
const RADIUS = 120;

describe('GestureRecognizer', () => {
  let clock: ReturnType<typeof createClock>;
  let events: GestureEvent[];
  let rec: GestureRecognizer;
  let ptr: PointerState;

  const types = () => events.map((e) => e.type);
  const count = (t: GestureType) => events.filter((e) => e.type === t).length;

  const down = (x: number, y: number) => {
    ptr = createPointerState();
    ptr.active = true;
    ptr.x = ptr.startX = x;
    ptr.y = ptr.startY = y;
    ptr.startTime = clock.now();
    rec.onDown(ptr, CX, CY);
  };
  const move = (x: number, y: number, vx = 0, vy = 0) => {
    ptr.x = x; ptr.y = y; ptr.vx = vx; ptr.vy = vy;
    ptr.speed = Math.hypot(vx, vy);
    rec.onMove(ptr, CX, CY);
  };
  const up = () => {
    ptr.active = false;
    ptr.downTime = clock.now() - ptr.startTime;
    rec.onUp(ptr);
  };

  beforeEach(() => {
    clock = createClock();
    events = [];
    rec = new GestureRecognizer((e) => events.push(e), RADIUS, clock.now, clock.timers);
  });

  it('짧게 누르고 떼면 tap 후 idle', () => {
    down(CX, CY);
    clock.advance(100);
    up();
    expect(types()).toEqual(['tap', 'idle']);
  });

  it('탭 판정 시간 안의 작은 떨림은 press를 만들지 않고 tap으로 끝난다', () => {
    down(CX, CY);
    clock.advance(50);
    move(CX + 3, CY + 2);
    clock.advance(50);
    up();
    expect(types()).toEqual(['tap', 'idle']);
  });

  it('움직이지 않고 꾹 누르고 있으면 press가 나오고, 뗄 때 tap은 나오지 않는다', () => {
    down(CX, CY);
    clock.advance(PRESS_DELAY_MS - 1);
    expect(count('press')).toBe(0);
    clock.advance(1);
    expect(types()).toEqual(['press']);
    clock.advance(500);
    up();
    expect(types()).toEqual(['press', 'idle']);
  });

  it('누른 뒤 일정 거리 넘게 움직이면 drag', () => {
    down(CX, CY);
    move(CX + 30, CY, 300, 0);
    move(CX + 40, CY, 300, 0);
    expect(count('drag')).toBe(2);
    up();
    expect(count('tap')).toBe(0);
  });

  it('드래그로 바뀌면 대기 중이던 press 타이머는 취소된다', () => {
    down(CX, CY);
    move(CX + 30, CY, 30, 0);
    clock.advance(PRESS_DELAY_MS * 2);
    expect(count('press')).toBe(0);
  });

  it('가장자리에서 시작하면 stretch', () => {
    down(CX + RADIUS * 0.9, CY);
    move(CX + RADIUS * 1.5, CY, 200, 0);
    expect(types()).toEqual(['stretch']);
    expect(events[0].distance).toBeCloseTo(RADIUS * 1.5);
    // 가장자리 누르기는 press 타이머를 걸지 않는다
    clock.advance(PRESS_DELAY_MS * 2);
    expect(count('press')).toBe(0);
  });

  it('방향 전환 2번으로는 shake가 아니고, 실제 3번 바뀌어야 shake', () => {
    down(CX, CY);
    move(CX + 20, CY, 400);   // 첫 방향: 기준일 뿐 전환 아님
    clock.advance(50);
    move(CX, CY, -400);       // 전환 1
    clock.advance(50);
    move(CX + 20, CY, 400);   // 전환 2
    expect(count('shake')).toBe(0);
    clock.advance(50);
    move(CX, CY, -400);       // 전환 3
    expect(count('shake')).toBe(1);
  });

  it('느린 좌우 움직임(속도 조건 미달)은 shake로 세지 않는다', () => {
    down(CX, CY);
    for (let i = 0; i < 6; i++) {
      clock.advance(40);
      move(CX + (i % 2 === 0 ? 20 : 0), CY, i % 2 === 0 ? 30 : -30);
    }
    expect(count('shake')).toBe(0);
  });

  it('방향 전환 사이가 시간 창보다 길면 shake가 아니다', () => {
    down(CX, CY);
    move(CX + 20, CY, 400);
    for (let i = 0; i < 3; i++) {
      clock.advance(SHAKE_WINDOW_MS);
      move(CX + (i % 2 === 0 ? 0 : 20), CY, i % 2 === 0 ? -400 : 400);
    }
    expect(count('shake')).toBe(0);
  });
});
