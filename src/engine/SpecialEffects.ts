// 랜덤 이벤트용 임시 효과. 화면 그리기는 SlimeRenderer가 슬라임 윤곽 안으로 잘라서(clip) 한다.

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;       // 1 → 0
  size: number;
  color: string;
  type: 'sand';
}

interface ColorBlob {
  x: number; y: number;
  radius: number;
  color: string;
  life: number;       // 1 → 0
}

// Bright palette for surprise effects
const SURPRISE_COLORS = [
  '#FF3366', '#FF9900', '#FFDD00', '#00DD88',
  '#00BBFF', '#BB44FF', '#FF66BB', '#44FFEE',
];

function randColor(): string {
  return SURPRISE_COLORS[Math.floor(Math.random() * SURPRISE_COLORS.length)];
}

export class SpecialEffects {
  particles: Particle[] = [];
  blobs: ColorBlob[] = [];

  triggerSand(cx: number, cy: number, radius: number) {
    const color = randColor();
    const count = 70 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius * 0.85;
      this.particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 1.0,
        size: 1.5 + Math.random() * 2.5,
        color,
        type: 'sand',
      });
    }
  }

  triggerColorBlob(cx: number, cy: number, radius: number) {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.55;
      this.blobs.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        radius: 12 + Math.random() * 28,
        color: randColor(),
        life: 1.0,
      });
    }
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt * 0.55;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const b of this.blobs) {
      b.life -= dt * 0.4;
    }
    this.blobs = this.blobs.filter((b) => b.life > 0);
  }

  clear() {
    this.particles = [];
    this.blobs = [];
  }
}
