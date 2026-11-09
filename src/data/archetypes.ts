import type { SlimeArchetype } from '../types/slime';

export const ARCHETYPES: SlimeArchetype[] = [
  {
    id: 1,
    name: '쫀득',
    physics: {
      meshPoints: 20,
      restoreStrength: 0.05,
      viscosity: 0.8,
      gravity: 0.1,
    },
    sound: {
      baseFrequency: 120,
      oscillatorType: 'sine',
      noiseAmount: 0.4,
      filterFrequency: 400,
      filterQ: 2,
      pitchRange: [80, 200],
      attackTime: 0.08,
      releaseTime: 0.4,
      volume: 0.7,
    },
    visual: {
      primaryColor: '#E8A87C',
      secondaryColor: '#C97B4B',
      opacity: 0.95,
      glossiness: 0.6,
      meshRadius: 120,
    },
  },
  {
    id: 2,
    name: '탱탱',
    physics: {
      meshPoints: 18,
      restoreStrength: 0.4,
      viscosity: 0.2,
      gravity: 0.05,
    },
    sound: {
      baseFrequency: 280,
      oscillatorType: 'square',
      noiseAmount: 0.1,
      filterFrequency: 800,
      filterQ: 3,
      pitchRange: [200, 500],
      attackTime: 0.02,
      releaseTime: 0.15,
      volume: 0.65,
    },
    visual: {
      primaryColor: '#FF6B9D',
      secondaryColor: '#E0457F',
      opacity: 0.9,
      glossiness: 0.85,
      meshRadius: 115,
    },
  },
  {
    id: 3,
    name: '물컹',
    physics: {
      meshPoints: 16,
      restoreStrength: 0.02,
      viscosity: 0.1,
      gravity: 0.3,
    },
    sound: {
      baseFrequency: 440,
      oscillatorType: 'sine',
      noiseAmount: 0.3,
      filterFrequency: 1200,
      filterQ: 6,
      pitchRange: [300, 700],
      attackTime: 0.05,
      releaseTime: 0.5,
      volume: 0.6,
    },
    visual: {
      primaryColor: '#7EC8E3',
      secondaryColor: '#4AABCF',
      opacity: 0.75,
      glossiness: 0.9,
      meshRadius: 130,
    },
  },
  {
    id: 4,
    name: '바삭',
    physics: {
      meshPoints: 22,
      restoreStrength: 0.15,
      viscosity: 0.6,
      gravity: 0.08,
    },
    sound: {
      baseFrequency: 180,
      oscillatorType: 'sawtooth',
      noiseAmount: 0.7,
      filterFrequency: 2000,
      filterQ: 1.5,
      pitchRange: [120, 350],
      attackTime: 0.01,
      releaseTime: 0.1,
      volume: 0.75,
    },
    visual: {
      primaryColor: '#F4E04D',
      secondaryColor: '#D4C030',
      opacity: 0.98,
      glossiness: 0.4,
      meshRadius: 118,
    },
  },
  {
    id: 5,
    name: '부드러움',
    physics: {
      meshPoints: 20,
      restoreStrength: 0.08,
      viscosity: 0.5,
      gravity: 0.06,
    },
    sound: {
      baseFrequency: 220,
      oscillatorType: 'triangle',
      noiseAmount: 0.55,
      filterFrequency: 600,
      filterQ: 1,
      pitchRange: [150, 400],
      attackTime: 0.12,
      releaseTime: 0.6,
      volume: 0.55,
    },
    visual: {
      primaryColor: '#FFB3D9',
      secondaryColor: '#FF85C0',
      opacity: 0.85,
      glossiness: 0.7,
      meshRadius: 122,
    },
  },
];

export function getArchetype(id: number): SlimeArchetype {
  const archetype = ARCHETYPES.find((a) => a.id === id);
  if (!archetype) throw new Error(`Archetype ${id} not found`);
  return archetype;
}
