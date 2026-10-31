import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuoteDetailsModalComponent } from './quote-details-modal.component';

describe('QuoteDetailsModalComponent', () => {
  let fixture: ComponentFixture<QuoteDetailsModalComponent>;
  let component: QuoteDetailsModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [QuoteDetailsModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(QuoteDetailsModalComponent);
    component = fixture.componentInstance;
    component.details = {
      label: 'Oro',
      source: 'BCB',
      quote: { moneda: 'oro', cotizacion: 100, purchase: 0, datetime: '2026-09-10 10:00:00', exchange: 'BCB' },
      dailyChange: { amount: 0, direction: 'flat' },
      maxSell: 110,
      minSell: 90,
      count: 3,
      priceFormat: '1.2-2',
      hasBuySell: false,
    };
    fixture.detectChanges();
  });

  it('emits close when its close button is activated', () => {
    const closed = jasmine.createSpy();
    component.closed.subscribe(closed);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.quote-modal__close')?.click();

    expect(closed).toHaveBeenCalled();
  });

  it('emits close only for backdrop clicks', () => {
    const closed = jasmine.createSpy();
    component.closed.subscribe(closed);
    const backdrop = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.quote-modal-backdrop')!;
    const dialog = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.quote-modal')!;

    dialog.click();
    expect(closed).not.toHaveBeenCalled();

    backdrop.click();
    expect(closed).toHaveBeenCalled();
  });

  it('uses the quote currency for the daily change', () => {
    fixture.componentRef.setInput('details', {
      ...component.details,
      quote: { ...component.details.quote, moneda_dest: 'USD' },
      dailyChange: { amount: 1.5, direction: 'up' },
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('+1.50 USD');
  });
});