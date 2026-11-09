export interface PhysicsConfig {
  meshPoints: number;
  // 탭/흔들기 충격 뒤 원래 모양으로 돌아오는 복원력 (0~1, 클수록 탱탱하게 빨리 돌아옴)
  restoreStrength: number;
  viscosity: number;
  gravity: number;
}

export interface SoundConfig {
  baseFrequency: number;
  oscillatorType: OscillatorType;
  noiseAmount: number;
  filterFrequency: number;
  filterQ: number;
  pitchRange: [number, number];
  attackTime: number;
  releaseTime: number;
  volume: number;
}

export interface VisualConfig {
  primaryColor: string;
  secondaryColor: string;
  opacity: number;
  glossiness: number;
  meshRadius: number;
}

export interface SlimeArchetype {
  id: number;
  name: string;
  physics: PhysicsConfig;
  sound: SoundConfig;
  visual: VisualConfig;
}

export interface SlimeType {
  id: number;
  archetypeId: number;
  name: string;
  flavor: string;
  emoji: string;
  physics: Partial<PhysicsConfig>;
  sound: Partial<SoundConfig>;
  visual: Partial<VisualConfig>;
}

export interface ResolvedSlime {
  id: number;
  name: string;
  flavor: string;
  emoji: string;
  physics: PhysicsConfig;
  sound: SoundConfig;
  visual: VisualConfig;
}
