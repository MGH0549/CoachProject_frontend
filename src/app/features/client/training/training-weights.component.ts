import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { Placement } from '../../../core/api/models/placement';
import { TrainingService } from './training.service';
import { formSets, setRow, weightForm } from '../strength/strength-form';
import { StrengthSet } from '../strength/strength.models';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';
import { isInactiveAccess } from '../../../core/auth/inactive-access';
import { SessionService } from '../../../core/auth/session.service';

export interface TrainingSave {
  exerciseId: string;
  key: string;
  sets?: StrengthSet[];
  recordedAt: string;
  localDate: string;
  newBest: boolean;
}

@Component({
  selector: 'app-training-weights',
  imports: [ReactiveFormsModule, TranslocoPipe, CairoDatePipe],
  templateUrl: './training-weights.component.html',
  styleUrl: './training-weights.component.css',
})
export class TrainingWeightsComponent {
  readonly placement = input.required<Placement>();
  readonly saved = output<TrainingSave>();
  readonly working = output<boolean>();
  private readonly api = inject(TrainingService);
  private readonly session = inject(SessionService);
  private readonly drafts = new Map<string, ReturnType<typeof weightForm>>();
  readonly busy = signal(false);
  readonly error = signal('');
  readonly alternative = computed(() =>
    this.placement().alternatives.find((a) => a.id === this.placement().selectedAlternativeId),
  );
  readonly source = computed(() => this.alternative() ?? this.placement());
  readonly key = computed(
    () => `${this.placement().id}:${this.placement().selectedAlternativeId ?? 'main'}`,
  );
  readonly form = computed(() => {
    const key = this.key();
    let form = this.drafts.get(key);
    if (!form) {
      form = weightForm(
        this.source().lastSession?.sets,
        this.source().sets ?? this.placement().sets,
      );
      this.drafts.set(key, form);
    }
    return form;
  });
  addSet() {
    if (!this.busy() && this.form().controls.sets.length < 10)
      this.form().controls.sets.push(setRow());
  }
  removeSet(index: number) {
    if (!this.busy() && this.form().controls.sets.length > 1)
      this.form().controls.sets.removeAt(index);
  }
  async save(withWeights = true) {
    if (this.busy() || !this.session.isActive()) return;
    const form = this.form();
    if (withWeights && form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const placement = this.placement();
    const source = this.source();
    const key = this.key();
    const sets = withWeights ? formSets(form.controls.sets) : undefined;
    this.busy.set(true);
    this.working.emit(true);
    this.error.set('');
    try {
      const result = await this.api.log(placement.id, placement.selectedAlternativeId, sets);
      if (!withWeights) form.markAsUntouched();
      this.saved.emit({
        exerciseId: source.exerciseId,
        key,
        sets,
        recordedAt: result.recordedAt,
        localDate: result.localDate,
        newBest:
          !!sets &&
          source.bestWeightKg !== undefined &&
          Math.max(...sets.map((s) => s.weightKg)) > source.bestWeightKg,
      });
    } catch (error) {
      if (!isInactiveAccess(error))
        this.error.set(
          (error as { error?: { code?: string } }).error?.code === 'STRENGTH_SET_LIMIT'
            ? 'strength.dailyLimit'
            : 'trainingWeights.saveError',
        );
    } finally {
      this.busy.set(false);
      this.working.emit(false);
    }
  }
}
