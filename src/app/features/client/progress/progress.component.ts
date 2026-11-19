import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ProgressService } from './progress.service';
import { ProgressPage } from '../../../core/api/models/progress-page';
import { NotificationService } from '../../../core/feedback/notification.service';
import { StatCardComponent } from '../../../shared/stat-card/stat-card.component';
import { ProgressChartComponent } from '../../../shared/progress-chart/progress-chart.component';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';
import { SessionService } from '../../../core/auth/session.service';
@Component({
  selector: 'app-progress',
  imports: [StatCardComponent, ProgressChartComponent, CairoDatePipe],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.css',
})
export class ProgressComponent implements OnDestroy {
  private readonly session = inject(SessionService);
  private photoTimer?: ReturnType<typeof setTimeout>;
  ngOnDestroy() {
    clearTimeout(this.photoTimer);
    this.photos.set([]);
  }
  private readonly api = inject(ProgressService);
  private readonly notices = inject(NotificationService);
  private readonly dialog = inject(Dialog);
  readonly data = signal<ProgressPage | null>(null);
  readonly workouts = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly metric = signal('weight');
  readonly photos = signal<{ id: string; url: string }[]>([]);
  readonly photoBusy = signal(false);
  readonly latest = computed(() => this.data()?.items[0]);
  readonly values = computed(() =>
    [...(this.data()?.items ?? [])]
      .reverse()
      .map((item) => (this.metric() === 'weight' ? item.weight : item.measurements[this.metric()]))
      .filter((value) => Number.isFinite(value)),
  );
  constructor() {
    void this.load();
  }
  async load(page = 1) {
    if (!this.session.isActive()) return;
    this.loading.set(true);
    this.error.set('');
    this.photos.set([]);
    try {
      const [history, workouts] = await Promise.all([this.api.history(page), this.api.workouts()]);
      this.data.set(history);
      this.workouts.set(workouts.total);
    } catch (error) {
      this.error.set(this.notices.error(error));
    } finally {
      this.loading.set(false);
    }
  }
  async checkIn() {
    const { CheckInComponent } = await import('../check-in/check-in.component');
    this.dialog
      .open<boolean>(CheckInComponent, { ariaLabelledBy: 'check-in-title', disableClose: true })
      .closed.subscribe((saved) => {
        if (saved) void this.load();
      });
  }
  async viewPhotos() {
    this.photoBusy.set(true);
    try {
      const ids = (this.data()?.items ?? []).flatMap((item) => item.photos.map((p) => p.id));
      const photos = await Promise.all(
        ids.slice(0, 9).map(async (id) => ({ id, url: (await this.api.photo(id)).url })),
      );
      this.photos.set(photos);
      clearTimeout(this.photoTimer);
      this.photoTimer = setTimeout(() => this.photos.set([]), 240000);
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.photoBusy.set(false);
    }
  }
}
