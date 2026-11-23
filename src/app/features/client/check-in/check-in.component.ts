import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ProgressService } from '../progress/progress.service';
import { NotificationService } from '../../../core/feedback/notification.service';
import { TranslocoPipe } from '@jsverse/transloco';
@Component({
  selector: 'app-check-in',
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './check-in.component.html',
  styleUrl: './check-in.component.css',
})
export class CheckInComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProgressService);
  private readonly notices = inject(NotificationService);
  readonly dialog = inject(DialogRef<boolean>);
  readonly form = this.fb.nonNullable.group({
    weight: [0, [Validators.required, Validators.min(20), Validators.max(500)]],
    waist: [0, [Validators.min(0), Validators.max(400)]],
    chest: [0, [Validators.min(0), Validators.max(400)]],
    arms: [0, [Validators.min(0), Validators.max(150)]],
    shoulderWidth: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(1000)]),
    energy: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    notes: ['', [Validators.maxLength(3000)]],
  });
  readonly labels = ['أمامية', 'جانبية', 'خلفية'];
  readonly files = signal<(File | null)[]>([null, null, null]);
  readonly previews = signal<string[]>(['', '', '']);
  readonly busy = signal(false);
  readonly progress = signal(0);
  readonly error = signal('');
  readonly savedId = signal('');
  readonly uploaded = new Set<number>();
  pick(event: Event, index: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      this.error.set('اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 8 ميجابايت.');
      return;
    }
    const old = this.previews()[index];
    if (old) URL.revokeObjectURL(old);
    this.files.update((files) => files.map((f, i) => (i === index ? file : f)));
    this.previews.update((urls) =>
      urls.map((url, i) => (i === index ? URL.createObjectURL(file) : url)),
    );
    this.error.set('');
  }
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      if (!this.savedId()) {
        const data = this.form.getRawValue();
        const measurements: Record<string, number> = {};
        if (data.waist) measurements['waist'] = data.waist;
        if (data.chest) measurements['chest'] = data.chest;
        if (data.arms) measurements['arms'] = data.arms;
        if (data.shoulderWidth !== null) measurements['shoulderWidth'] = data.shoulderWidth;
        const result = await this.api.submit({
          weight: data.weight,
          energy: data.energy,
          notes: data.notes,
          measurements,
        });
        this.savedId.set(result.id);
        this.form.disable();
      }
      const selected = this.files()
        .map((file, index) => ({ file, index }))
        .filter((item) => !!item.file);
      for (const item of selected) {
        if (this.uploaded.has(item.index)) continue;
        await this.api.upload(this.savedId(), item.file!, (value) => this.progress.set(value));
        this.uploaded.add(item.index);
      }
      this.notices.show('تم إرسال متابعتك إلى المدرب.');
      this.dialog.close(true);
    } catch (error) {
      this.notices.error(error);
      this.error.set(
        this.savedId()
          ? 'تم حفظ القياسات. تعذر رفع بعض الصور؛ أعد المحاولة لرفع الصور المتبقية.'
          : 'تعذر إرسال المتابعة. حاول مرة أخرى.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  ngOnDestroy() {
    this.previews()
      .filter(Boolean)
      .forEach((url) => URL.revokeObjectURL(url));
  }
}
