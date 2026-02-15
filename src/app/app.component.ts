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
    this.cotizacionService.getCotizaciones().subscribe({
      next: (data) => {
        this.allCotizaciones.set(data);
        this.loading.set(false);
      },
      error: (err) => {
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

    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.1)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'USDT / BOB',
            data: values,
            borderColor: '#6366f1',
            backgroundColor: gradient,
            borderWidth: 3,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#6366f1',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#1e1b4b',
            titleColor: '#e0e7ff',
            bodyColor: '#c7d2fe',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 14 },
            padding: 14,
            cornerRadius: 10,
            displayColors: false,
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
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 12 },
            },
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 12 },
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
