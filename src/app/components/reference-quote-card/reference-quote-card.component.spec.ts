import { TestBed } from '@angular/core/testing';
import { ReferenceQuoteCardComponent } from './reference-quote-card.component';

describe('ReferenceQuoteCardComponent', () => {
  it('displays the quote currency for the price and daily change', () => {
    const fixture = TestBed.createComponent(ReferenceQuoteCardComponent);
    fixture.componentRef.setInput('kind', 'oro');
    fixture.componentRef.setInput('label', 'Oro');
    fixture.componentRef.setInput('quote', {
      moneda: 'oro', cotizacion: 4000, purchase: 4000,
      datetime: '2026-10-30', exchange: 'bcb', moneda_dest: 'USD',
    });
    fixture.componentRef.setInput('stats', {
      maxSell: 4000, minSell: 3900, count: 2,
      dailyChange: { amount: 1.5, direction: 'up' },
    });
    fixture.componentRef.setInput('amount', 4000);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('+1.50 USD');
    expect(text).toContain('4,000.00');
    expect(text).not.toContain('BOB');
  });
});
