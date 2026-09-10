import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cotizacion } from '../../models/cotizacion.model';
import type { DailyChange } from '../../app.component';

export type ReferenceQuoteCardKind = 'oro' | 'plata' | 'euro' | 'ufv';

interface ReferenceQuoteStats {
  maxSell: number;
  minSell: number;
  count: number;
  dailyChange: DailyChange;
}

@Component({
  selector: 'app-reference-quote-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reference-quote-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceQuoteCardComponent {
  @Input({ required: true }) kind!: ReferenceQuoteCardKind;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) quote!: Cotizacion;
  @Input({ required: true }) stats!: ReferenceQuoteStats;
  @Input({ required: true }) amount!: number;
  @Input() source = 'BCB';
  @Input() delay = 0;
  @Input() priceFormat = '1.2-2';

  get unit(): string {
    return this.quote.moneda_dest || 'BOB';
  }
}