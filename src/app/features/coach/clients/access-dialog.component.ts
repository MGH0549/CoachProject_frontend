import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DateTime } from 'luxon';
import { ClientsService } from './clients.service';
import { Client } from '../../../core/api/models/client';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-access-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './access-dialog.component.html',
  styleUrl: './access-dialog.component.css',
})
export class AccessDialogComponent {
  readonly client = inject<Client>(DIALOG_DATA);
  readonly dialog = inject(DialogRef<boolean>);
  private readonly api = inject(ClientsService);
  private readonly notices = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly today = DateTime.now().setZone('Africa/Cairo').toISODate()!;
  readonly form = this.fb.nonNullable.group({
    package: [this.client.package || '', [Validators.required, Validators.maxLength(100)]],
    endDate: [
      this.client.accessEndAt
        ? DateTime.fromISO(this.client.accessEndAt).setZone('Africa/Cairo').toISODate()!
        : '',
      Validators.required,
    ],
  });
  async submit() {
    if (this.form.invalid || this.form.controls.endDate.value < this.today) {
      this.form.markAllAsTouched();
      this.error.set('اختر باقة وتاريخ انتهاء اليوم أو بعده.');
      return;
    }
    this.busy.set(true);
    try {
      const body = { ...this.form.getRawValue(), version: this.client.version };
      if (this.client.status === 'Active') await this.api.extend(this.client.id, body);
      else await this.api.activate(this.client.id, body);
      this.notices.show('تم تحديث اشتراك العميل.');
      this.dialog.close(true);
    } catch (error) {
      this.error.set(this.notices.error(error));
    } finally {
      this.busy.set(false);
    }
  }
}
