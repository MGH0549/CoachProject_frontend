import { DateTime } from 'luxon';
import {
  chartGeometry,
  isNewBest,
  personalBestsThisMonth,
  strengthChart,
  weightChange,
} from './strength-data';
import { StrengthSession, planLifts } from './strength.models';
import { Training } from '../../../core/api/models/training';

const log = (id: string, at: string, weight: number, exerciseId = 'bench') =>
  ({
    id,
    exerciseId,
    recordedAt: at,
    sets: [{ setNumber: 1, weightKg: weight, repetitions: 8 }],
  }) as StrengthSession;
describe('Strength chart and history data', () => {
  const now = DateTime.fromISO('2026-11-20T12:00:00Z');
  it('orders chronologically and takes the heaviest performed set per session, including weight reductions', () => {
    const first = log('first', '2026-11-01T12:00:00Z', 85);
    first.sets.push({ setNumber: 2, weightKg: 90, repetitions: 5 });
    const last = log('last', '2026-11-03T12:00:00Z', 80);
    expect(strengthChart([last, first], 'all', now).map((p) => p.weight)).toEqual([90, 80]);
    expect(weightChange([last, first])).toBe(-10);
    expect(isNewBest([last, first])).toBe(false);
  });
  it('filters 12 weeks by Cairo calendar boundaries and preserves the full All history', () => {
    const cutoff = now.setZone('Africa/Cairo').minus({ weeks: 12 }).startOf('day');
    const old = log('old', cutoff.minus({ milliseconds: 1 }).toISO()!, 70);
    const inside = log('inside', cutoff.toISO()!, 75);
    expect(strengthChart([old, inside], '12w', now).map((p) => p.id)).toEqual(['inside']);
    expect(strengthChart([old, inside], 'all', now)).toHaveLength(2);
  });
  it('does not call an equal or first weight a new best', () => {
    const first = log('a', '2026-11-01T10:00:00Z', 90);
    const next = log('b', '2026-11-02T10:00:00Z', 90);
    expect(isNewBest([first])).toBe(false);
    expect(isNewBest([first, next])).toBe(false);
    next.sets[0].weightKg = 92.5;
    expect(isNewBest([first, next])).toBe(true);
    expect(personalBestsThisMonth([next, first], now)).toBe(1);
  });
  it('spaces points by time and handles empty, flat, single, and same-time sessions without NaN', () => {
    expect(chartGeometry([]).line).toBe('');
    const points = [
      { at: '2026-11-01', weight: 0 },
      { at: '2026-11-02', weight: 0 },
      { at: '2026-11-11', weight: 0 },
    ];
    const geometry = chartGeometry(points);
    expect(geometry.coordinates[1].x).toBe(80);
    expect(geometry.line).not.toContain('NaN');
    expect(chartGeometry([points[0]]).coordinates[0].x).toBe(300);
    expect(chartGeometry([points[0], points[0]]).line).not.toMatch(/NaN|Infinity/);
  });
  it('takes alternatives and their coach overrides from the plan and respects selection locks', () => {
    const plan = {
      choicesLocked: true,
      days: [
        {
          name: 'Push',
          exercises: [
            {
              id: 'p',
              exerciseId: 'main',
              exercise: { name: 'Bench' },
              sets: 4,
              reps: '8-10',
              restSeconds: 90,
              selectedAlternativeId: 'alt',
              alternatives: [
                {
                  id: 'alt',
                  exerciseId: 'dumbbell',
                  exercise: { name: 'DB press' },
                  sets: 3,
                  reps: '10',
                },
              ],
            },
          ],
        },
      ],
    } as Training;
    expect(planLifts(plan).map((lift) => [lift.exerciseId, lift.sets, lift.canLog])).toEqual([
      ['main', 4, false],
      ['dumbbell', 3, true],
    ]);
  });
});
