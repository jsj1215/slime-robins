import { describe, it, expect, vi } from 'vitest';
import { GestureAudioMapper } from './GestureAudioMapper';
import type { ActiveSound, SoundBank } from './SlimeSoundBank';
import type { GestureEvent, GestureType } from '../gesture/GestureTypes';

function fakeSound() {
  return {
    stop: vi.fn<ActiveSound['stop']>(),
    updateParam: vi.fn<ActiveSound['updateParam']>(),
  };
}

function createFakeBank() {
  const started: Array<{ kind: string; sound: ReturnType<typeof fakeSound> }> = [];
  const make = (kind: string) => () => {
    const sound = fakeSound();
    started.push({ kind, sound });
    return sound;
  };
  const bank: SoundBank = {
    startDrag: vi.fn(make('drag')),
    playPress: vi.fn(make('press')),
    playStretch: vi.fn(make('stretch')),
    playTap: vi.fn(),
    playShake: vi.fn(),
  };
  return { bank, started };
}

const evt = (type: GestureType, extra: Partial<GestureEvent> = {}): GestureEvent => ({
  type, x: 0, y: 0, vx: 0, vy: 0, pressure: 0.5, distance: 0, duration: 0, speed: 0, ...extra,
});

describe('GestureAudioMapper', () => {
  it('press 중에 drag가 오면 press 소리를 멈추고 drag 소리를 시작한다', () => {
    const { bank, started } = createFakeBank();
    const mapper = new GestureAudioMapper(bank);

    mapper.onGesture(evt('press'));
    mapper.onGesture(evt('press'));
    expect(bank.playPress).toHaveBeenCalledTimes(1);

    mapper.onGesture(evt('drag', { speed: 300 }));
    expect(started.map((s) => s.kind)).toEqual(['press', 'drag']);
    expect(started[0].sound.stop).toHaveBeenCalledTimes(1);
    expect(started[1].sound.updateParam).toHaveBeenCalledWith(300, 0.5);

    // 같은 종류가 이어지면 새로 시작하지 않는다
    mapper.onGesture(evt('drag', { speed: 100 }));
    expect(bank.startDrag).toHaveBeenCalledTimes(1);
  });

  it('stretch의 updateParam에는 거리가 들어간다', () => {
    const { bank, started } = createFakeBank();
    const mapper = new GestureAudioMapper(bank);
    mapper.onGesture(evt('stretch', { distance: 140, speed: 999 }));
    expect(started[0].sound.updateParam).toHaveBeenCalledWith(140, 0.5);
  });

  it('idle이 오면 지속음을 멈추고, 다음 제스처는 새 소리로 시작한다', () => {
    const { bank, started } = createFakeBank();
    const mapper = new GestureAudioMapper(bank);
    mapper.onGesture(evt('drag'));
    mapper.onGesture(evt('idle'));
    expect(started[0].sound.stop).toHaveBeenCalledTimes(1);
    mapper.onGesture(evt('drag'));
    expect(bank.startDrag).toHaveBeenCalledTimes(2);
  });

  it('tap과 shake는 지속음과 별개로 한 번씩 재생한다', () => {
    const { bank } = createFakeBank();
    const mapper = new GestureAudioMapper(bank);
    mapper.onGesture(evt('tap'));
    mapper.onGesture(evt('shake'));
    expect(bank.playTap).toHaveBeenCalledTimes(1);
    expect(bank.playShake).toHaveBeenCalledTimes(1);
  });

  it('오디오 쪽 예외는 밖으로 던지지 않는다', () => {
    const { bank } = createFakeBank();
    bank.playTap = () => { throw new Error('no audio'); };
    const mapper = new GestureAudioMapper(bank);
    expect(() => mapper.onGesture(evt('tap'))).not.toThrow();
  });
});
