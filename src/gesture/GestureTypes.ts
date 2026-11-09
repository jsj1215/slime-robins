export type GestureType = 'idle' | 'press' | 'drag' | 'stretch' | 'tap' | 'shake';

export interface GestureEvent {
  type: GestureType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pressure: number;
  distance: number;
  duration: number;
  speed: number;
}

export type GestureCallback = (event: GestureEvent) => void;
