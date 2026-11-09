import '../styles/showcase.css';
import '../styles/cup.css';
import { IceCreamCup } from '../components/IceCreamCup';
import { getAllResolved } from '../data/slimes';
import type { ResolvedSlime } from '../types/slime';

interface Props {
  onSelect: (slime: ResolvedSlime) => void;
  onHome: () => void;
}

const GROUPS = [
  { name: '🍯 쫀득관', ids: [1, 2, 3, 4, 5, 6] },
  { name: '⚡ 탱탱관', ids: [7, 8, 9, 10, 11, 12] },
  { name: '💧 물컹관', ids: [13, 14, 15, 16, 17, 18] },
  { name: '🍿 바삭관', ids: [19, 20, 21, 22, 23, 24] },
  { name: '☁️ 부드러움관', ids: [25, 26, 27, 28, 29, 30] },
  { name: '🌈 스페셜관', ids: [31] },
];

const ALL_SLIMES = getAllResolved();

export function ShowcaseScreen({ onSelect, onHome }: Props) {
  return (
    <main className="showcase">
      <header className="showcase__header">
        <button className="showcase__home-btn" onClick={onHome} aria-label="메인으로">
          🍦
          <span className="showcase__home-label">
            <span className="showcase__home-top">슬라임</span>
            <span className="showcase__home-bottom">라빈스</span>
          </span>
        </button>
        <p className="showcase__tagline">오늘 기분은 어떤 슬라임인가요? 31가지 기분이 다 있어요</p>
      </header>

      {GROUPS.map((group) => {
        const slimes = ALL_SLIMES.filter((s) => group.ids.includes(s.id));
        return (
          <section key={group.name} className="showcase__section">
            <h2 className="showcase__section-title">{group.name}</h2>
            <div className="showcase__grid">
              {slimes.map((slime) => (
                <IceCreamCup key={slime.id} slime={slime} onSelect={onSelect} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
