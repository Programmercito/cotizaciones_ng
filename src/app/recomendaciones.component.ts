import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recomendaciones.component.html',
  styleUrls: ['./recomendaciones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecomendacionesComponent {}
