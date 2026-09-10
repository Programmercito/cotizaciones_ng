import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cotizacion } from '../../models/cotizacion.model';
import { DailyChange } from '../../app.component';

export type CurrencyCardKind = 'oficial' | 'usdt' | 'oro' | 'plata' | 'euro' | 'ufv';

export interface CurrencyCardStats {
  maxSell: number;
  minSell: number;
  count: number;
  dailyChange: DailyChange;
}

@Component({
  selector: 'app-currency-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './currency-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyCardComponent {
  @Input({ required: true }) kind!: CurrencyCardKind;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) quote!: Cotizacion;
  @Input({ required: true }) stats!: CurrencyCardStats;
  @Input({ required: true }) sellAmount!: number;
  @Input() buyAmount = 0;
  @Input() source = 'BCB';
  @Input() highlight = false;
  @Input() delay = 0;
  @Input() priceFormat = '1.2-2';

  get hasBuyPrice(): boolean {
    return this.quote.purchase > 0;
  }

  get unit(): string {
    return this.quote.moneda_dest || 'BOB';
  }
}