import type { ActiveSound, SoundBank } from './SlimeSoundBank';
import type { GestureEvent, GestureType } from '../gesture/GestureTypes';

type SustainedKind = Extract<GestureType, 'press' | 'drag' | 'stretch'>;

export class GestureAudioMapper {
  private bank: SoundBank;
  private activeSound: ActiveSound | null = null;
  // 지금 울리는 지속음의 종류. 누르다가 끌기 시작하면 누르기 소리를 끄고 끌기 소리로 바꿔야 한다.
  private activeKind: SustainedKind | null = null;

  constructor(bank: SoundBank) {
    this.bank = bank;
  }

  onGesture(event: GestureEvent) {
    // 소리는 부가 피드백이라, 오디오 쪽 예외가 제스처 처리 흐름을 깨지 않게 여기서 막는다.
    try {
      this.handle(event);
    } catch {
      this.activeSound = null;
      this.activeKind = null;
    }
  }

  private handle(event: GestureEvent) {
    switch (event.type) {
      case 'drag':
        this.ensure('drag', () => this.bank.startDrag()).updateParam(event.speed, event.pressure);
        break;
      case 'press':
        this.ensure('press', () => this.bank.playPress(event.pressure)).updateParam(event.speed, event.pressure);
        break;
      case 'stretch':
        this.ensure('stretch', () => this.bank.playStretch()).updateParam(event.distance, event.pressure);
        break;
      case 'tap':
        this.bank.playTap();
        break;
      case 'shake':
        this.bank.playShake();
        break;
      case 'idle':
        this.stopAll();
        break;
    }
  }

  // 같은 종류면 기존 소리를 이어 쓰고, 종류가 바뀌면 이전 소리를 멈추고 새로 시작한다.
  private ensure(kind: SustainedKind, start: () => ActiveSound): ActiveSound {
    if (this.activeSound && this.activeKind === kind) return this.activeSound;
    this.stopAll();
    this.activeSound = start();
    this.activeKind = kind;
    return this.activeSound;
  }

  stopAll() {
    const sound = this.activeSound;
    this.activeSound = null;
    this.activeKind = null;
    sound?.stop();
  }
}
