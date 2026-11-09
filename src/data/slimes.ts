import type { SlimeType, ResolvedSlime } from '../types/slime';
import { getArchetype } from './archetypes';

// Each slime has a unique sound signature via baseFrequency + oscillatorType + noiseAmount
export const SLIMES: SlimeType[] = [
  // === 쫀득 그룹 (archetypeId: 1) — 저음 sine, 끈적한 느낌 ===
  { id: 1, archetypeId: 1, name: '쫀쫀베리', flavor: '딸기 쫀득이', emoji: '🍓',
    visual: { primaryColor: '#E8536A', secondaryColor: '#C73050' },
    physics: {}, sound: { baseFrequency: 82, oscillatorType: 'sine', noiseAmount: 0.35 } },
  { id: 2, archetypeId: 1, name: '찐득망고', flavor: '망고 찐득이', emoji: '🥭',
    visual: { primaryColor: '#FFAA00', secondaryColor: '#E08800' },
    physics: { viscosity: 0.85 }, sound: { baseFrequency: 96, oscillatorType: 'sine', noiseAmount: 0.45 } },
  { id: 3, archetypeId: 1, name: '꿀떡바닐라', flavor: '바닐라 꿀떡이', emoji: '🍯',
    visual: { primaryColor: '#F5E6C8', secondaryColor: '#D4B896' },
    physics: { restoreStrength: 0.04 }, sound: { baseFrequency: 108, oscillatorType: 'triangle', noiseAmount: 0.3 } },
  { id: 4, archetypeId: 1, name: '카라멜리즈', flavor: '카라멜 리즈', emoji: '🍮',
    visual: { primaryColor: '#C8824A', secondaryColor: '#A05A28' },
    physics: {}, sound: { baseFrequency: 72, oscillatorType: 'sine', filterFrequency: 320, noiseAmount: 0.5 } },
  { id: 5, archetypeId: 1, name: '떡살초코', flavor: '초코 떡살이', emoji: '🍫',
    visual: { primaryColor: '#4A2C17', secondaryColor: '#2E1A0A' },
    physics: { viscosity: 0.9 }, sound: { baseFrequency: 60, oscillatorType: 'sine', noiseAmount: 0.6, filterFrequency: 280 } },
  { id: 6, archetypeId: 1, name: '젤리곰민트', flavor: '민트 젤리곰', emoji: '🐻',
    visual: { primaryColor: '#A8E6CF', secondaryColor: '#6DC4A0' },
    physics: {}, sound: { baseFrequency: 138, oscillatorType: 'triangle', noiseAmount: 0.25 } },

  // === 탱탱 그룹 (archetypeId: 2) — 중음 square, 통통한 느낌 ===
  { id: 7, archetypeId: 2, name: '탱탱볼', flavor: '레몬 탱탱이', emoji: '🍋',
    visual: { primaryColor: '#FFE44D', secondaryColor: '#DFC030' },
    physics: {}, sound: { baseFrequency: 245, oscillatorType: 'square', noiseAmount: 0.08 } },
  { id: 8, archetypeId: 2, name: '고무공이', flavor: '라임 고무공', emoji: '🟢',
    visual: { primaryColor: '#50C878', secondaryColor: '#35A860' },
    physics: {}, sound: { baseFrequency: 310, oscillatorType: 'square', noiseAmount: 0.05, pitchRange: [250, 520] } },
  { id: 9, archetypeId: 2, name: '방울방울', flavor: '포도 방울이', emoji: '🍇',
    visual: { primaryColor: '#9B59B6', secondaryColor: '#7D3C98' },
    physics: { restoreStrength: 0.45 }, sound: { baseFrequency: 268, oscillatorType: 'triangle', noiseAmount: 0.1 } },
  { id: 10, archetypeId: 2, name: '튕김이', flavor: '오렌지 튕김이', emoji: '🍊',
    visual: { primaryColor: '#FF7F11', secondaryColor: '#E06000' },
    physics: {}, sound: { baseFrequency: 330, oscillatorType: 'square', pitchRange: [260, 580], noiseAmount: 0.07 } },
  { id: 11, archetypeId: 2, name: '스프링젤', flavor: '수박 스프링', emoji: '🍉',
    visual: { primaryColor: '#FF4D6D', secondaryColor: '#2D8A40', opacity: 0.88 },
    physics: {}, sound: { baseFrequency: 288, oscillatorType: 'square', noiseAmount: 0.12, attackTime: 0.018 } },
  { id: 12, archetypeId: 2, name: '젤라틴', flavor: '복숭아 젤라틴', emoji: '🍑',
    visual: { primaryColor: '#FFAB91', secondaryColor: '#E07050' },
    physics: { viscosity: 0.25 }, sound: { baseFrequency: 356, oscillatorType: 'triangle', noiseAmount: 0.06, attackTime: 0.012 } },

  // === 물컹 그룹 (archetypeId: 3) — 고음 sine, 물 느낌 ===
  { id: 13, archetypeId: 3, name: '물컹이', flavor: '블루베리 물컹', emoji: '🫐',
    visual: { primaryColor: '#4169E1', secondaryColor: '#2A4FB8' },
    physics: {}, sound: { baseFrequency: 420, oscillatorType: 'sine', filterQ: 5, noiseAmount: 0.28 } },
  { id: 14, archetypeId: 3, name: '젤리피쉬', flavor: '소다 젤리피쉬', emoji: '🪼',
    visual: { primaryColor: '#B0E0FF', secondaryColor: '#80C0F0', opacity: 0.65 },
    physics: { gravity: 0.4 }, sound: { baseFrequency: 520, oscillatorType: 'sine', filterQ: 9, noiseAmount: 0.2, filterFrequency: 1400 } },
  { id: 15, archetypeId: 3, name: '푸딩이', flavor: '우유 푸딩', emoji: '🍮',
    visual: { primaryColor: '#FFF0C0', secondaryColor: '#E8D090' },
    physics: { viscosity: 0.15 }, sound: { baseFrequency: 375, oscillatorType: 'triangle', filterQ: 4, noiseAmount: 0.35 } },
  { id: 16, archetypeId: 3, name: '물방울', flavor: '민트워터 방울', emoji: '💧',
    visual: { primaryColor: '#00CED1', secondaryColor: '#009090', opacity: 0.7 },
    physics: { restoreStrength: 0.01 }, sound: { baseFrequency: 680, oscillatorType: 'sine', filterFrequency: 1800, filterQ: 7, noiseAmount: 0.15 } },
  { id: 17, archetypeId: 3, name: '슬러시', flavor: '딸기 슬러시', emoji: '🧃',
    visual: { primaryColor: '#FF8FA3', secondaryColor: '#FF5C7A' },
    physics: {}, sound: { baseFrequency: 460, oscillatorType: 'sine', noiseAmount: 0.42, filterQ: 3 } },
  { id: 18, archetypeId: 3, name: '요거트볼', flavor: '플레인 요거트', emoji: '🥛',
    visual: { primaryColor: '#F5F5F5', secondaryColor: '#D0D0D0' },
    physics: { viscosity: 0.12 }, sound: { baseFrequency: 490, oscillatorType: 'triangle', noiseAmount: 0.32, filterFrequency: 1100 } },

  // === 바삭 그룹 (archetypeId: 4) — sawtooth + noise burst ===
  { id: 19, archetypeId: 4, name: '바삭이', flavor: '버터팝콘 바삭', emoji: '🍿',
    visual: { primaryColor: '#F5E642', secondaryColor: '#D4C020' },
    physics: {}, sound: { baseFrequency: 155, oscillatorType: 'sawtooth', noiseAmount: 0.72 } },
  { id: 20, archetypeId: 4, name: '크런치볼', flavor: '시리얼 크런치', emoji: '🥣',
    visual: { primaryColor: '#C8A060', secondaryColor: '#A07840' },
    physics: {}, sound: { baseFrequency: 178, oscillatorType: 'sawtooth', noiseAmount: 0.85, filterFrequency: 2200 } },
  { id: 21, archetypeId: 4, name: '아이스볼', flavor: '민트초코 아이스', emoji: '🍦',
    visual: { primaryColor: '#B0F0E8', secondaryColor: '#80D8CC' },
    physics: {}, sound: { baseFrequency: 205, oscillatorType: 'square', noiseAmount: 0.55, filterFrequency: 1600 } },
  { id: 22, archetypeId: 4, name: '모래성이', flavor: '갈색설탕 모래성', emoji: '🏖️',
    visual: { primaryColor: '#D4A860', secondaryColor: '#B08840' },
    physics: {}, sound: { baseFrequency: 130, oscillatorType: 'sawtooth', noiseAmount: 0.9, filterFrequency: 2800 } },
  { id: 23, archetypeId: 4, name: '비즈볼', flavor: '진주알 비즈', emoji: '⚪',
    visual: { primaryColor: '#F0EEF8', secondaryColor: '#D0CCE8', glossiness: 0.95 },
    physics: { restoreStrength: 0.2 }, sound: { baseFrequency: 240, oscillatorType: 'square', noiseAmount: 0.45, attackTime: 0.004, filterFrequency: 1800 } },
  { id: 24, archetypeId: 4, name: '폼클레이', flavor: '딸기우유 폼클레이', emoji: '🎨',
    visual: { primaryColor: '#FFB6C1', secondaryColor: '#FF9090' },
    physics: { viscosity: 0.65 }, sound: { baseFrequency: 162, oscillatorType: 'sawtooth', noiseAmount: 0.65, filterFrequency: 1200 } },

  // === 부드러움 그룹 (archetypeId: 5) — triangle + 화이트노이즈 ASMR ===
  { id: 25, archetypeId: 5, name: '솜사탕구름', flavor: '블루베리 솜사탕', emoji: '🍭',
    visual: { primaryColor: '#D4A8FF', secondaryColor: '#B070F0' },
    physics: {}, sound: { baseFrequency: 185, oscillatorType: 'triangle', noiseAmount: 0.58, filterFrequency: 550 } },
  { id: 26, archetypeId: 5, name: '구름이', flavor: '바닐라 구름', emoji: '☁️',
    visual: { primaryColor: '#FFFFFF', secondaryColor: '#E8E8E8', opacity: 0.8 },
    physics: {}, sound: { baseFrequency: 210, oscillatorType: 'triangle', noiseAmount: 0.7, filterFrequency: 480 } },
  { id: 27, archetypeId: 5, name: '마시멜로', flavor: '딸기 마시멜로', emoji: '🍬',
    visual: { primaryColor: '#FFD4E8', secondaryColor: '#FFB0CC' },
    physics: { restoreStrength: 0.06 }, sound: { baseFrequency: 198, oscillatorType: 'triangle', noiseAmount: 0.62, attackTime: 0.16 } },
  { id: 28, archetypeId: 5, name: '무스케익', flavor: '초코 무스케익', emoji: '🎂',
    visual: { primaryColor: '#6B3A2A', secondaryColor: '#4A2018' },
    physics: { viscosity: 0.55 }, sound: { baseFrequency: 175, oscillatorType: 'sine', noiseAmount: 0.52, filterFrequency: 420 } },
  { id: 29, archetypeId: 5, name: '크림치즈', flavor: '블루베리 크림치즈', emoji: '🧀',
    visual: { primaryColor: '#FFF4CC', secondaryColor: '#E8D8A0' },
    physics: {}, sound: { baseFrequency: 225, oscillatorType: 'triangle', noiseAmount: 0.48, filterFrequency: 520 } },
  { id: 30, archetypeId: 5, name: '버터볼', flavor: '허니버터', emoji: '🧈',
    visual: { primaryColor: '#FFE0A0', secondaryColor: '#E8C060' },
    physics: {}, sound: { baseFrequency: 192, oscillatorType: 'triangle', noiseAmount: 0.55, filterFrequency: 580 } },

  // === 스페셜 #31 ===
  { id: 31, archetypeId: 1, name: '레인보우카오스', flavor: '🌈 레인보우 31', emoji: '🌈',
    visual: { primaryColor: '#FF0080', secondaryColor: '#00FFFF', opacity: 0.9, glossiness: 1.0 },
    physics: { viscosity: 0.5, meshPoints: 24 },
    sound: { baseFrequency: 200, oscillatorType: 'sawtooth', noiseAmount: 0.3, pitchRange: [50, 900], filterFrequency: 1200, filterQ: 4 } },
];

export function resolveSlime(slime: SlimeType): ResolvedSlime {
  const archetype = getArchetype(slime.archetypeId);
  return {
    id: slime.id,
    name: slime.name,
    flavor: slime.flavor,
    emoji: slime.emoji,
    physics: { ...archetype.physics, ...slime.physics },
    sound: { ...archetype.sound, ...slime.sound },
    visual: { ...archetype.visual, ...slime.visual },
  };
}

export function getAllResolved(): ResolvedSlime[] {
  return SLIMES.map(resolveSlime);
}
