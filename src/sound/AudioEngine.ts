type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

class AudioEngineClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  // Web Audio를 쓸 수 없는 환경이면 한 번 실패한 뒤로는 다시 만들지 않고 소리 없이 동작한다.
  private unavailable = false;

  /** 사용할 수 없으면 null. 처음 호출할 때(사용자 제스처 안) 만든다. */
  get context(): AudioContext | null {
    if (this.ctx || this.unavailable) return this.ctx;
    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      this.unavailable = true;
      return null;
    }
    try {
      const ctx = new Ctor();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.8;
      const masterFilter = ctx.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.value = 8000;
      masterGain.connect(masterFilter);
      masterFilter.connect(ctx.destination);
      this.ctx = ctx;
      this.masterGain = masterGain;
    } catch {
      this.unavailable = true;
      this.ctx = null;
    }
    return this.ctx;
  }

  /** context가 있을 때만 의미가 있다. 호출 전에 context를 먼저 확인할 것. */
  get destination(): AudioNode | null {
    return this.context ? this.masterGain : null;
  }

  // iOS Safari는 백그라운드 전환, 전화 수신 등으로 컨텍스트가 'suspended'/'interrupted'가 될 수 있다.
  // 한 번만 resume하고 끝내면 그 뒤로 소리가 안 나므로, 포인터를 누를 때마다 상태를 보고 다시 깨운다.
  resume() {
    const ctx = this.context;
    if (ctx && ctx.state !== 'running') {
      ctx.resume().catch(() => undefined);
    }
  }
}

export const AudioEngine = new AudioEngineClass();
