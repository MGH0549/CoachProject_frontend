import { Component, input } from '@angular/core';
import { Client } from '../../core/api/models/client';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-status-badge',
  imports: [TranslocoPipe],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  readonly status = input.required<Client['status']>();
}
