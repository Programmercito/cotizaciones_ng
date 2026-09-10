import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent, calculateDailyChange, computeCountUpStart, clampPositive } from './app.component';
import { CotizacionService } from './services/cotizacion.service';

const cotizacionServiceMock = {
  cotizaciones$: of({ data: [], error: false }),
};

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: CotizacionService, useValue: cotizacionServiceMock }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render header title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Cotizaciones');
  });

  it('opens and closes quote details from parent-owned state', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const quote = { moneda: 'oro', cotizacion: 100, purchase: 0, datetime: '2026-09-10 10:00:00', exchange: 'BCB' };
    const stats = { maxSell: 110, minSell: 90, maxBuy: 0, minBuy: 0, count: 3, dailyChange: { amount: 0.1234, direction: 'up' as const }, avgSell: 100, avgBuy: 0, spread: 0, lastUpdate: quote.datetime };

    app.openQuoteDetails('Oro', 'BCB', quote, stats, '1.4-4', false);
    expect(app.selectedQuote()?.label).toBe('Oro');
    expect(app.selectedQuote()?.hasBuySell).toBeFalse();

    app.closeQuoteDetails();
    expect(app.selectedQuote()).toBeNull();
  });

  it('closes quote details when Escape is handled', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const quote = { moneda: 'USDT', cotizacion: 7.2, purchase: 7.1, datetime: '2026-09-10 10:00:00', exchange: 'Binance P2P' };
    const stats = { maxSell: 7.3, minSell: 7, maxBuy: 7.2, minBuy: 6.9, count: 2, dailyChange: { amount: -0.1, direction: 'down' as const }, avgSell: 7.1, avgBuy: 7, spread: 0.1, lastUpdate: quote.datetime };

    app.openQuoteDetails('USDT', 'Binance P2P', quote, stats, '1.2-2', true);
    app.closeQuoteDetailsOnEscape();

    expect(app.selectedQuote()).toBeNull();
  });
});

describe('computeCountUpStart', () => {
  it('should return 0 for zero, negative, or non-finite targets', () => {
    expect(computeCountUpStart(0)).toBe(0);
    expect(computeCountUpStart(-5)).toBe(0);
    expect(computeCountUpStart(-0.01)).toBe(0);
    expect(computeCountUpStart(NaN)).toBe(0);
    expect(computeCountUpStart(Infinity)).toBe(0);
    expect(computeCountUpStart(-Infinity)).toBe(0);
  });

  it('should always return a positive number strictly below the target', () => {
    const targets = [0.001, 0.1, 1, 6.9, 100, 1234.56];
    for (const target of targets) {
      for (let i = 0; i < 100; i++) {
        const start = computeCountUpStart(target);
        expect(start).toBeGreaterThan(0);
        expect(start).toBeLessThan(target);
      }
    }
  });

  it('should scale between 10% and 80% of the target when there is room', () => {
    // For large targets the 0.01 floor should not interfere.
    expect(computeCountUpStart(100, 0)).toBeCloseTo(10);
    expect(computeCountUpStart(100, 1)).toBeCloseTo(80);
    expect(computeCountUpStart(100, 0.5)).toBeCloseTo(45);
  });

  it('should never produce a negative start even with extreme inputs', () => {
    const badTargets = [-1e9, -1, -1e-9, 0, NaN, Infinity, -Infinity];
    for (const target of badTargets) {
      const start = computeCountUpStart(target);
      expect(start).toBe(0);
    }
  });
});

describe('clampPositive', () => {
  it('should leave positive values unchanged', () => {
    expect(clampPositive(1)).toBe(1);
    expect(clampPositive(0.01)).toBe(0.01);
    expect(clampPositive(999)).toBe(999);
  });

  it('should clamp negative values and zero to 0', () => {
    expect(clampPositive(-1)).toBe(0);
    expect(clampPositive(-0.001)).toBe(0);
    expect(clampPositive(0)).toBe(0);
  });
});

describe('calculateDailyChange', () => {
  const quote = (datetime: string, cotizacion: number) => ({
    moneda: 'USDT', cotizacion, purchase: 0, datetime, exchange: 'test',
  });

  it('compares the latest value with the previous day close for regular currencies', () => {
    const change = calculateDailyChange([
      quote('2026-04-22 09:00:00', 6.90),
      quote('2026-04-22 18:00:00', 7.00),
      quote('2026-04-23 10:00:00', 7.15),
    ]);

    expect(change).toEqual({ amount: 0.15, direction: 'up' });
  });

  it('compares USDT with the previous day average', () => {
    const change = calculateDailyChange([
      quote('2026-04-22 09:00:00', 9.40),
      quote('2026-04-22 18:00:00', 9.60),
      quote('2026-04-23 10:00:00', 9.70),
    ], true);

    expect(change.amount).toBeCloseTo(0.20);
    expect(change.direction).toBe('up');
  });

  it('returns a neutral change when there is no previous day', () => {
    expect(calculateDailyChange([quote('2026-04-23 10:00:00', 9.70)])).toEqual({ amount: 0, direction: 'flat' });
  });
});
