import '../styles/landing.css';
import { getAllResolved } from '../data/slimes';

interface Props {
  onStart: () => void;
}

const PREVIEW_IDS = [1, 7, 13, 19, 25, 31];
const ALL = getAllResolved();
const PREVIEWS = PREVIEW_IDS.map((id) => ALL.find((s) => s.id === id)!);

export function LandingScreen({ onStart }: Props) {
  // Negative delays = animation already in progress on page load (no waiting)
  const FLOATERS = [
    { emoji: '🍦', d: '-1s',  x: '8%',  s: '52px' },
    { emoji: '🍬', d: '-5s',  x: '78%', s: '38px' },
    { emoji: '🍭', d: '-3s',  x: '50%', s: '46px' },
    { emoji: '🍫', d: '-7s',  x: '88%', s: '34px' },
    { emoji: '🍦', d: '-2s',  x: '22%', s: '42px' },
    { emoji: '🌈', d: '-6s',  x: '65%', s: '36px' },
    { emoji: '🍬', d: '-4s',  x: '35%', s: '30px' },
    { emoji: '✨', d: '-0.5s', x: '92%', s: '28px' },
  ];

  return (
    <div className="landing">
      {/* Floating background icons */}
      <div className="landing__floaters" aria-hidden="true">
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            className="landing__floater"
            style={{ '--fd': f.d, '--fx': f.x, '--fs': f.s } as React.CSSProperties}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <div className="landing__content">

        {/* Slime Robins 로고 — 컨테이너 없이 굵은 글자만 */}
        <div className="landing__logo-wrap">
          <div className="landing__logo">
            <div className="landing__logo-top">
              SLIME
              <span className="landing__logo-31">31</span>
            </div>
            <div className="landing__logo-bottom">ROBINS</div>
          </div>
        </div>

        {/* Slime preview blobs */}
        <div className="landing__blobs">
          {PREVIEWS.map((s, i) => (
            <div
              key={s.id}
              className="landing__blob"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${s.visual.secondaryColor}88, ${s.visual.primaryColor})`,
                animationDelay: `${i * 0.18}s`,
                opacity: s.visual.opacity,
              }}
            />
          ))}
        </div>

        {/* Copy */}
        <p className="landing__copy">
          오늘 기분은 어떤 슬라임인가요?<br />
          <strong>31가지 기분</strong>이 다 있어요
        </p>

        {/* CTA */}
        <button className="landing__cta" onClick={onStart}>
          슬라임 고르러 가기
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        <p className="landing__hint">드래그하면 슬라임이 늘어나요 ✨</p>
      </div>
    </div>
  );
}
