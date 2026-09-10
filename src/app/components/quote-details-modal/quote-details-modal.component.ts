import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cotizacion } from '../../models/cotizacion.model';
import type { DailyChange } from '../../app.component';

export interface QuoteDetails {
  label: string;
  source: string;
  quote: Cotizacion;
  dailyChange: DailyChange;
  maxSell: number;
  minSell: number;
  count: number;
  priceFormat: string;
  hasBuySell: boolean;
}

@Component({
  selector: 'app-quote-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-details-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteDetailsModalComponent {
  @Input({ required: true }) details!: QuoteDetails;
  @Output() closed = new EventEmitter<void>();

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }

  get unit(): string {
    return this.details.quote.moneda_dest || 'BOB';
  }
}