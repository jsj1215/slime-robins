export interface PointerState {
  active: boolean;
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  speed: number;
  pressure: number;
  startTime: number;
  downTime: number;
  history: Array<{ x: number; y: number; t: number }>;
  // 지금 추적 중인 포인터. 두 번째 손가락은 첫 손가락이 떨어질 때까지 무시한다.
  pointerId: number | null;
}

export function createPointerState(): PointerState {
  return {
    active: false, x: 0, y: 0, startX: 0, startY: 0,
    vx: 0, vy: 0, speed: 0, pressure: 0.5,
    startTime: 0, downTime: 0,
    history: [],
    pointerId: null,
  };
}

export function bindPointerTracker(
  canvas: HTMLCanvasElement,
  state: PointerState,
  onDown: () => void,
  onMove: () => void,
  onUp: () => void,
) {
  const toLocal = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    // 멀티터치: 이미 다른 포인터를 추적 중이면 새 포인터는 무시한다.
    if (state.pointerId !== null) return;
    state.pointerId = e.pointerId;
    const pos = toLocal(e);
    const now = performance.now();
    state.active = true;
    state.x = state.startX = pos.x;
    state.y = state.startY = pos.y;
    state.vx = state.vy = state.speed = 0;
    state.pressure = e.pressure > 0 ? e.pressure : 0.5;
    state.startTime = now;
    state.downTime = now;
    state.history = [{ x: pos.x, y: pos.y, t: now }];
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // 이미 해제된 포인터 등으로 캡처가 실패해도 추적 자체는 계속한다.
    }
    onDown();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state.active || e.pointerId !== state.pointerId) return;
    e.preventDefault();
    const pos = toLocal(e);
    const now = performance.now();
    state.history.push({ x: pos.x, y: pos.y, t: now });
    if (state.history.length > 6) state.history.shift();

    if (state.history.length >= 2) {
      const oldest = state.history[0];
      const dt = (now - oldest.t) / 1000;
      if (dt > 0) {
        state.vx = (pos.x - oldest.x) / dt;
        state.vy = (pos.y - oldest.y) / dt;
        state.speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
      }
    }

    state.x = pos.x;
    state.y = pos.y;
    state.pressure = e.pressure > 0 ? e.pressure : 0.5;
    onMove();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!state.active || e.pointerId !== state.pointerId) return;
    state.active = false;
    state.pointerId = null;
    if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    state.downTime = performance.now() - state.startTime;
    onUp();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  // 캡처를 잃으면(다른 요소가 가져감 등) 떼기와 같게 처리해 상태가 'active'로 남지 않게 한다.
  canvas.addEventListener('lostpointercapture', onPointerUp);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('lostpointercapture', onPointerUp);
  };
}
