import { useSlimeEngine } from '../hooks/useSlimeEngine';
import type { ResolvedSlime } from '../types/slime';

interface Props {
  slime: ResolvedSlime;
}

export function SlimeCanvas({ slime }: Props) {
  const { canvasRef } = useSlimeEngine(slime);

  return (
    <canvas
      ref={canvasRef}
      className="play__canvas"
      style={{
        background: slime.visual.secondaryColor + '18',
        touchAction: 'none',
      }}
    />
  );
}
