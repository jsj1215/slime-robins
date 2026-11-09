import type { ResolvedSlime } from '../types/slime';

interface Props {
  slime: ResolvedSlime;
  onSelect: (slime: ResolvedSlime) => void;
}

export function IceCreamCup({ slime, onSelect }: Props) {
  const num = String(slime.id).padStart(2, '0');

  return (
    <button
      className="cup"
      onClick={() => onSelect(slime)}
      aria-label={`No.${num} ${slime.name} 선택`}
    >
      {/* Number badge */}
      <span className="cup__num">No.{num}</span>

      {/* Scoop */}
      <div
        className="cup__scoop"
        style={{
          background: `radial-gradient(circle at 36% 30%, ${slime.visual.secondaryColor}99, ${slime.visual.primaryColor} 72%)`,
          boxShadow: `0 5px 16px ${slime.visual.primaryColor}55`,
          opacity: slime.visual.opacity,
        }}
      >
        <div className="cup__gloss" style={{ opacity: slime.visual.glossiness * 0.65 }} />
        <span className="cup__emoji" role="img" aria-hidden="true">{slime.emoji}</span>
      </div>

      {/* Waffle cone */}
      <div className="cup__cone" aria-hidden="true" />

      {/* Labels */}
      <div className="cup__body">
        <div className="cup__name">{slime.name}</div>
        <div className="cup__flavor">{slime.flavor}</div>
      </div>
    </button>
  );
}
