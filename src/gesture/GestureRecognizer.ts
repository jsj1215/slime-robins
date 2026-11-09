import type { PointerState } from './PointerTracker';
import type { GestureCallback } from './GestureTypes';

export const DRAG_THRESHOLD = 10;
export const TAP_MAX_DURATION = 220;
// 탭과 누르기를 시간으로 나눈다. 이 시간보다 짧게 떼면 탭, 움직이지 않고 이 시간 넘게 누르고 있으면 누르기.
// 누르는 즉시 press를 내보내면 짧은 탭에도 메시가 눌린 모양으로 굳어 버려서 탭 판정 시간과 맞췄다.
export const PRESS_DELAY_MS = TAP_MAX_DURATION;
export const SHAKE_REVERSALS = 3;
export const SHAKE_WINDOW_MS = 600;
export const SHAKE_MIN_SPEED = 50; // px/s, 이보다 느린 좌우 움직임은 방향 전환으로 세지 않음

type TimerApi = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

const defaultTimers: TimerApi = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export class GestureRecognizer {
  private state: 'idle' | 'pressing' | 'dragging' | 'stretching' = 'idle';
  private callback: GestureCallback;
  private reversalTimes: number[] = [];
  private lastDirX = 0;
  private slimeEdgeRadius: number;
  private now: () => number;
  private timers: TimerApi;
  private pressTimer: unknown = null;

  // now/timers는 테스트에서 시간을 직접 제어하려고 주입할 수 있게 열어 두었다.
  constructor(
    callback: GestureCallback,
    slimeEdgeRadius: number,
    now: () => number = () => performance.now(),
    timers: TimerApi = defaultTimers,
  ) {
    this.callback = callback;
    this.slimeEdgeRadius = slimeEdgeRadius;
    this.now = now;
    this.timers = timers;
  }

  onDown(ptr: PointerState, cx: number, cy: number) {
    const dx = ptr.x - cx;
    const dy = ptr.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const onEdge = dist > this.slimeEdgeRadius * 0.65;
    this.state = onEdge ? 'stretching' : 'pressing';
    this.reversalTimes = [];
    this.lastDirX = 0;
    this.clearPressTimer();

    if (this.state === 'pressing') {
      // 움직이지 않고 꾹 누르고 있어도 누르기 피드백이 나오도록 지연 후 press를 한 번 보낸다.
      this.pressTimer = this.timers.setTimeout(() => {
        this.pressTimer = null;
        if (this.state === 'pressing') this.emitPress(ptr);
      }, PRESS_DELAY_MS);
    }
  }

  onMove(ptr: PointerState, cx: number, cy: number) {
    const dx = ptr.x - ptr.startX;
    const dy = ptr.y - ptr.startY;
    const totalDist = Math.sqrt(dx * dx + dy * dy);
    const now = this.now();

    // 흔들기: 첫 움직임은 기준 방향일 뿐이므로 세지 않고, 실제로 방향이 뒤집힌 횟수만 센다.
    if (this.state === 'dragging' || this.state === 'pressing') {
      const dirX = ptr.vx > SHAKE_MIN_SPEED ? 1 : ptr.vx < -SHAKE_MIN_SPEED ? -1 : 0;
      if (dirX !== 0 && dirX !== this.lastDirX) {
        if (this.lastDirX !== 0) {
          this.reversalTimes.push(now);
          this.reversalTimes = this.reversalTimes.filter((t) => now - t < SHAKE_WINDOW_MS);
        }
        this.lastDirX = dirX;
        if (this.reversalTimes.length >= SHAKE_REVERSALS) {
          this.reversalTimes = [];
          this.callback({ type: 'shake', x: ptr.x, y: ptr.y, vx: ptr.vx, vy: ptr.vy,
            pressure: ptr.pressure, distance: totalDist, duration: 0, speed: ptr.speed });
          return;
        }
      }
    }

    if (this.state === 'pressing' && totalDist > DRAG_THRESHOLD) {
      this.state = 'dragging';
      this.clearPressTimer();
    }

    if (this.state === 'dragging') {
      this.callback({ type: 'drag', x: ptr.x, y: ptr.y, vx: ptr.vx, vy: ptr.vy,
        pressure: ptr.pressure, distance: totalDist, duration: now - ptr.startTime, speed: ptr.speed });
    } else if (this.state === 'pressing') {
      // 탭 판정 시간 안의 작은 떨림은 press로 보내지 않는다 (탭이 눌린 자국을 남기지 않도록).
      if (now - ptr.startTime >= PRESS_DELAY_MS) this.emitPress(ptr);
    } else if (this.state === 'stretching') {
      const distFromCenter = Math.sqrt((ptr.x - cx) ** 2 + (ptr.y - cy) ** 2);
      this.callback({ type: 'stretch', x: ptr.x, y: ptr.y, vx: ptr.vx, vy: ptr.vy,
        pressure: ptr.pressure, distance: distFromCenter, duration: now - ptr.startTime, speed: ptr.speed });
    }
  }

  onUp(ptr: PointerState) {
    this.clearPressTimer();
    const duration = ptr.downTime || (this.now() - ptr.startTime);

    if (this.state === 'pressing' && duration < TAP_MAX_DURATION) {
      this.callback({ type: 'tap', x: ptr.x, y: ptr.y, vx: 0, vy: 0,
        pressure: ptr.pressure, distance: 0, duration, speed: 0 });
    }

    this.state = 'idle';
    this.callback({ type: 'idle', x: ptr.x, y: ptr.y, vx: 0, vy: 0,
      pressure: 0, distance: 0, duration: 0, speed: 0 });
  }

  dispose() {
    this.clearPressTimer();
    this.state = 'idle';
  }

  private emitPress(ptr: PointerState) {
    this.callback({ type: 'press', x: ptr.x, y: ptr.y, vx: 0, vy: 0,
      pressure: ptr.pressure, distance: 0, duration: this.now() - ptr.startTime, speed: 0 });
  }

  private clearPressTimer() {
    if (this.pressTimer !== null) {
      this.timers.clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }
}
