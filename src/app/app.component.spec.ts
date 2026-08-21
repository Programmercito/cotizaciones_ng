import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent, computeCountUpStart, clampPositive } from './app.component';
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
