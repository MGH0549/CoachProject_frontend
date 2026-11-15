import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { ClientsService } from './clients.service';
import { Client } from '../../../core/api/models/client';
import { ClientPage } from '../../../core/api/models/client-page';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
import { StatCardComponent } from '../../../shared/stat-card/stat-card.component';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-clients',
  imports: [FormsModule, RouterLink, StatusBadgeComponent, StatCardComponent, CairoDatePipe],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css',
})
export class ClientsComponent {
  private readonly api = inject(ClientsService);
  private readonly notices = inject(NotificationService);
  private readonly dialog = inject(Dialog);
  readonly data = signal<ClientPage | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly counts = signal({ Pending: 0, Active: 0, Expired: 0 });
  search = '';
  status: Client['status'] | undefined;
  readonly filters: { label: string; value: Client['status'] | undefined }[] = [
    { label: 'الكل', value: undefined },
    { label: 'بانتظار التفعيل', value: 'Pending' },
    { label: 'نشط', value: 'Active' },
    { label: 'منتهي', value: 'Expired' },
    { label: 'غير مفعل', value: 'Deactivated' },
  ];
  private sequence = 0;
  constructor() {
    void this.load();
    void this.loadCounts();
  }
  async load(page = 1) {
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.list(page, this.search, this.status);
      if (sequence === this.sequence) this.data.set(result);
    } catch (error) {
      if (sequence === this.sequence) this.error.set(this.notices.error(error));
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  async loadCounts() {
    try {
      const [pending, active, expired] = await Promise.all([
        this.api.list(1, '', 'Pending'),
        this.api.list(1, '', 'Active'),
        this.api.list(1, '', 'Expired'),
      ]);
      this.counts.set({ Pending: pending.total, Active: active.total, Expired: expired.total });
    } catch (error) {
      this.notices.error(error);
    }
  }
  filter(status: Client['status'] | undefined) {
    this.status = status;
    void this.load();
  }
  async access(client: Client) {
    const { AccessDialogComponent } = await import('./access-dialog.component');
    this.dialog
      .open<boolean>(AccessDialogComponent, { data: client, ariaLabelledBy: 'access-title' })
      .closed.subscribe((saved) => {
        if (saved) {
          void this.load(this.data()?.page);
          void this.loadCounts();
        }
      });
  }
  async registrationLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/auth/register`);
      this.notices.show('تم نسخ رابط التسجيل. أرسله إلى العميل ليُنشئ حسابه.');
    } catch {
      this.notices.show(`رابط التسجيل: ${location.origin}/auth/register`);
    }
  }
}
