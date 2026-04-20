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
import { Meta, Title } from '@angular/platform-browser';
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
  {
    key: 'oro',
    label: 'Oro',
    exchange: 'BCB',
    sellColor: '#f59e0b',
    buyColor: '#d97706',
    sellRgb: '245, 158, 11',
    buyRgb: '217, 119, 6',
    accentColor: '#fbbf24',
  },
  {
    key: 'plata',
    label: 'Plata',
    exchange: 'BCB',
    sellColor: '#94a3b8',
    buyColor: '#64748b',
    sellRgb: '148, 163, 184',
    buyRgb: '100, 116, 139',
    accentColor: '#cbd5e1',
  },
  {
    key: 'eur',
    label: 'Euro',
    exchange: 'BCB',
    sellColor: '#3b82f6',
    buyColor: '#2563eb',
    sellRgb: '59, 130, 246',
    buyRgb: '37, 99, 235',
    accentColor: '#60a5fa',
  },
  {
    key: 'ufv',
    label: 'UFV',
    exchange: 'BCB',
    sellColor: '#14b8a6',
    buyColor: '#0d9488',
    sellRgb: '20, 184, 166',
    buyRgb: '13, 148, 136',
    accentColor: '#2dd4bf',
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
  @ViewChild('chartOro') chartOroCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPlata') chartPlataCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEuro') chartEuroCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartUfv') chartUfvCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly cotizacionService = inject(CotizacionService);
  private charts: Record<string, Chart | null> = { ref: null, oficial: null, usdt: null, oro: null, plata: null, euro: null, ufv: null };

  private readonly seoTitle = 'Cotizaciones en Bolivia: Dólar oficial, dólar referencial y USDT en BOB';
  private readonly seoDescription =
    'Consulta cotizaciones en Bolivia del dólar oficial, dólar referencial y USDT en bolivianos (BOB). Precios en tiempo real, gráfico del último mes, máximos, mínimos y variación del mercado.';
  private readonly seoKeywords =
    'cotizaciones dolar oficial bolivia, dolar referencial bolivia, usdt bolivia, precio usdt bolivianos, tipo de cambio usd bolivia, cotizacion usdt bob, cotizaciones cripto bolivia, dolar boliviano';
  private pollSub?: Subscription;

  readonly allCotizaciones = signal<Cotizacion[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly theme = signal<'light' | 'dark'>('dark');
  readonly activeTab = signal<'todo' | 'usd' | 'metales'>('todo');
  readonly currentYear = new Date().getFullYear();
  readonly currencies = CURRENCIES;

  setTab(tab: 'todo' | 'usd' | 'metales') {
    this.activeTab.set(tab);
    this.rebuildVisibleCharts(tab);
    setTimeout(() => this.runAnimations(tab), 100);
  }

  private rebuildVisibleCharts(tab: 'todo' | 'usd' | 'metales'): void {
    if (tab === 'usd' || tab === 'todo') {
      this.buildCurrencyChart('ref', this.refData(), CURRENCIES[0], this.chartRefCanvas);
      this.buildCurrencyChart('oficial', this.oficialData(), CURRENCIES[1], this.chartOficialCanvas);
      this.buildCurrencyChart('usdt', this.usdtData(), CURRENCIES[2], this.chartUsdtCanvas);
    }
    if (tab === 'metales' || tab === 'todo') {
      this.buildCurrencyChart('oro', this.oroData(), CURRENCIES[3], this.chartOroCanvas);
      this.buildCurrencyChart('plata', this.plataData(), CURRENCIES[4], this.chartPlataCanvas);
      this.buildCurrencyChart('euro', this.euroData(), CURRENCIES[5], this.chartEuroCanvas);
      this.buildCurrencyChart('ufv', this.ufvData(), CURRENCIES[6], this.chartUfvCanvas);
    }
  }

  private runAnimations(tab: 'todo' | 'usd' | 'metales'): void {
    if (tab === 'usd' || tab === 'todo') {
      const ref  = this.latestRef();
      const ofi  = this.latestOficial();
      const usdt = this.latestUsdt();
      if (ref)  { this.triggerCountUp(ref.purchase,  this.animRefBuy,  1000); this.triggerCountUp(ref.cotizacion,  this.animRefSell,  1000); }
      if (ofi)  { this.triggerCountUp(ofi.purchase,  this.animOfiBuy,  1000); this.triggerCountUp(ofi.cotizacion,  this.animOfiSell,  1000); }
      if (usdt) { this.triggerCountUp(usdt.purchase, this.animUsdtBuy, 1000); this.triggerCountUp(usdt.cotizacion, this.animUsdtSell, 1000); }
    }
    if (tab === 'metales' || tab === 'todo') {
      const oro   = this.latestOro();
      const plata = this.latestPlata();
      const euro  = this.latestEuro();
      const ufv   = this.latestUfv();
      if (oro)   { this.triggerCountUp(oro.cotizacion,   this.animOroSell,   1000); }
      if (plata) { this.triggerCountUp(plata.cotizacion, this.animPlataSell, 1000); }
      if (euro)  { this.triggerCountUp(euro.cotizacion,  this.animEuroSell,  1000); }
      if (ufv)   { this.triggerCountUp(ufv.cotizacion,   this.animUfvSell,   1000); }
    }
  }

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
  readonly oroData = computed(() =>
    this.filterLastMonth(this.allCotizaciones().filter((c) => c.moneda === 'oro'))
  );
  readonly plataData = computed(() =>
    this.filterLastMonth(this.allCotizaciones().filter((c) => c.moneda === 'plata'))
  );
  readonly euroData = computed(() =>
    this.filterLastMonth(this.allCotizaciones().filter((c) => c.moneda === 'eur'))
  );
  readonly ufvData = computed(() =>
    this.filterLastMonth(this.allCotizaciones().filter((c) => c.moneda === 'ufv'))
  );

  readonly latestRef = computed(() => { const d = this.refData(); return d.length ? d[d.length - 1] : null; });
  readonly latestOficial = computed(() => { const d = this.oficialData(); return d.length ? d[d.length - 1] : null; });
  readonly latestUsdt = computed(() => { const d = this.usdtData(); return d.length ? d[d.length - 1] : null; });
  readonly latestOro = computed(() => { const d = this.oroData(); return d.length ? d[d.length - 1] : null; });
  readonly latestPlata = computed(() => { const d = this.plataData(); return d.length ? d[d.length - 1] : null; });
  readonly latestEuro = computed(() => { const d = this.euroData(); return d.length ? d[d.length - 1] : null; });
  readonly latestUfv = computed(() => { const d = this.ufvData(); return d.length ? d[d.length - 1] : null; });

  readonly statsRef = computed(() => this.buildStats(this.refData()));
  readonly statsOficial = computed(() => this.buildStats(this.oficialData()));
  readonly statsUsdt = computed(() => this.buildStats(this.usdtData()));
  readonly statsOro = computed(() => this.buildStats(this.oroData()));
  readonly statsPlata = computed(() => this.buildStats(this.plataData()));
  readonly statsEuro = computed(() => this.buildStats(this.euroData()));
  readonly statsUfv = computed(() => this.buildStats(this.ufvData()));

  // Animated price signals
  readonly animRefBuy = signal(0);
  readonly animRefSell = signal(0);
  readonly animOfiBuy = signal(0);
  readonly animOfiSell = signal(0);
  readonly animUsdtBuy = signal(0);
  readonly animUsdtSell = signal(0);
  readonly animOroBuy = signal(0);
  readonly animOroSell = signal(0);
  readonly animPlataBuy = signal(0);
  readonly animPlataSell = signal(0);
  readonly animEuroBuy = signal(0);
  readonly animEuroSell = signal(0);
  readonly animUfvBuy = signal(0);
  readonly animUfvSell = signal(0);
  private countUpTimers: number[] = [];
  private countUpMap = new Map<object, number[]>();

  readonly cotizaciones = computed(() => this.filterLastMonth(this.allCotizaciones()));

  private buildStats(data: Cotizacion[]) {
    if (!data.length) return { maxSell: 0, minSell: 0, maxBuy: 0, minBuy: 0, count: 0, variation: 0, avgSell: 0, avgBuy: 0, spread: 0, lastUpdate: '' };
    const sells = data.map((c) => c.cotizacion).filter((v) => v > 0);
    const buys = data.map((c) => c.purchase).filter((v) => v > 0);
    const first = data[0];
    const last = data[data.length - 1];
    const variation = first.cotizacion > 0
      ? ((last.cotizacion - first.cotizacion) / first.cotizacion) * 100 : 0;
    const avgSell = sells.length ? sells.reduce((a, b) => a + b, 0) / sells.length : 0;
    const avgBuy = buys.length ? buys.reduce((a, b) => a + b, 0) / buys.length : 0;
    const spread = (last.cotizacion > 0 && last.purchase > 0) ? last.cotizacion - last.purchase : 0;
    return {
      maxSell: sells.length ? Math.max(...sells) : 0,
      minSell: sells.length ? Math.min(...sells) : 0,
      maxBuy: buys.length ? Math.max(...buys) : 0,
      minBuy: buys.length ? Math.min(...buys) : 0,
      count: data.length,
      variation,
      avgSell,
      avgBuy,
      spread,
      lastUpdate: last.datetime,
    };
  }

  constructor() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) this.theme.set(savedTheme);
    this.applyTheme();

    this.setSeoMetadata();

    this.pollSub = this.cotizacionService.cotizaciones$.subscribe({
      next: (data: Cotizacion[]) => {
        this.allCotizaciones.set(data);
        this.loading.set(false);
        setTimeout(() => this.runAnimations(this.activeTab()), 100);
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
      const oro = this.oroData();
      const plata = this.plataData();
      const euro = this.euroData();
      const ufv = this.ufvData();
      const isLoading = this.loading();
      const _ = this.theme();
      if (!isLoading) {
        setTimeout(() => {
          this.buildCurrencyChart('ref', ref, CURRENCIES[0], this.chartRefCanvas);
          this.buildCurrencyChart('oficial', ofi, CURRENCIES[1], this.chartOficialCanvas);
          this.buildCurrencyChart('usdt', usdt, CURRENCIES[2], this.chartUsdtCanvas);
          this.buildCurrencyChart('oro', oro, CURRENCIES[3], this.chartOroCanvas);
          this.buildCurrencyChart('plata', plata, CURRENCIES[4], this.chartPlataCanvas);
          this.buildCurrencyChart('euro', euro, CURRENCIES[5], this.chartEuroCanvas);
          this.buildCurrencyChart('ufv', ufv, CURRENCIES[6], this.chartUfvCanvas);
        }, 50);
      }
    });

    // Count-up animations: driven by runAnimations() called from data load and tab changes
    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('theme', currentTheme);
      this.applyTheme();
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.countUpTimers.forEach((t) => cancelAnimationFrame(t));
    this.countUpMap.forEach((timers) => timers.forEach((t) => cancelAnimationFrame(t)));
    Object.values(this.charts).forEach((c) => c?.destroy());
  }

  toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private triggerCountUp(target: number, sig: ReturnType<typeof signal<number>>, duration: number): void {
    if (target <= 0) { sig.set(0); return; }

    const prev = this.countUpMap.get(sig);
    if (prev) { prev.forEach((t) => cancelAnimationFrame(t)); }
    const timers: number[] = [];
    this.countUpMap.set(sig, timers);

    const start = 0;
    sig.set(start);

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      sig.set(start + (target - start) * eased);
      if (progress < 1) {
        timers.push(requestAnimationFrame(animate));
      } else {
        sig.set(target);
      }
    };
    timers.push(requestAnimationFrame(animate));
  }

  /** true when USDT sell price < USD Referencial sell price */
  readonly usdtCheaper = computed(() => {
    const usdt = this.latestUsdt();
    const ref = this.latestRef();
    if (!usdt || !ref) return false;
    return usdt.cotizacion < ref.cotizacion;
  });

  readonly shareText = computed(() => {
    const ref = this.latestRef();
    const ofi = this.latestOficial();
    const usdt = this.latestUsdt();
    const sRef = this.statsRef();
    const sOfi = this.statsOficial();
    const sUsdt = this.statsUsdt();
    let t = 'Cotizaciones Bolivia\n';
    t += '----------------------------\n';
    if (ref) {
      t += `USD Referencial (BCB)\n`;
      t += `  Compra: ${ref.purchase.toFixed(2)} BOB\n`;
      t += `  Venta: ${ref.cotizacion.toFixed(2)} BOB\n`;
      t += `  Variacion: ${sRef.variation >= 0 ? '+' : ''}${sRef.variation.toFixed(2)}%\n\n`;
    }
    if (ofi) {
      t += `USD Oficial (BCB)\n`;
      t += `  Compra: ${ofi.purchase.toFixed(2)} BOB\n`;
      t += `  Venta: ${ofi.cotizacion.toFixed(2)} BOB\n`;
      t += `  Variacion: ${sOfi.variation >= 0 ? '+' : ''}${sOfi.variation.toFixed(2)}%\n\n`;
    }
    if (usdt) {
      t += `USDT (Binance P2P)\n`;
      t += `  Venta: ${usdt.cotizacion.toFixed(2)} BOB\n`;
      if (usdt.purchase > 0) t += `  Compra: ${usdt.purchase.toFixed(2)} BOB\n`;
      t += `  Variacion: ${sUsdt.variation >= 0 ? '+' : ''}${sUsdt.variation.toFixed(2)}%\n\n`;
    }
    const oro = this.latestOro();
    const plata = this.latestPlata();
    const euro = this.latestEuro();
    const ufv = this.latestUfv();
    const sOro = this.statsOro();
    const sPlata = this.statsPlata();
    const sEuro = this.statsEuro();
    const sUfv = this.statsUfv();
    if (oro) {
      t += `Oro (BCB)\n`;
      t += `  Compra/Venta: ${oro.cotizacion.toFixed(2)} ${oro.moneda_dest || 'BOB'}\n`;
      t += `  Variacion: ${sOro.variation >= 0 ? '+' : ''}${sOro.variation.toFixed(2)}%\n\n`;
    }
    if (plata) {
      t += `Plata (BCB)\n`;
      t += `  Compra/Venta: ${plata.cotizacion.toFixed(2)} ${plata.moneda_dest || 'BOB'}\n`;
      t += `  Variacion: ${sPlata.variation >= 0 ? '+' : ''}${sPlata.variation.toFixed(2)}%\n\n`;
    }
    if (euro) {
      t += `Euro (BCB)\n`;
      t += `  Compra/Venta: ${euro.cotizacion.toFixed(2)} ${euro.moneda_dest || 'BOB'}\n`;
      t += `  Variacion: ${sEuro.variation >= 0 ? '+' : ''}${sEuro.variation.toFixed(2)}%\n\n`;
    }
    if (ufv) {
      t += `UFV (BCB)\n`;
      t += `  Compra/Venta: ${ufv.cotizacion.toFixed(2)} ${ufv.moneda_dest || 'BOB'}\n`;
      t += `  Variacion: ${sUfv.variation >= 0 ? '+' : ''}${sUfv.variation.toFixed(2)}%\n\n`;
    }
    t += '----------------------------\n';
    t += 'Datos en tiempo real';
    return t;
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

  private setSeoMetadata(): void {
    this.titleService.setTitle(this.seoTitle);
    this.metaService.updateTag({ name: 'description', content: this.seoDescription });
    this.metaService.updateTag({ name: 'keywords', content: this.seoKeywords });
    this.metaService.updateTag({ property: 'og:title', content: this.seoTitle });
    this.metaService.updateTag({ property: 'og:description', content: this.seoDescription });
    this.metaService.updateTag({ property: 'og:image', content: 'https://cotizaciones.devcito.org/og-image.png' });
    this.metaService.updateTag({ property: 'og:image:type', content: 'image/png' });
    this.metaService.updateTag({ name: 'twitter:title', content: this.seoTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: this.seoDescription });
    this.metaService.updateTag({ name: 'twitter:image', content: 'https://cotizaciones.devcito.org/og-image.png' });
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
