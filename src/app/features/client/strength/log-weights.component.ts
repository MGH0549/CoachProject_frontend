import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DateTime } from 'luxon';
import { HttpErrorResponse } from '@angular/common/http';
import { StrengthService } from './strength.service';
import { PlanLift, StrengthSession } from './strength.models';
import { STRENGTH_LIMITS, formSets, setRow, weightForm } from './strength-form';
import { orderedSessions } from './strength-data';
import { SessionService } from '../../../core/auth/session.service';
import { NotificationService } from '../../../core/feedback/notification.service';
import { isInactiveAccess } from '../../../core/auth/inactive-access';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';

@Component({
  selector: 'app-log-weights',
  imports: [ReactiveFormsModule, TranslocoPipe, CairoDatePipe],
  templateUrl: './log-weights.component.html',
  styleUrl: './log-weights.component.css',
})
export class LogWeightsComponent {
  readonly data = inject<{ lift: PlanLift | null; session?: StrengthSession }>(DIALOG_DATA);
  readonly dialog = inject(DialogRef<StrengthSession>);
  private readonly api = inject(StrengthService);
  private readonly session = inject(SessionService);
  private readonly notices = inject(NotificationService);
  private readonly t = inject(TranslocoService);
  readonly limits = STRENGTH_LIMITS;
  readonly form = weightForm();
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly maxSets = signal(10);
  readonly prefilled = signal(false);
  readonly date = this.data.session?.recordedAt ?? DateTime.now().toISO()!;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const exerciseId = this.data.session?.exerciseId ?? this.data.lift!.exerciseId;
      const history = await this.api.history(exerciseId);
      if (!this.session.isActive()) {
        this.dialog.close();
        return;
      }
      const day =
        this.data.session?.localDate ?? DateTime.now().setZone('Africa/Cairo').toISODate();
      const used = history
        .filter((s) => s.id !== this.data.session?.id && s.localDate === day)
        .reduce((sum, s) => sum + s.sets.length, 0);
      this.maxSets.set(Math.max(0, 10 - used));
      const previous = this.data.session ?? orderedSessions(history).at(-1);
      const initial = weightForm(
        previous?.sets.slice(0, this.maxSets()),
        this.data.lift?.sets ?? 1,
        this.data.session?.note ?? '',
      );
      this.form.setControl('sets', initial.controls.sets);
      while (this.form.controls.sets.length > Math.max(1, this.maxSets()))
        this.form.controls.sets.removeAt(this.form.controls.sets.length - 1);
      this.form.controls.note.setValue(initial.controls.note.value);
      this.prefilled.set(!this.data.session && !!previous);
    } catch (error) {
      if (!isInactiveAccess(error)) this.error.set('strength.loadSheetError');
    } finally {
      this.loading.set(false);
    }
  }
  addSet() {
    const rows = this.form.controls.sets;
    if (this.busy() || rows.length >= this.maxSets()) return;
    rows.push(setRow());
  }
  removeSet(index: number) {
    if (!this.busy() && this.form.controls.sets.length > 1) this.form.controls.sets.removeAt(index);
  }
  async save() {
    if (this.busy() || this.loading() || !this.session.isActive()) return;
    if (!this.maxSets() || this.form.controls.sets.length > this.maxSets()) {
      this.error.set('strength.dailyLimit');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.save(
        {
          planExerciseId: this.data.session?.planExerciseId ?? this.data.lift!.planExerciseId,
          alternativeId: this.data.session?.alternativeId ?? this.data.lift?.alternativeId ?? null,
          sets: formSets(this.form.controls.sets),
          note: this.form.controls.note.value.trim() || null,
        },
        this.data.session?.id,
      );
      this.notices.show(this.t.translate('strength.saved'));
      this.dialog.close(result);
    } catch (error) {
      if (!isInactiveAccess(error))
        this.error.set(
          error instanceof HttpErrorResponse && error.error?.code === 'STRENGTH_SET_LIMIT'
            ? 'strength.dailyLimit'
            : 'strength.saveError',
        );
    } finally {
      this.busy.set(false);
    }
  }
}
