import { Component, input } from '@angular/core';
@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css',
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input<string | number>('—');
  readonly unit = input('');
  readonly detail = input('');
}
