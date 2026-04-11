import {
  Component,
  OnDestroy,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { CotizacionService } from './services/cotizacion.service';
import { Cotizacion } from './models/cotizacion.model';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
);

export interface CurrencyConfig {
  key: string;
  label: string;
  exchange: string;
  sellColor: string;
  buyColor: string;
  sellRgb: string;
  buyRgb: string;
  accentColor: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  {
    key: 'usd referencial',
    label: 'USD Referencial',
    exchange: 'BCB',
    sellColor: '#06b6d4',
    buyColor: '#10b981',
    sellRgb: '6, 182, 212',
    buyRgb: '16, 185, 129',
    accentColor: '#22d3ee',
  },
  {
    key: 'usd oficial',
    label: 'USD Oficial',
    exchange: 'BCB',
    sellColor: '#8b5cf6',
    buyColor: '#f59e0b',
    sellRgb: '139, 92, 246',
    buyRgb: '245, 158, 11',
    accentColor: '#a78bfa',
  },
  {
    key: 'USDT',
    label: 'USDT Binance P2P',
    exchange: 'Binance P2P',
    sellColor: '#6366f1',
    buyColor: '#ec4899',
    sellRgb: '99, 102, 241',
    buyRgb: '236, 72, 153',
    accentColor: '#818cf8',
  },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnDestroy {
  @ViewChild('chartRef') chartRefCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartOficial') chartOficialCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartUsdt') chartUsdtCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly cotizacionService = inject(CotizacionService);
  private charts: Record<string, Chart | null> = { ref: null, oficial: null, usdt: null };
  private pollSub?: Subscription;

  readonly allCotizaciones = signal<Cotizacion[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly theme = signal<'light' | 'dark'>('dark');
  readonly currentYear = new Date().getFullYear();
  readonly currencies = CURRENCIES;

  private filterLastMonth(data: Cotizacion[]): Cotizacion[] {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return data.filter((c) => new Date(c.datetime) >= oneMonthAgo);
  }

  readonly refData = computed(() =>
    this.filterLastMonth(this.allCotizaciones().filter((c) => c.moneda === 'usd referencial'))
  );
  readonly oficialData = computed(() =>
    this.filterLastMonth(this.allCotizaciones().filter((c) => c.moneda === 'usd oficial'))
  );
  readonly usdtData = computed(() =>
    this.filterLastMonth(this.allCotizaciones().filter((c) => c.moneda === 'USDT'))
  );

  readonly latestRef = computed(() => { const d = this.refData(); return d.length ? d[d.length - 1] : null; });
  readonly latestOficial = computed(() => { const d = this.oficialData(); return d.length ? d[d.length - 1] : null; });
  readonly latestUsdt = computed(() => { const d = this.usdtData(); return d.length ? d[d.length - 1] : null; });

  readonly statsRef = computed(() => this.buildStats(this.refData()));
  readonly statsOficial = computed(() => this.buildStats(this.oficialData()));
  readonly statsUsdt = computed(() => this.buildStats(this.usdtData()));

  // Animated price signals
  readonly animRefBuy = signal(0);
  readonly animRefSell = signal(0);
  readonly animOfiBuy = signal(0);
  readonly animOfiSell = signal(0);
  readonly animUsdtBuy = signal(0);
  readonly animUsdtSell = signal(0);
  private countUpTimers: number[] = [];

  readonly cotizaciones = computed(() => this.filterLastMonth(this.allCotizaciones()));

  readonly cotizacionesTable = computed(() => {
    return this.cotizaciones().slice(-100).reverse();
  });

  readonly pageSize = 10;
  readonly currentPage = signal(1);

  readonly totalPages = computed(() =>
    Math.ceil(this.cotizacionesTable().length / this.pageSize) || 1
  );

  readonly cotizacionesPaginated = computed(() => {
    const data = this.cotizacionesTable();
    const start = (this.currentPage() - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  });

  readonly pageOffset = computed(() => (this.currentPage() - 1) * this.pageSize);

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | '...')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  private buildStats(data: Cotizacion[]) {
    if (!data.length) return { maxSell: 0, minSell: 0, maxBuy: 0, minBuy: 0, count: 0, variation: 0 };
    const sells = data.map((c) => c.cotizacion).filter((v) => v > 0);
    const buys = data.map((c) => c.purchase).filter((v) => v > 0);
    const first = data[0];
    const last = data[data.length - 1];
    const variation = first.cotizacion > 0
      ? ((last.cotizacion - first.cotizacion) / first.cotizacion) * 100 : 0;
    return {
      maxSell: sells.length ? Math.max(...sells) : 0,
      minSell: sells.length ? Math.min(...sells) : 0,
      maxBuy: buys.length ? Math.max(...buys) : 0,
      minBuy: buys.length ? Math.min(...buys) : 0,
      count: data.length,
      variation,
    };
  }

  constructor() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) this.theme.set(savedTheme);
    this.applyTheme();

    this.pollSub = this.cotizacionService.cotizaciones$.subscribe({
      next: (data: Cotizacion[]) => {
        this.allCotizaciones.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set('Error al cargar las cotizaciones');
        this.loading.set(false);
        console.error(err);
      },
    });

    effect(() => {
      const ref = this.refData();
      const ofi = this.oficialData();
      const usdt = this.usdtData();
      const isLoading = this.loading();
      const _ = this.theme(); // re-render on theme change
      if (!isLoading) {
        setTimeout(() => {
          this.buildCurrencyChart('ref', ref, CURRENCIES[0], this.chartRefCanvas);
          this.buildCurrencyChart('oficial', ofi, CURRENCIES[1], this.chartOficialCanvas);
          this.buildCurrencyChart('usdt', usdt, CURRENCIES[2], this.chartUsdtCanvas);
        });
      }
    });

    // Count-up animations when latest values change
    effect(() => {
      const ref = this.latestRef();
      if (ref) {
        this.animateCountUp(ref.purchase, this.animRefBuy, 800);
        this.animateCountUp(ref.cotizacion, this.animRefSell, 900);
      }
    }, { allowSignalWrites: true });
    effect(() => {
      const ofi = this.latestOficial();
      if (ofi) {
        this.animateCountUp(ofi.purchase, this.animOfiBuy, 850);
        this.animateCountUp(ofi.cotizacion, this.animOfiSell, 950);
      }
    }, { allowSignalWrites: true });
    effect(() => {
      const usdt = this.latestUsdt();
      if (usdt) {
        this.animateCountUp(usdt.purchase, this.animUsdtBuy, 750);
        this.animateCountUp(usdt.cotizacion, this.animUsdtSell, 1000);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('theme', currentTheme);
      this.applyTheme();
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.countUpTimers.forEach((t) => cancelAnimationFrame(t));
    Object.values(this.charts).forEach((c) => c?.destroy());
  }

  toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  goToPage(page: number | '...'): void {
    if (page === '...') return;
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.set(this.currentPage() - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.set(this.currentPage() + 1);
  }

  private animateCountUp(target: number, sig: ReturnType<typeof signal<number>>, duration = 1200): void {
    const minOffset = 1.5;
    const maxOffset = 4;
    const offset = minOffset + Math.random() * (maxOffset - minOffset);
    const start = Math.max(0, +(target - offset).toFixed(2));
    sig.set(start);
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + (target - start) * eased;
      sig.set(progress >= 1 ? target : +(current).toFixed(2));
      if (progress < 1) {
        this.countUpTimers.push(requestAnimationFrame(step));
      }
    };
    this.countUpTimers.push(requestAnimationFrame(step));
  }

  readonly shareText = computed(() => {
    const ref = this.latestRef();
    const ofi = this.latestOficial();
    const usdt = this.latestUsdt();
    let t = 'Cotizaciones BOB:\n';
    if (ref) t += `USD Ref: Compra ${ref.purchase.toFixed(2)} / Venta ${ref.cotizacion.toFixed(2)}\n`;
    if (ofi) t += `USD Ofi: Compra ${ofi.purchase.toFixed(2)} / Venta ${ofi.cotizacion.toFixed(2)}\n`;
    if (usdt) t += `USDT: Venta ${usdt.cotizacion.toFixed(2)}${usdt.purchase > 0 ? ` / Compra ${usdt.purchase.toFixed(2)}` : ''}\n`;
    return t + 'En tiempo real';
  });

  readonly shareUrl = computed(() => window.location.href);

  shareWhatsApp(): void {
    const msg = `${this.shareText()}\n\nVer mas: ${this.shareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  shareTelegram(): void {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(this.shareUrl())}&text=${encodeURIComponent(this.shareText())}`, '_blank');
  }

  private applyTheme(): void {
    const t = this.theme();
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${t}`);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${t}`);
  }

  private buildCurrencyChart(
    key: string,
    data: Cotizacion[],
    cfg: CurrencyConfig,
    canvasRef?: ElementRef<HTMLCanvasElement>
  ): void {
    if (!canvasRef) return;
    if (this.charts[key]) this.charts[key]!.destroy();
    if (!data.length) { this.charts[key] = null; return; }

    const isDark = this.theme() === 'dark';
    const ctx = canvasRef.nativeElement.getContext('2d')!;
    const h = canvasRef.nativeElement.offsetHeight || 300;

    const labels = data.map((c) => {
      const d = new Date(c.datetime);
      return key === 'usdt'
        ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    });

    const sellVals = data.map((c) => c.cotizacion);
    const buyVals = data.map((c) => c.purchase);
    const hasBuy = buyVals.some((v) => v > 0);

    const sellGrad = ctx.createLinearGradient(0, 0, 0, h);
    sellGrad.addColorStop(0, `rgba(${cfg.sellRgb}, ${isDark ? 0.25 : 0.35})`);
    sellGrad.addColorStop(1, `rgba(${cfg.sellRgb}, 0)`);

    const buyGrad = ctx.createLinearGradient(0, 0, 0, h);
    buyGrad.addColorStop(0, `rgba(${cfg.buyRgb}, ${isDark ? 0.15 : 0.2})`);
    buyGrad.addColorStop(1, `rgba(${cfg.buyRgb}, 0)`);

    const datasets: any[] = [];

    if (hasBuy) {
      datasets.push({
        label: 'Compra',
        data: buyVals.map((v) => v > 0 ? v : null),
        borderColor: cfg.buyColor,
        backgroundColor: buyGrad,
        borderWidth: 2.5,
        pointRadius: data.length > 50 ? 0 : 3,
        pointHoverRadius: 6,
        pointBackgroundColor: cfg.buyColor,
        pointBorderColor: isDark ? 'rgba(15,15,30,0.8)' : 'rgba(255,255,255,0.8)',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
        spanGaps: true,
      });
    }

    datasets.push({
      label: 'Venta',
      data: sellVals,
      borderColor: cfg.sellColor,
      backgroundColor: sellGrad,
      borderWidth: 2.5,
      pointRadius: data.length > 50 ? 0 : 3,
      pointHoverRadius: 6,
      pointBackgroundColor: cfg.sellColor,
      pointBorderColor: isDark ? 'rgba(15,15,30,0.8)' : 'rgba(255,255,255,0.8)',
      pointBorderWidth: 2,
      fill: true,
      tension: 0.4,
    });

    this.charts[key] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeInOutQuart' },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { size: 11, weight: 600 },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15,15,30,0.92)' : 'rgba(255,255,255,0.95)',
            titleColor: isDark ? '#c7d2fe' : '#1e293b',
            bodyColor: isDark ? '#e0e7ff' : '#475569',
            titleFont: { size: 11, weight: 'normal' },
            bodyFont: { size: 13, weight: 'bold' },
            padding: { top: 10, bottom: 10, left: 14, right: 14 },
            cornerRadius: 12,
            borderColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.3)',
            borderWidth: 1,
            callbacks: {
              title: (items) => data[items[0].dataIndex]?.datetime ?? '',
              label: (item) => `${item.dataset.label}: BOB ${(item.parsed.y ?? 0).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            border: { display: false },
            grid: { color: isDark ? 'rgba(148,163,184,0.04)' : 'rgba(0,0,0,0.06)', drawTicks: false },
            ticks: { color: isDark ? '#475569' : '#64748b', font: { size: 10, weight: 500 }, padding: 8, maxRotation: 45 },
          },
          y: {
            border: { display: false },
            grid: { color: isDark ? 'rgba(148,163,184,0.05)' : 'rgba(0,0,0,0.04)', drawTicks: false },
            ticks: { color: isDark ? '#475569' : '#64748b', font: { size: 10, weight: 500 }, padding: 10 },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });
  }
}
