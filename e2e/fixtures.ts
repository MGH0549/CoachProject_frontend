import { Account } from '../src/app/core/api/models/account';
import { Training } from '../src/app/core/api/models/training';
import { Diet } from '../src/app/core/api/models/diet';
import { CheckIn } from '../src/app/core/api/models/check-in';
export const account: Account = {
  id: 'client-1',
  userId: 'user-1',
  email: 'client@example.test',
  fullName: 'أحمد محمد',
  whatsapp: '+201234567890',
  package: 'أونلاين',
  status: 'Active',
  accessEndAt: '2027-01-01T21:59:59Z',
  activatedAt: '2026-11-01T10:00:00Z',
  deactivatedAt: null,
  createdAt: '2026-11-01T10:00:00Z',
  version: 1,
  timeZone: 'Africa/Cairo',
  whatsappUrl: 'https://wa.me/201234567890?text=hello',
};
export const exercise = {
  id: 'exercise-1',
  name: 'ضغط الصدر بالبار',
  muscleGroup: 'الصدر',
  youtubeVideoId: 'dQw4w9WgXcQ',
  notes: 'تحكم في النزول وحافظ على ثبات الكتف.',
  archived: false,
  version: 1,
};
export const training: Training = {
  id: 'training-1',
  clientId: account.id,
  name: 'خطة بناء العضلات',
  version: 1,
  isTemplate: false,
  choicesLocked: false,
  days: [
    {
      id: 'day-1',
      name: 'يوم الدفع',
      order: 0,
      exercises: [
        {
          id: 'placement-1',
          exerciseId: exercise.id,
          exercise,
          sets: 4,
          reps: '8-10',
          restSeconds: 90,
          order: 0,
          choicesLocked: false,
          selectedAlternativeId: null,
          note: exercise.notes,
          alternatives: [
            {
              id: 'alternative-1',
              exerciseId: 'exercise-2',
              exercise: { ...exercise, id: 'exercise-2', name: 'ضغط الصدر بالدمبل' },
            },
          ],
        },
      ],
    },
  ],
};
export const diet: Diet = {
  id: 'diet-1',
  clientId: account.id,
  name: 'نظام متوازن',
  version: 1,
  isTemplate: false,
  choicesLocked: false,
  calories: 2450,
  protein: 210,
  carbs: 260,
  fat: 65,
  selectedTotals: { calories: 620, protein: 35, carbs: 70, fat: 20 },
  meals: [
    {
      id: 'meal-1',
      name: 'الإفطار',
      time: '07:30',
      order: 0,
      selection: { optionId: 'option-1', locked: false },
      options: [
        {
          id: 'option-1',
          name: 'شوفان وبيض',
          calories: 620,
          protein: 35,
          carbs: 70,
          fat: 20,
          items: [
            { food: 'شوفان', quantity: 100, unit: 'جم' },
            { food: 'بيض', quantity: 3, unit: 'حبة' },
          ],
        },
        {
          id: 'option-2',
          name: 'زبادي وفاكهة',
          calories: 550,
          protein: 30,
          carbs: 65,
          fat: 15,
          items: [{ food: 'زبادي', quantity: 200, unit: 'جم' }],
        },
      ],
    },
  ],
};
export const checkIn: CheckIn = {
  id: 'check-1',
  clientId: account.id,
  weight: 84.2,
  measurements: { waist: 82, chest: 102, arms: 38 },
  energy: 4,
  notes: 'أسبوع جيد',
  feedback: 'استمر على الخطة',
  version: 1,
  recordedAt: '2026-11-15T10:00:00Z',
  localDate: '2026-11-15',
  photos: [],
};
