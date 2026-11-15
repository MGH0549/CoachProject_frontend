import { ClientProgressComponent } from '../progress/client-progress.component';
import { Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { Account } from '../../../core/api/models/account';
import { ClientsService } from '../clients/clients.service';
import { TrainingBuilderComponent } from './training-builder.component';
import { DietBuilderComponent } from './diet-builder.component';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-client-detail',
  imports: [
    ClientProgressComponent,
    RouterLink,
    TrainingBuilderComponent,
    DietBuilderComponent,
    StatusBadgeComponent,
    CairoDatePipe,
  ],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.css',
})
export class ClientDetailComponent {
  readonly trainingBuilder = viewChild(TrainingBuilderComponent);
  readonly dietBuilder = viewChild(DietBuilderComponent);
  discardChanges() {
    this.trainingBuilder()?.dirty.set(false);
    this.dietBuilder()?.dirty.set(false);
  }
  canLeave() {
    return (
      !(this.trainingBuilder()?.dirty() || this.dietBuilder()?.dirty()) ||
      confirm('لديك تغييرات غير محفوظة. مغادرة الصفحة؟')
    );
  }
  switchTab(tab: string) {
    if (this.canLeave()) this.tab.set(tab);
  }
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly api = inject(ClientsService);
  private readonly notices = inject(NotificationService);
  private readonly dialog = inject(Dialog);
  readonly client = signal<Account | null>(null);
  readonly tab = signal('training');
  readonly error = signal('');
  readonly busy = signal(false);
  constructor() {
    void this.load();
  }
  async load() {
    try {
      this.client.set(await this.api.get(this.id));
      this.error.set('');
    } catch (error) {
      this.error.set(this.notices.error(error));
    }
  }
  async access() {
    const { AccessDialogComponent } = await import('../clients/access-dialog.component');
    this.dialog
      .open<boolean>(AccessDialogComponent, { data: this.client(), ariaLabelledBy: 'access-title' })
      .closed.subscribe((saved) => {
        if (saved) void this.load();
      });
  }
  async deactivate() {
    const client = this.client();
    if (!client || !confirm('إيقاف وصول العميل إلى خططه؟')) return;
    this.busy.set(true);
    try {
      await this.api.deactivate(this.id, client.version);
      await this.load();
      this.notices.show('تم إيقاف الحساب.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
