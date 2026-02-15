import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cotizacion } from '../models/cotizacion.model';

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);

  getCotizaciones(): Observable<Cotizacion[]> {
    return this.http.get<Cotizacion[]>('data.json');
  }
}
