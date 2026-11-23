import { FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { StrengthSet } from './strength.models';

export const STRENGTH_LIMITS = {
  minKg: 0,
  maxKg: 500,
  stepKg: 0.25,
  minReps: 1,
  maxReps: 100,
  maxSets: 10,
  noteLength: 3000,
} as const;
const integer: ValidatorFn = (control) =>
  control.value === null || Number.isInteger(control.value) ? null : { integer: true };
const quarterKg: ValidatorFn = (control) =>
  control.value === null || Number.isInteger(control.value * 4) ? null : { quarterKg: true };
export function setRow(set?: StrengthSet) {
  return new FormGroup({
    weightKg: new FormControl<number | null>(set?.weightKg ?? null, [
      Validators.required,
      Validators.min(0),
      Validators.max(500),
      quarterKg,
    ]),
    repetitions: new FormControl<number | null>(set?.repetitions ?? null, [
      Validators.required,
      Validators.min(1),
      Validators.max(100),
      integer,
    ]),
  });
}
export function weightForm(sets: StrengthSet[] = [], targetSets = 1, note = '') {
  const rows = sets.length
    ? sets.map((s) => setRow(s))
    : Array.from({ length: Math.min(10, Math.max(1, targetSets)) }, () => setRow());
  return new FormGroup({
    sets: new FormArray(rows, [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(10),
    ]),
    note: new FormControl(note, { nonNullable: true, validators: [Validators.maxLength(3000)] }),
  });
}
export function formSets(rows: ReturnType<typeof weightForm>['controls']['sets']): StrengthSet[] {
  return rows.getRawValue().map((row, i) => ({
    setNumber: i + 1,
    weightKg: row.weightKg!,
    repetitions: row.repetitions!,
  }));
}
