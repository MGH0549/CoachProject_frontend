import { Component, input } from '@angular/core';
import { Client } from '../../core/api/models/client';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  readonly status = input.required<Client['status']>();
  readonly labels: Record<Client['status'], string> = {
    Pending: 'بانتظار التفعيل',
    Active: 'نشط',
    Expired: 'منتهي',
    Deactivated: 'غير مفعل',
  };
}
