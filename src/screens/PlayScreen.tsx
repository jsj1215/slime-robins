import '../styles/play.css';
import { BackButton } from '../components/BackButton';
import { SlimeCanvas } from '../components/SlimeCanvas';
import type { ResolvedSlime } from '../types/slime';

interface Props {
  slime: ResolvedSlime;
  onBack: () => void;
}

export function PlayScreen({ slime, onBack }: Props) {
  return (
    <div className="play" style={{ background: slime.visual.primaryColor + '18' }}>
      <SlimeCanvas slime={slime} />
      <div className="play__overlay">
        <BackButton onClick={onBack} />
        <span className="play__slime-name">{slime.emoji} {slime.name}</span>
      </div>
    </div>
  );
}
