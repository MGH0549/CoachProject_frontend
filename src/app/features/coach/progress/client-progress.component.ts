import { Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientProgressService } from './client-progress.service';
import { ProgressPage } from '../../../core/api/models/progress-page';
import { CheckIn } from '../../../core/api/models/check-in';
import { NotificationService } from '../../../core/feedback/notification.service';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';
import { ProgressChartComponent } from '../../../shared/progress-chart/progress-chart.component';
@Component({
  selector: 'app-client-progress',
  imports: [FormsModule, CairoDatePipe, ProgressChartComponent],
  templateUrl: './client-progress.component.html',
  styleUrl: './client-progress.component.css',
})
export class ClientProgressComponent implements OnDestroy {
  private photoTimer?: ReturnType<typeof setTimeout>;
  ngOnDestroy() {
    clearTimeout(this.photoTimer);
    this.photos.set({});
  }
  readonly clientId = input.required<string>();
  private readonly api = inject(ClientProgressService);
  private readonly notices = inject(NotificationService);
  readonly data = signal<ProgressPage | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly feedback = signal<Record<string, string>>({});
  readonly photos = signal<Record<string, string>>({});
  readonly values = computed(() =>
    [...(this.data()?.items ?? [])].reverse().map((item) => item.weight),
  );
  constructor() {
    effect(() => {
      this.clientId();
      void this.load();
    });
  }
  async load(page = 1) {
    this.loading.set(true);
    this.error.set('');
    this.photos.set({});
    try {
      const data = await this.api.history(this.clientId(), page);
      this.data.set(data);
      this.feedback.set(
        Object.fromEntries(data.items.map((item) => [item.id, item.feedback || ''])),
      );
    } catch (error) {
      this.error.set(this.notices.error(error));
    } finally {
      this.loading.set(false);
    }
  }
  edit(id: string, value: string) {
    this.feedback.update((values) => ({ ...values, [id]: value }));
  }
  async save(item: CheckIn) {
    const feedback = this.feedback()[item.id]?.trim();
    if (!feedback) return;
    this.busy.set(true);
    try {
      await this.api.feedback(this.clientId(), item.id, feedback, item.version);
      await this.load(this.data()?.page);
      this.notices.show('تم إرسال ملاحظاتك للعميل.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async showPhotos(item: CheckIn) {
    this.busy.set(true);
    try {
      const urls = await Promise.all(
        item.photos.map(async (photo) => [
          photo.id,
          (await this.api.photo(this.clientId(), photo.id)).url,
        ]),
      );
      this.photos.update((current) => ({ ...current, ...Object.fromEntries(urls) }));
      clearTimeout(this.photoTimer);
      this.photoTimer = setTimeout(() => this.photos.set({}), 240000);
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
