import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, shareReplay, distinctUntilChanged, retry, catchError, EMPTY } from 'rxjs';
import { Cotizacion } from '../models/cotizacion.model';

export interface CotizacionResult {
  data: Cotizacion[] | null;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);
  private static readonly POLL_INTERVAL = 60_000; // 1 minuto
  private static readonly RETRY_DELAY = 10_000;   // reintento tras 10s de error
  private static readonly MAX_RETRIES = 5;

  /** Emite inmediatamente y luego cada 60s. En caso de error reintenta cada 10s hasta 5 veces.
   *  Si agota reintentos espera al próximo tick del timer. Nunca termina el observable. */
  readonly cotizaciones$: Observable<CotizacionResult> = timer(0, CotizacionService.POLL_INTERVAL).pipe(
    switchMap(() =>
      this.http.get<Cotizacion[]>(`data.json?date=${Date.now()}`).pipe(
        retry({ count: CotizacionService.MAX_RETRIES, delay: CotizacionService.RETRY_DELAY }),
        switchMap(data => [{ data, error: false } as CotizacionResult]),
        catchError(() => [{ data: null, error: true } as CotizacionResult]),
      )
    ),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
