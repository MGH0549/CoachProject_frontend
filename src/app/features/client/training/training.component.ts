import { Component, computed, inject, signal } from '@angular/core';
import { TrainingService } from './training.service';
import { Training } from '../../../core/api/models/training';
import { Placement } from '../../../core/api/models/placement';
import { NotificationService } from '../../../core/feedback/notification.service';
import { VideoPanelComponent } from '../../../shared/video-panel/video-panel.component';
import { SessionService } from '../../../core/auth/session.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MissingPlanComponent } from '../../../shared/missing-plan/missing-plan.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TrainingSave, TrainingWeightsComponent } from './training-weights.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { A11yModule } from '@angular/cdk/a11y';
import { toSignal } from '@angular/core/rxjs-interop';
@Component({
  selector: 'app-training',
  imports: [
    VideoPanelComponent,
    MissingPlanComponent,
    TranslocoPipe,
    TrainingWeightsComponent,
    A11yModule,
  ],
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
  private readonly t = inject(TranslocoService);
  readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 767px)'));
  readonly panelOpen = signal(false);
  readonly bests = signal<string[]>([]);
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
    if (!this.session.isActive()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.plan.set(await this.api.load());
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.plan.set(null);
      } else {
        this.error.set(this.notices.error(error));
      }
    } finally {
      this.loading.set(false);
    }
  }
  selectDay(index: number) {
    if (this.busy()) return;
    this.dayIndex.set(index);
    this.selectedId.set('');
    this.panelOpen.set(false);
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
  selectExercise(id: string) {
    if (this.busy()) return;
    this.selectedId.set(id);
    this.panelOpen.set(true);
  }
  key(placement: Placement) {
    return `${placement.id}:${placement.selectedAlternativeId ?? 'main'}`;
  }
  rowSource(placement: Placement) {
    return (
      placement.alternatives.find((a) => a.id === placement.selectedAlternativeId) ?? placement
    );
  }
  lastSet(placement: Placement) {
    return this.rowSource(placement).lastSession?.sets.reduce((best, set) =>
      set.weightKg > best.weightKg ||
      (set.weightKg === best.weightKg && set.repetitions > best.repetitions)
        ? set
        : best,
    );
  }
  onSaved(result: TrainingSave) {
    this.completed.update((ids) => (ids.includes(result.key) ? ids : [...ids, result.key]));
    if (result.sets)
      this.bests.update((ids) => [
        ...ids.filter((id) => id !== result.key),
        ...(result.newBest ? [result.key] : []),
      ]);
    if (result.sets) {
      const sets = result.sets;
      const update = <T extends { exerciseId: string; bestWeightKg?: number }>(source: T) =>
        source.exerciseId === result.exerciseId
          ? {
              ...source,
              lastSession: { sets, recordedAt: result.recordedAt, localDate: result.localDate },
              bestWeightKg: Math.max(source.bestWeightKg ?? 0, ...sets.map((s) => s.weightKg)),
            }
          : source;
      this.plan.update((plan) =>
        plan
          ? {
              ...plan,
              days: plan.days.map((day) => ({
                ...day,
                exercises: day.exercises.map((p) => ({
                  ...update(p),
                  alternatives: p.alternatives.map(update),
                })),
              })),
            }
          : plan,
      );
    }
    this.notices.show(
      this.t.translate(result.sets ? 'trainingWeights.saved' : 'trainingWeights.done'),
    );
  }
}
