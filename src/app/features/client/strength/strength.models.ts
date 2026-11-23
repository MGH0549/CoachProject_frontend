import { Training } from '../../../core/api/models/training';

// Mirrors the backend StrengthInput/StrengthSession contract, not legacy WorkoutDto.
export interface StrengthSet {
  setNumber: number;
  weightKg: number;
  repetitions: number;
}
export interface StrengthSession {
  id: string;
  exerciseId: string;
  exerciseName: string;
  planExerciseId: string;
  alternativeId: string | null;
  recordedAt: string;
  localDate: string;
  note: string | null;
  sets: StrengthSet[];
  bestSet: StrengthSet | null;
  heaviestWeightKg: number | null;
  estimatedOneRepMaxKg: number | null;
}
export interface LiftOverview {
  exerciseId: string;
  exerciseName: string;
  latestWeightKg: number | null;
  bestWeightKg: number | null;
  bestSet: StrengthSet | null;
  estimatedOneRepMaxKg: number | null;
  trendKg: number | null;
  latestRecordedAt: string | null;
}
export interface PlanLift {
  exerciseId: string;
  name: string;
  planExerciseId: string;
  alternativeId: string | null;
  dayName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  canLog: boolean;
}
export interface StrengthInput {
  planExerciseId: string;
  alternativeId: string | null;
  sets: StrengthSet[];
  note: string | null;
}
export interface StrengthSnapshot {
  lifts: PlanLift[];
  overview: LiftOverview[];
  sessions: StrengthSession[];
}
export function planLifts(plan: Training | null): PlanLift[] {
  const lifts: PlanLift[] = [];
  for (const day of plan?.days ?? [])
    for (const placement of day.exercises) {
      const locked = plan!.choicesLocked || placement.choicesLocked;
      const base = {
        planExerciseId: placement.id,
        dayName: day.name,
        restSeconds: placement.restSeconds,
      };
      lifts.push({
        ...base,
        exerciseId: placement.exerciseId,
        name: placement.exercise.name,
        alternativeId: null,
        sets: placement.sets,
        reps: placement.reps,
        canLog: !locked || !placement.selectedAlternativeId,
      });
      for (const alt of placement.alternatives)
        lifts.push({
          ...base,
          exerciseId: alt.exerciseId,
          name: alt.exercise.name,
          alternativeId: alt.id,
          sets: alt.sets ?? placement.sets,
          reps: alt.reps ?? placement.reps,
          canLog: !locked || placement.selectedAlternativeId === alt.id,
        });
    }
  // A library exercise can occur on several days. Prefer a loggable placement.
  const unique = new Map<string, PlanLift>();
  for (const lift of lifts)
    if (!unique.has(lift.exerciseId) || (!unique.get(lift.exerciseId)!.canLog && lift.canLog))
      unique.set(lift.exerciseId, lift);
  return [...unique.values()];
}
