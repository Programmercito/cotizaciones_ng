import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, shareReplay, distinctUntilChanged } from 'rxjs';
import { Cotizacion } from '../models/cotizacion.model';

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);
  private static readonly POLL_INTERVAL = 60_000; // 1 minuto

  /** Emite inmediatamente y luego cada 60s. Comparte la suscripción entre consumidores. */
  readonly cotizaciones$: Observable<Cotizacion[]> = timer(0, CotizacionService.POLL_INTERVAL).pipe(
    switchMap(() => this.http.get<Cotizacion[]>('data.json')),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
