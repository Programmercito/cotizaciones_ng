import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cotizacion } from '../../models/cotizacion.model';
import type { DailyChange } from '../../app.component';

export type UsdQuoteCardKind = 'oficial' | 'usdt';

interface UsdQuoteStats {
  maxSell: number;
  minSell: number;
  count: number;
  dailyChange: DailyChange;
}

@Component({
  selector: 'app-usd-quote-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usd-quote-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsdQuoteCardComponent {
  @Input({ required: true }) kind!: UsdQuoteCardKind;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) quote!: Cotizacion;
  @Input({ required: true }) stats!: UsdQuoteStats;
  @Input({ required: true }) buyAmount!: number;
  @Input({ required: true }) sellAmount!: number;
  @Input() source = 'BCB';
  @Input() highlight = false;
  @Input() delay = 0;
  @Output() detailsRequested = new EventEmitter<void>();

  get unit(): string {
    return this.quote.moneda_dest || 'BOB';
  }
}