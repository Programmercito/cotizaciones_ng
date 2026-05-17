import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecomendacionesOtrosComponent } from './recomendaciones-otros.component';

describe('RecomendacionesOtrosComponent', () => {
  let component: RecomendacionesOtrosComponent;
  let fixture: ComponentFixture<RecomendacionesOtrosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecomendacionesOtrosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecomendacionesOtrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
