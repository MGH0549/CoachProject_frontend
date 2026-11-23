import { formSets, setRow, weightForm } from './strength-form';

describe('Strength weight form (backend limits)', () => {
  it('requires weights and reps rather than submitting blank rows as zero', () => {
    const form = weightForm([], 4);
    expect(form.controls.sets.length).toBe(4);
    expect(form.valid).toBe(false);
  });
  for (const weight of [0, 0.25, 80.5, 499.75, 500])
    it(`accepts ${weight} kg`, () => {
      expect(setRow({ setNumber: 1, weightKg: weight, repetitions: 8 }).valid).toBe(true);
    });
  for (const weight of [-0.25, 0.1, 500.25, NaN, Infinity])
    it(`rejects weight ${weight}`, () => {
      expect(setRow({ setNumber: 1, weightKg: weight, repetitions: 8 }).valid).toBe(false);
    });
  for (const repetitions of [0, 1.5, 101, NaN, Infinity])
    it(`rejects reps ${repetitions}`, () => {
      expect(setRow({ setNumber: 1, weightKg: 20, repetitions }).valid).toBe(false);
    });
  it('prefills exactly the previous rows and renumbers after a deletion', () => {
    const form = weightForm([
      { setNumber: 2, weightKg: 92.5, repetitions: 8 },
      { setNumber: 4, weightKg: 90, repetitions: 9 },
    ]);
    expect(formSets(form.controls.sets)).toEqual([
      { setNumber: 1, weightKg: 92.5, repetitions: 8 },
      { setNumber: 2, weightKg: 90, repetitions: 9 },
    ]);
    form.controls.sets.removeAt(0);
    expect(formSets(form.controls.sets)).toEqual([{ setNumber: 1, weightKg: 90, repetitions: 9 }]);
  });
  it('validates 1–10 sets and the 3000-character optional note', () => {
    const form = weightForm([{ setNumber: 1, weightKg: 0, repetitions: 1 }]);
    expect(form.valid).toBe(true);
    form.controls.note.setValue('x'.repeat(3001));
    expect(form.valid).toBe(false);
    form.controls.note.setValue('');
    form.controls.sets.clear();
    expect(form.valid).toBe(false);
    for (let i = 0; i < 11; i++)
      form.controls.sets.push(setRow({ setNumber: i + 1, weightKg: 0, repetitions: 100 }));
    expect(form.valid).toBe(false);
  });
});
