import { describe, it, expect, vi } from 'vitest';
import { bindPointerTracker, createPointerState } from './PointerTracker';

type Handler = (e: PointerEvent) => void;

// DOM 없이 PointerTracker를 검증하기 위한 최소한의 가짜 캔버스
function createFakeCanvas() {
  const listeners = new Map<string, Handler>();
  const captured = new Set<number>();
  const canvas = {
    addEventListener: (type: string, fn: Handler) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: vi.fn((id: number) => captured.add(id)),
    releasePointerCapture: vi.fn((id: number) => captured.delete(id)),
    hasPointerCapture: (id: number) => captured.has(id),
  };
  const fire = (type: string, pointerId: number, x = 0, y = 0) =>
    listeners.get(type)?.({
      pointerId, clientX: x, clientY: y, pressure: 0.5, preventDefault: () => undefined,
    } as unknown as PointerEvent);
  return { canvas: canvas as unknown as HTMLCanvasElement, raw: canvas, fire, listeners };
}

describe('bindPointerTracker', () => {
  it('첫 포인터에 고정하고, 다른 포인터는 첫 포인터가 떨어질 때까지 무시한다', () => {
    const { canvas, raw, fire } = createFakeCanvas();
    const state = createPointerState();
    const onDown = vi.fn();
    const onMove = vi.fn();
    const onUp = vi.fn();
    bindPointerTracker(canvas, state, onDown, onMove, onUp);

    fire('pointerdown', 1, 10, 10);
    fire('pointerdown', 2, 100, 100); // 두 번째 손가락
    expect(onDown).toHaveBeenCalledTimes(1);
    expect(raw.setPointerCapture).toHaveBeenCalledWith(1);
    expect(raw.setPointerCapture).not.toHaveBeenCalledWith(2);

    fire('pointermove', 2, 150, 150);
    expect(onMove).not.toHaveBeenCalled();
    expect(state.x).toBe(10);

    fire('pointermove', 1, 20, 15);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(state.x).toBe(20);

    fire('pointerup', 2);
    expect(onUp).not.toHaveBeenCalled();

    fire('pointerup', 1);
    expect(onUp).toHaveBeenCalledTimes(1);
    expect(raw.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(state.pointerId).toBeNull();

    // 첫 포인터가 떨어진 뒤에는 새 포인터를 받는다
    fire('pointerdown', 2, 50, 50);
    expect(onDown).toHaveBeenCalledTimes(2);
    expect(state.pointerId).toBe(2);
  });

  it('캡처를 잃으면 떼기로 처리하고, 뒤따르는 pointerup은 중복 처리하지 않는다', () => {
    const { canvas, fire } = createFakeCanvas();
    const state = createPointerState();
    const onUp = vi.fn();
    bindPointerTracker(canvas, state, () => undefined, () => undefined, onUp);
    fire('pointerdown', 7);
    fire('lostpointercapture', 7);
    fire('pointerup', 7);
    expect(onUp).toHaveBeenCalledTimes(1);
    expect(state.active).toBe(false);
  });

  it('해제 함수가 리스너를 모두 제거한다', () => {
    const { canvas, listeners } = createFakeCanvas();
    const unbind = bindPointerTracker(canvas, createPointerState(), () => undefined, () => undefined, () => undefined);
    expect(listeners.size).toBe(5);
    unbind();
    expect(listeners.size).toBe(0);
  });
});
