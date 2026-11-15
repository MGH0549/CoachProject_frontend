import { Component, computed, inject, signal } from '@angular/core';
import { TrainingService } from './training.service';
import { Training } from '../../../core/api/models/training';
import { Placement } from '../../../core/api/models/placement';
import { NotificationService } from '../../../core/feedback/notification.service';
import { VideoPanelComponent } from '../../../shared/video-panel/video-panel.component';
import { SessionService } from '../../../core/auth/session.service';
@Component({
  selector: 'app-training',
  imports: [VideoPanelComponent],
  templateUrl: './training.component.html',
  styleUrl: './training.component.css',
})
export class TrainingComponent {
  private readonly api = inject(TrainingService);
  private readonly notices = inject(NotificationService);
  readonly session = inject(SessionService);
  readonly plan = signal<Training | null>(null);
  readonly dayIndex = signal(0);
  readonly selectedId = signal('');
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly completed = signal<string[]>([]);
  readonly day = computed(() => this.plan()?.days[this.dayIndex()]);
  readonly selected = computed(
    () => this.day()?.exercises.find((e) => e.id === this.selectedId()) ?? this.day()?.exercises[0],
  );
  readonly alternative = computed(() =>
    this.selected()?.alternatives.find((a) => a.id === this.selected()?.selectedAlternativeId),
  );
  readonly exercise = computed(() => this.alternative()?.exercise ?? this.selected()?.exercise);
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.plan.set(await this.api.load());
    } catch (error) {
      this.error.set(this.notices.error(error));
    } finally {
      this.loading.set(false);
    }
  }
  selectDay(index: number) {
    this.dayIndex.set(index);
    this.selectedId.set('');
  }
  async choose(placement: Placement, id: string | null) {
    if (this.busy() || !this.plan()) return;
    this.busy.set(true);
    try {
      this.plan.set(await this.api.choose(placement.id, id, this.plan()!.version));
    } catch (error) {
      this.notices.error(error);
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  async log() {
    const selected = this.selected();
    if (!selected || this.busy()) return;
    this.busy.set(true);
    try {
      await this.api.log(selected.id, selected.selectedAlternativeId);
      this.completed.update((ids) => [...ids, selected.id]);
      this.notices.show('تم تسجيل التمرين. أحسنت!');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
