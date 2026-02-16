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
  @ViewChild('chartCanvas')
  chartCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly cotizacionService = inject(CotizacionService);
  private chart: Chart | null = null;
  private pollSub?: Subscription;

  readonly allCotizaciones = signal<Cotizacion[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly theme = signal<'light' | 'dark'>('dark'); // Default to dark

  readonly cotizaciones = computed(() => {
    const data = this.allCotizaciones();
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return data.filter((c) => new Date(c.datetime) >= oneMonthAgo);
  });

  readonly cotizacionesTable = computed(() => {
    const data = this.cotizaciones();
    return data.slice(-100); // Last 100 records
  });

  readonly pageSize = 10;
  readonly currentPage = signal(1);

  readonly totalPages = computed(() => {
    return Math.ceil(this.cotizacionesTable().length / this.pageSize) || 1;
  });

  readonly cotizacionesPaginated = computed(() => {
    const data = this.cotizacionesTable();
    const start = (this.currentPage() - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  });

  readonly pageOffset = computed(() => {
    return (this.currentPage() - 1) * this.pageSize;
  });

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

  readonly ultimaCotizacion = computed(() => {
    const data = this.cotizaciones();
    return data.length > 0 ? data[data.length - 1] : null;
  });

  readonly primeraCotizacion = computed(() => {
    const data = this.cotizaciones();
    return data.length > 0 ? data[0] : null;
  });

  readonly variacion = computed(() => {
    const primera = this.primeraCotizacion();
    const ultima = this.ultimaCotizacion();
    if (!primera || !ultima) return 0;
    return ((ultima.cotizacion - primera.cotizacion) / primera.cotizacion) * 100;
  });

  readonly cotizacionMax = computed(() => {
    const data = this.cotizaciones();
    if (data.length === 0) return 0;
    return Math.max(...data.map((c) => c.cotizacion));
  });

  readonly cotizacionMin = computed(() => {
    const data = this.cotizaciones();
    if (data.length === 0) return 0;
    return Math.min(...data.map((c) => c.cotizacion));
  });

  constructor() {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      this.theme.set(savedTheme);
    }
    this.applyTheme();

    // Polling: se suscribe al stream que emite cada 60s y solo notifica si hay cambios
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
      const data = this.cotizaciones();
      const isLoading = this.loading();
      const currentTheme = this.theme();
      if (data.length > 0 && !isLoading) {
        setTimeout(() => this.buildChart(data));
      }
    });

    // Save theme changes to localStorage
    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('theme', currentTheme);
      this.applyTheme();
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.chart?.destroy();
  }

  toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
    this.applyTheme();
  }

  goToPage(page: number | '...'): void {
    if (page === '...') return;
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  readonly shareText = computed(() => {
    const ultima = this.ultimaCotizacion();
    if (!ultima) return '';
    return `1 USDT = ${ultima.cotizacion.toFixed(2)} BOB\nFecha: ${ultima.datetime}\nCotizacion en tiempo real desde Binance P2P`;
  });

  readonly shareUrl = computed(() => {
    return window.location.href;
  });

  shareWhatsApp(): void {
    const text = this.shareText();
    const url = this.shareUrl();
    const message = `${text}\n\nVer mas: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }

  shareTelegram(): void {
    const text = this.shareText();
    const url = this.shareUrl();
    const message = `${text}\n\nVer mas: ${url}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  }

  private applyTheme(): void {
    const currentTheme = this.theme();
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${currentTheme}`);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${currentTheme}`);
  }

  private buildChart(data: Cotizacion[]): void {
    if (!this.chartCanvas) return;
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = data.map((c) => {
      const date = new Date(c.datetime);
      return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    const values = data.map((c) => c.cotizacion);
    const ctx = this.chartCanvas.nativeElement.getContext('2d')!;
    const isDark = this.theme() === 'dark';

    const height = this.chartCanvas.nativeElement.offsetHeight || 400;

    const gradientFill = ctx.createLinearGradient(0, 0, 0, height);
    if (isDark) {
      gradientFill.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
      gradientFill.addColorStop(0.4, 'rgba(139, 92, 246, 0.12)');
      gradientFill.addColorStop(1, 'rgba(99, 102, 241, 0)');
    } else {
      gradientFill.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
      gradientFill.addColorStop(0.4, 'rgba(168, 85, 247, 0.15)');
      gradientFill.addColorStop(1, 'rgba(99, 102, 241, 0)');
    }

    const gradientLine = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    gradientLine.addColorStop(0, '#818cf8');
    gradientLine.addColorStop(0.5, '#6366f1');
    gradientLine.addColorStop(1, '#a78bfa');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'USDT / BOB',
            data: values,
            borderColor: gradientLine,
            backgroundColor: gradientFill,
            borderWidth: 3,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: isDark ? 'rgba(15, 15, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            pointBorderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 9,
            pointHoverBackgroundColor: '#a78bfa',
            pointHoverBorderColor: isDark ? '#fff' : '#1e293b',
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.45,
            cubicInterpolationMode: 'monotone',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 15, 30, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#c7d2fe' : '#1e293b',
            bodyColor: isDark ? '#e0e7ff' : '#475569',
            titleFont: { size: 11, weight: 'normal' },
            bodyFont: { size: 15, weight: 'bold' },
            padding: { top: 12, bottom: 12, left: 16, right: 16 },
            cornerRadius: 14,
            displayColors: false,
            borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
            caretSize: 6,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return data[idx].datetime;
              },
              label: (item) => `BOB ${(item.parsed.y ?? 0).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            border: { display: false },
            grid: {
              color: isDark ? 'rgba(148, 163, 184, 0.04)' : 'rgba(0, 0, 0, 0.06)',
              drawTicks: false,
            },
            ticks: {
              color: isDark ? '#475569' : '#64748b',
              font: { size: 11, weight: 500 },
              padding: 10,
            },
          },
          y: {
            border: { display: false },
            grid: {
              color: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              drawTicks: false,
            },
            ticks: {
              color: isDark ? '#475569' : '#64748b',
              font: { size: 11, weight: 500 },
              padding: 12,
              callback: (value) => `${value}`,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    });
  }
}
