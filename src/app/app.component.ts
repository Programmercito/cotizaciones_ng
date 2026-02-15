import {
  Component,
  OnDestroy,
  ElementRef,
  ViewChild,
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

  readonly cotizaciones = computed(() => {
    const data = this.allCotizaciones();
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return data.filter((c) => new Date(c.datetime) >= oneMonthAgo);
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
      if (data.length > 0 && !isLoading) {
        setTimeout(() => this.buildChart(data));
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.chart?.destroy();
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

    const height = this.chartCanvas.nativeElement.offsetHeight || 400;

    const gradientFill = ctx.createLinearGradient(0, 0, 0, height);
    gradientFill.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradientFill.addColorStop(0.4, 'rgba(139, 92, 246, 0.12)');
    gradientFill.addColorStop(1, 'rgba(99, 102, 241, 0)');

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
            pointBorderColor: 'rgba(15, 15, 30, 0.8)',
            pointBorderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 9,
            pointHoverBackgroundColor: '#a78bfa',
            pointHoverBorderColor: '#fff',
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
            backgroundColor: 'rgba(15, 15, 30, 0.92)',
            titleColor: '#c7d2fe',
            bodyColor: '#e0e7ff',
            titleFont: { size: 11, weight: 'normal' },
            bodyFont: { size: 15, weight: 'bold' },
            padding: { top: 12, bottom: 12, left: 16, right: 16 },
            cornerRadius: 14,
            displayColors: false,
            borderColor: 'rgba(99, 102, 241, 0.2)',
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
              color: 'rgba(148, 163, 184, 0.04)',
              drawTicks: false,
            },
            ticks: {
              color: '#475569',
              font: { size: 11, weight: 500 },
              padding: 10,
            },
          },
          y: {
            border: { display: false },
            grid: {
              color: 'rgba(148, 163, 184, 0.05)',
              drawTicks: false,
            },
            ticks: {
              color: '#475569',
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
