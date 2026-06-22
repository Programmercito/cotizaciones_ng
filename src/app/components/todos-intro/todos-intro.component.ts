import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-todos-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './todos-intro.component.html',
  styleUrls: ['./todos-intro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodosIntroComponent {}
