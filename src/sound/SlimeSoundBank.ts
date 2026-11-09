import { AudioEngine } from './AudioEngine';
import type { SoundConfig } from '../types/slime';

export interface ActiveSound {
  stop: () => void;
  updateParam: (velocity: number, pressure: number) => void;
}

/** 소리를 낼 수 없을 때(Web Audio 미지원 등) 돌려주는 빈 사운드 */
const NOOP_SOUND: ActiveSound = { stop: () => undefined, updateParam: () => undefined };

export interface SoundBank {
  startDrag(): ActiveSound;
  playPress(pressure: number): ActiveSound;
  playStretch(): ActiveSound;
  playTap(): void;
  playShake(): void;
}

type NoiseColor = 'brown' | 'pink' | 'white';

// 노이즈 버퍼(2~3초 분량)를 제스처마다 새로 계산하면 매번 수십만 샘플을 만들어야 한다.
// 컨텍스트별로 색깔당 한 번만 만들어 두고, 제스처마다 가벼운 BufferSource만 새로 만든다.
const noiseCache = new WeakMap<BaseAudioContext, Partial<Record<NoiseColor, AudioBuffer>>>();

function buildNoiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  const size = ctx.sampleRate * (color === 'white' ? 2 : 3);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  if (color === 'brown') {
    // 브라운 노이즈 — 묵직하고 끈적한 소리
    let last = 0;
    for (let i = 0; i < size; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  } else if (color === 'pink') {
    // 핑크 노이즈 — 조금 더 밝고 물기 있는 소리
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < size; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + w * 0.5362) * 0.11;
    }
  } else {
    // 화이트 노이즈 — 바삭바삭한 소리
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function createNoise(ctx: AudioContext, color: NoiseColor): AudioBufferSourceNode {
  let entry = noiseCache.get(ctx);
  if (!entry) { entry = {}; noiseCache.set(ctx, entry); }
  let buf = entry[color];
  if (!buf) { buf = buildNoiseBuffer(ctx, color); entry[color] = buf; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

// 소스가 끝나면 체인 노드를 끊어 그래프에 남지 않게 한다. 여러 소스가 같은 노드를 공유하면
// 마지막 소스가 끝날 때 끊는다.
function disconnectOnEnded(sources: AudioScheduledSourceNode[], nodes: AudioNode[]) {
  let remaining = sources.length;
  for (const src of sources) {
    src.onended = () => {
      src.disconnect();
      remaining -= 1;
      if (remaining === 0) for (const n of nodes) n.disconnect();
    };
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

export class SlimeSoundBank implements SoundBank {
  private config: SoundConfig;

  constructor(config: SoundConfig) { this.config = config; }

  startDrag(): ActiveSound {
    const ctx = AudioEngine.context;
    const out = AudioEngine.destination;
    if (!ctx || !out) return NOOP_SOUND;
    const now = ctx.currentTime;
    const cfg = this.config;
    const [pitchLo, pitchHi] = cfg.pitchRange;
    // 기본 음높이를 pitchRange 안으로 맞춘 뒤, 드래그 속도에 따라 pitchHi까지 올린다.
    const pitchBase = clamp(cfg.baseFrequency, pitchLo, pitchHi);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(cfg.volume * 0.65, now + cfg.attackTime);
    masterGain.connect(out);

    // 슬라임마다 소리를 가르는 핵심 필터. filterFrequency가 높으면 바삭하고, 낮으면 끈적하다.
    const mainFilter = ctx.createBiquadFilter();
    mainFilter.type = 'lowpass';
    mainFilter.frequency.value = cfg.filterFrequency;
    mainFilter.Q.value = cfg.filterQ;
    mainFilter.connect(masterGain);

    // 필터 컷오프를 천천히 흔드는 LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.5 + Math.random() * 2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = cfg.filterFrequency * 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(mainFilter.frequency);
    lfo.start();

    // noiseAmount < 0.4 → 브라운, 0.4~0.7 → 핑크, > 0.7 → 화이트
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = cfg.noiseAmount > 0.7 ? 0.9 : cfg.noiseAmount > 0.4 ? 0.7 : 0.55;
    noiseGain.connect(mainFilter);
    const noise = createNoise(ctx, cfg.noiseAmount > 0.7 ? 'white' : cfg.noiseAmount > 0.4 ? 'pink' : 'brown');
    noise.connect(noiseGain);
    noise.start();

    // 음색 오실레이터 — square/sawtooth는 존재감 있게, sine/triangle은 은은하게
    const oscGain = ctx.createGain();
    oscGain.gain.value = (cfg.oscillatorType === 'square' || cfg.oscillatorType === 'sawtooth') ? 0.22 : 0.08;
    oscGain.connect(mainFilter);
    const osc = ctx.createOscillator();
    osc.type = cfg.oscillatorType;
    osc.frequency.value = pitchBase;
    osc.connect(oscGain);
    osc.start();

    disconnectOnEnded([lfo, noise, osc], [lfoGain, noiseGain, oscGain, mainFilter, masterGain]);

    let stopped = false;
    return {
      updateParam: (velocity: number, pressure: number) => {
        if (stopped) return;
        const t = ctx.currentTime;
        const speed = Math.min(velocity / 600, 1);
        // 빠르게 끌수록 필터가 열려 더 밝은 소리가 난다
        mainFilter.frequency.setTargetAtTime(cfg.filterFrequency * (0.55 + speed * 1.3), t, 0.04);
        osc.frequency.setTargetAtTime(pitchBase + (pitchHi - pitchBase) * speed, t, 0.05);
        masterGain.gain.setTargetAtTime(cfg.volume * (0.5 + pressure * 0.5), t, 0.05);
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        // setTargetAtTime은 시간 상수의 약 3배에서 거의 0이 되므로 releaseTime/3을 쓴다
        masterGain.gain.setTargetAtTime(0, t, cfg.releaseTime / 3);
        const end = t + cfg.releaseTime + 0.05;
        lfo.stop(end); noise.stop(end); osc.stop(end);
      },
    };
  }

  playPress(pressure: number): ActiveSound {
    const ctx = AudioEngine.context;
    const out = AudioEngine.destination;
    if (!ctx || !out) return NOOP_SOUND;
    const now = ctx.currentTime;
    const cfg = this.config;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(cfg.volume * 0.65 * pressure, now + cfg.attackTime);
    gain.connect(out);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cfg.filterFrequency * 1.3, now);
    filter.frequency.exponentialRampToValueAtTime(cfg.filterFrequency * 0.28, now + 0.2);
    filter.Q.value = cfg.filterQ * 1.8;
    filter.connect(gain);

    const noise = createNoise(ctx, cfg.noiseAmount > 0.5 ? 'pink' : 'brown');
    noise.connect(filter);
    noise.start();
    disconnectOnEnded([noise], [filter, gain]);

    // 누르는 순간의 '퉁' 소리 — 슬라임 고유 음높이를 쓴다
    const thud = ctx.createOscillator();
    thud.type = cfg.oscillatorType;
    thud.frequency.setValueAtTime(cfg.baseFrequency * 0.9, now);
    thud.frequency.exponentialRampToValueAtTime(cfg.baseFrequency * 0.3, now + 0.25);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(cfg.volume * 0.45 * pressure, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    thud.connect(thudGain);
    thudGain.connect(out);
    thud.start(now);
    thud.stop(now + 0.3);
    disconnectOnEnded([thud], [thudGain]);

    let stopped = false;
    return {
      // 누르기 소리는 속도와 무관하고 압력에만 반응한다 (첫 인자는 인터페이스 자리 맞춤)
      updateParam: (_velocity: number, p: number) => {
        if (stopped) return;
        gain.gain.setTargetAtTime(cfg.volume * 0.5 * p, ctx.currentTime, 0.08);
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        gain.gain.setTargetAtTime(0, t, cfg.releaseTime / 3);
        noise.stop(t + cfg.releaseTime + 0.05);
      },
    };
  }

  playTap() {
    const ctx = AudioEngine.context;
    const out = AudioEngine.destination;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const cfg = this.config;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(cfg.volume * 0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    gain.connect(out);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cfg.filterFrequency * 1.6, now);
    filter.frequency.exponentialRampToValueAtTime(cfg.filterFrequency * 0.35, now + 0.16);
    filter.Q.value = Math.max(cfg.filterQ * 0.8, 1);
    filter.connect(gain);

    const noise = createNoise(ctx, cfg.noiseAmount > 0.55 ? 'pink' : 'brown');
    noise.connect(filter);
    noise.start(now);
    noise.stop(now + 0.28);
    disconnectOnEnded([noise], [filter, gain]);

    const osc = ctx.createOscillator();
    osc.type = cfg.oscillatorType;
    osc.frequency.setValueAtTime(cfg.baseFrequency * 1.4, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.baseFrequency * 0.45, now + 0.14);
    const og = ctx.createGain();
    og.gain.setValueAtTime(cfg.volume * 0.5, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(og);
    og.connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
    disconnectOnEnded([osc], [og]);
  }

  playStretch(): ActiveSound {
    const ctx = AudioEngine.context;
    const out = AudioEngine.destination;
    if (!ctx || !out) return NOOP_SOUND;
    const now = ctx.currentTime;
    const cfg = this.config;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(cfg.volume * 0.48, now + cfg.attackTime);
    gain.connect(out);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cfg.filterFrequency * 0.45;
    filter.Q.value = cfg.filterQ * 0.7;
    filter.connect(gain);

    const noise = createNoise(ctx, 'brown');
    noise.connect(filter);
    noise.start();
    disconnectOnEnded([noise], [filter, gain]);

    let stopped = false;
    return {
      // 늘이기에서는 velocity 자리에 중심으로부터의 거리가 들어온다
      updateParam: (distance: number) => {
        if (stopped) return;
        const d = Math.min(distance / 280, 1);
        // 많이 늘일수록(얇아질수록) 필터가 열려 소리가 밝아진다
        filter.frequency.setTargetAtTime(cfg.filterFrequency * (0.45 + d * 1.1), ctx.currentTime, 0.06);
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        // 손을 놓을 때 '톡' 끊어지는 소리
        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(cfg.volume * 0.38, t);
        snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        snapGain.connect(out);
        const snapF = ctx.createBiquadFilter();
        snapF.type = 'highpass';
        snapF.frequency.value = cfg.filterFrequency * 0.8;
        snapF.connect(snapGain);
        const snap = createNoise(ctx, 'pink');
        snap.connect(snapF);
        snap.start(t);
        snap.stop(t + 0.12);
        disconnectOnEnded([snap], [snapF, snapGain]);

        gain.gain.setTargetAtTime(0, t, cfg.releaseTime / 4);
        noise.stop(t + cfg.releaseTime * 0.6 + 0.05);
      },
    };
  }

  playShake() {
    const ctx = AudioEngine.context;
    const out = AudioEngine.destination;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const cfg = this.config;
    const dur = 0.48;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(cfg.volume * 0.6, now);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    gain.connect(out);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cfg.filterFrequency;
    filter.Q.value = cfg.filterQ;
    filter.connect(gain);

    // 공명(filterQ)이 클수록 더 빠르게 출렁이는 LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 10 + cfg.filterQ * 1.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = cfg.filterFrequency * 0.6;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    lfo.stop(now + dur);

    const noise = createNoise(ctx, cfg.noiseAmount > 0.5 ? 'pink' : 'brown');
    noise.connect(filter);
    noise.start(now);
    noise.stop(now + dur + 0.05);
    disconnectOnEnded([lfo, noise], [lfoGain, filter, gain]);
  }
}
