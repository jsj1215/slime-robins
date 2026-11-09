export interface MeshPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  restX: number;
  restY: number;
  prevX: number;
  prevY: number;
}

export interface RadialMeshConfig {
  cx: number;
  cy: number;
  radius: number;
  pointCount: number;
}

export class RadialMesh {
  points: MeshPoint[] = [];
  cx: number;
  cy: number;
  radius: number;

  constructor(config: RadialMeshConfig) {
    this.cx = config.cx;
    this.cy = config.cy;
    this.radius = config.radius;
    this.init(config.pointCount);
  }

  private init(count: number) {
    this.points = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = this.cx + Math.cos(angle) * this.radius;
      const y = this.cy + Math.sin(angle) * this.radius;
      this.points.push({
        x, y,
        vx: 0, vy: 0,
        fx: 0, fy: 0,
        restX: x, restY: y,
        prevX: x, prevY: y,
      });
    }
  }

  reposition(cx: number, cy: number) {
    const dx = cx - this.cx;
    const dy = cy - this.cy;
    this.cx = cx;
    this.cy = cy;
    for (const p of this.points) {
      p.x += dx; p.y += dy;
      p.restX += dx; p.restY += dy;
      p.prevX += dx; p.prevY += dy;
    }
  }

  // 탭 지점에서 바깥으로 밀어내는 충격파. strength는 가속도(px/s²) 단위이며
  // 다음 물리 스텝에서 한 번 속도로 적분된다(integratePoint). 거리에 따라 선형 감쇠한다.
  applyShockwave(px: number, py: number, strength: number) {
    const reach = this.radius * 2;
    for (const p of this.points) {
      const dx = p.x - px;
      const dy = p.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.01 && dist < reach) {
        const factor = strength * (1 - dist / reach);
        p.fx += (dx / dist) * factor;
        p.fy += (dy / dist) * factor;
      }
    }
  }

  // 흔들기: 좌우 위주로 출렁이도록 x 성분을 y보다 크게 준다. 이웃 점끼리 부호를 바꿔 물결 모양을 만든다.
  applyShake(amount: number) {
    this.points.forEach((p, i) => {
      const sign = i % 2 === 0 ? 1 : -1;
      p.fx += sign * amount * (0.6 + Math.random() * 0.4);
      p.fy += (Math.random() - 0.5) * amount * 0.5;
    });
  }

  // 현재 제어점의 무게중심. 드래그로 슬라임이 옮겨지거나 처지면 리사이즈 때의 cx/cy와 달라진다.
  centroid(): { x: number; y: number } {
    let sx = 0, sy = 0;
    for (const p of this.points) { sx += p.x; sy += p.y; }
    const n = this.points.length || 1;
    return { x: sx / n, y: sy / n };
  }

  saveRenderPrevious() {
    for (const p of this.points) {
      p.prevX = p.x;
      p.prevY = p.y;
    }
  }
}
