import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DateTime } from 'luxon';
import { StrengthService } from './strength.service';
import { StrengthSnapshot, StrengthSession } from './strength.models';
import { WeightSheetService } from './weight-sheet.service';
import {
  chartGeometry,
  isNewBest,
  orderedSessions,
  personalBestsThisMonth,
  sessionWeight,
  strengthChart,
  weightChange,
} from './strength-data';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';
import { SessionService } from '../../../core/auth/session.service';
import { isInactiveAccess } from '../../../core/auth/inactive-access';

@Component({
  selector: 'app-strength',
  imports: [TranslocoPipe, CairoDatePipe],
  templateUrl: './strength.component.html',
  styleUrl: './strength.component.css',
})
export class StrengthComponent {
  private readonly api = inject(StrengthService);
  private readonly sheet = inject(WeightSheetService);
  private readonly session = inject(SessionService);
  private readonly t = inject(TranslocoService);
  readonly data = signal<StrengthSnapshot>({ lifts: [], overview: [], sessions: [] });
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly deleting = signal<string | null>(null);
  readonly selectedId = signal('');
  readonly range = signal<'12w' | 'all'>('12w');
  readonly selected = computed(() =>
    this.data().overview.find((lift) => lift.exerciseId === this.selectedId()),
  );
  readonly planLift = computed(
    () => this.data().lifts.find((lift) => lift.exerciseId === this.selectedId()) ?? null,
  );
  readonly historicalLifts = computed(() =>
    this.data().overview.filter(
      (lift) => !this.data().lifts.some((planLift) => planLift.exerciseId === lift.exerciseId),
    ),
  );
  readonly sessions = computed(() =>
    this.data().sessions.filter((s) => s.exerciseId === this.selectedId()),
  );
  readonly visibleSessions = signal(5);
  readonly recent = computed(() =>
    orderedSessions(this.sessions()).reverse().slice(0, this.visibleSessions()),
  );
  readonly points = computed(() => strengthChart(this.sessions(), this.range()));
  readonly geometry = computed(() => chartGeometry(this.points()));
  readonly newBest = computed(() => isNewBest(this.sessions()));
  readonly bestsThisMonth = computed(() => personalBestsThisMonth(this.data().sessions));
  readonly heaviest = computed(() =>
    this.data().overview.reduce<{ exerciseName: string; bestWeightKg: number } | null>(
      (best, lift) =>
        lift.bestWeightKg !== null && (!best || lift.bestWeightKg > best.bestWeightKg)
          ? { exerciseName: lift.exerciseName, bestWeightKg: lift.bestWeightKg }
          : best,
      null,
    ),
  );
  readonly sessionWeight = sessionWeight;
  readonly dateLabel = (value: string) =>
    DateTime.fromISO(value)
      .setZone('Africa/Cairo')
      .setLocale('ar')
      .reconfigure({ numberingSystem: 'latn' })
      .toFormat('dd LLL yyyy');
  constructor() {
    void this.load();
  }
  async load() {
    if (!this.session.isActive()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.api.snapshot();
      if (!this.session.isActive()) return;
      this.data.set(data);
      if (!data.overview.some((lift) => lift.exerciseId === this.selectedId()))
        this.selectedId.set(data.lifts[0]?.exerciseId ?? data.overview[0]?.exerciseId ?? '');
    } catch (error) {
      if (!isInactiveAccess(error)) this.error.set('strength.loadError');
    } finally {
      this.loading.set(false);
    }
  }
  changeFor(exerciseId: string) {
    return weightChange(this.data().sessions.filter((s) => s.exerciseId === exerciseId));
  }
  async log(session?: StrengthSession) {
    if (this.busy() || !this.session.isActive()) return;
    this.busy.set(true);
    try {
      if (await this.sheet.open(this.planLift(), session)) await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  async remove(session: StrengthSession) {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.delete(session.id);
      this.deleting.set(null);
      await this.load();
    } catch (error) {
      if (!isInactiveAccess(error)) this.error.set('strength.deleteError');
    } finally {
      this.busy.set(false);
    }
  }
  chartLabel() {
    return this.t.translate('strength.chartDescription');
  }
}
