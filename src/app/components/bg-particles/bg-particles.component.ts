import {
  Component,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  alpha: number;
}

const DARK_COLOR: [number, number, number] = [199, 210, 254];
const LIGHT_COLOR: [number, number, number] = [129, 140, 200];

const MOUSE_RADIUS = 150;
const MOUSE_FORCE = 0.3;
const RETURN_EASE = 0.015;
const LINK_DISTANCE = 120;
const LINE_WIDTH = 0.7;

@Component({
  selector: 'app-bg-particles',
  standalone: true,
  template: `<canvas #particlesCanvas aria-hidden="true"></canvas>`,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
      }

      canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class BgParticlesComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('particlesCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @Input() theme: 'light' | 'dark' = 'dark';

  private readonly zone = inject(NgZone);

  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private rafId = 0;
  private width = 0;
  private height = 0;
  private mouseX: number | null = null;
  private mouseY: number | null = null;

  private readonly onMouseMove = (event: MouseEvent) => {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  };

  private readonly onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch) {
      this.mouseX = touch.clientX;
      this.mouseY = touch.clientY;
    }
  };

  private readonly onTouchEnd = () => {
    this.mouseX = null;
    this.mouseY = null;
  };

  private readonly onResize = () => this.setupCanvas();

  private readonly onVisibilityChange = () => {
    if (document.hidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') ?? undefined;
    if (!this.ctx) return;

    this.setupCanvas();

    this.zone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
      window.addEventListener('touchmove', this.onTouchMove, { passive: true });
      window.addEventListener('touchend', this.onTouchEnd, { passive: true });
      window.addEventListener('resize', this.onResize);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.startLoop();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['theme'] && this.particles.length) {
      this.recolorParticles();
    }
  }

  ngOnDestroy(): void {
    this.stopLoop();
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private setupCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.buildParticles();
  }

  private buildParticles(): void {
    const count = Math.min(110, Math.max(40, Math.round((this.width * this.height) / 16000)));
    this.particles = Array.from({ length: count }, () => this.createParticle());
  }

  private get particleColor(): [number, number, number] {
    return this.theme === 'dark' ? DARK_COLOR : LIGHT_COLOR;
  }

  private createParticle(): Particle {
    const speed = 0.12 + Math.random() * 0.28;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseVx: Math.cos(angle) * speed,
      baseVy: Math.sin(angle) * speed,
      radius: 1 + Math.random() * 1.8,
      alpha: this.randomAlpha(),
    };
  }

  private randomAlpha(): number {
    return this.theme === 'dark' ? 0.16 + Math.random() * 0.2 : 0.12 + Math.random() * 0.16;
  }

  private recolorParticles(): void {
    for (const particle of this.particles) {
      particle.alpha = this.randomAlpha();
    }
  }

  private startLoop(): void {
    if (this.rafId || !this.ctx) return;
    const tick = () => {
      this.update();
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private update(): void {
    for (const particle of this.particles) {
      if (this.mouseX !== null && this.mouseY !== null) {
        const dx = particle.x - this.mouseX;
        const dy = particle.y - this.mouseY;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < MOUSE_RADIUS) {
          const force = (1 - distance / MOUSE_RADIUS) * MOUSE_FORCE;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }
      }

      particle.vx += (particle.baseVx - particle.vx) * RETURN_EASE;
      particle.vy += (particle.baseVy - particle.vy) * RETURN_EASE;
      particle.x += particle.vx;
      particle.y += particle.vy;

      const margin = particle.radius + 4;
      if (particle.x < -margin) particle.x = this.width + margin;
      else if (particle.x > this.width + margin) particle.x = -margin;
      if (particle.y < -margin) particle.y = this.height + margin;
      else if (particle.y > this.height + margin) particle.y = -margin;
    }
  }

  private draw(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawLinks(ctx);

    const glow = this.theme === 'dark';
    const [r, g, b] = this.particleColor;
    for (const particle of this.particles) {
      const fill = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
      if (glow) {
        ctx.shadowBlur = particle.radius * 3;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${particle.alpha * 0.6})`;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawLinks(ctx: CanvasRenderingContext2D): void {
    const [lr, lg, lb] = this.particleColor;
    const maxAlpha = this.theme === 'dark' ? 0.12 : 0.09;
    ctx.lineWidth = LINE_WIDTH;

    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (Math.abs(dx) > LINK_DISTANCE || Math.abs(dy) > LINK_DISTANCE) continue;
        const distance = Math.hypot(dx, dy);
        if (distance >= LINK_DISTANCE) continue;
        const alpha = maxAlpha * (1 - distance / LINK_DISTANCE);
        ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
}
