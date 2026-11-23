import { DietDto } from '../src/app/core/api/models/diet-dto';
import { Diet } from '../src/app/core/api/models/diet';
import { TrainingDto } from '../src/app/core/api/models/training-dto';
import { Training } from '../src/app/core/api/models/training';
import { Page } from '@playwright/test';
import { account, training, diet, exercise, checkIn } from './fixtures';
import { StrengthSession } from '../src/app/features/client/strength/strength.models';
export async function mockApi(
  page: Page,
  role: 'Client' | 'Coach' | null = 'Client',
  status: 'Pending' | 'Active' | 'Expired' | 'Deactivated' = 'Active',
) {
  const state = {
    account: structuredClone({ ...account, status }),
    training: structuredClone(training),
    diet: structuredClone(diet),
    history: [structuredClone(checkIn)],
    strength: [] as StrengthSession[],
    role,
    registered: false,
    copied: false,
    templateCreates: 0,
    trainingSaves: 0,
    trainingDeleted: false,
    dietDeleted: false,
    trainingTemplates: [
      structuredClone({
        ...training,
        id: 'template-1',
        name: 'دفع سحب أرجل',
        isTemplate: true,
        clientId: null,
      }),
    ] as Training[],
    dietTemplates: [] as Diet[],
    mealChoices: 0,
    dietSaves: 0,
    checkInSubmissions: 0,
    conflict: false,
    library: [structuredClone(exercise)],
  };
  const enrichTraining = (body: TrainingDto, id = state.training.id): Training => ({
    ...state.training,
    id,
    ...body,
    version: (body.version ?? 0) + 1,
    days: body.days.map((day, di) => ({
      ...day,
      id: `day-${di}`,
      exercises: day.exercises.map((p, pi) => ({
        ...p,
        id: `placement-${pi}`,
        exercise: state.library.find((e) => e.id === p.exerciseId) ?? exercise,
        choicesLocked: false,
        selectedAlternativeId: null,
        alternatives: p.alternatives.map((a, ai) => ({
          ...a,
          id: `alternative-${ai}`,
          exercise: state.library.find((e) => e.id === a.exerciseId) ?? {
            ...exercise,
            id: a.exerciseId,
          },
        })),
      })),
    })),
  });
  const token = () =>
    `header.${Buffer.from(JSON.stringify({ role: state.role, sub: 'test-user' })).toString('base64url')}.signature`;
  const paged = (items: unknown[]) => ({ items, page: 1, pageSize: 20, total: items.length });
  // Context routes also intercept network requests forwarded by the production service worker.
  await page.context().route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.replace('/api/v1', ''),
      method = request.method();
    const send = (json: unknown, status = 200) =>
      route.fulfill({
        status,
        json,
        headers: {
          'Access-Control-Allow-Origin': request.headers()['origin'] || 'http://localhost:4200',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    if (path === '/auth/refresh')
      return state.role
        ? send({ accessToken: token(), expiresIn: 900 })
        : send({ code: 'INVALID_SESSION' }, 401);
    if (path === '/auth/login') {
      state.role = 'Client';
      return send({ accessToken: token(), expiresIn: 900 });
    }
    if (path === '/auth/register') {
      state.registered = true;
      const body = request.postDataJSON();
      state.account.fullName = body.fullName;
      state.account.email = body.email;
      state.account.whatsapp = body.whatsapp;
      state.account.status = 'Pending';
      return send({ id: account.id, status: 'Pending', whatsappUrl: account.whatsappUrl }, 201);
    }
    if (
      path === '/auth/forgot-password' ||
      path === '/auth/reset-password' ||
      path === '/auth/logout'
    )
      return send({ message: 'ok' });
    if (path === '/me') return send(state.account);
    if (path.startsWith('/me/strength') && state.account.status !== 'Active')
      return send({ code: 'ACCESS_INACTIVE' }, 403);
    if (path === '/me/strength/overview') {
      const exercises = state.training.days.flatMap((day) =>
        day.exercises.flatMap((placement) => [
          placement.exercise,
          ...placement.alternatives.map((alt) => alt.exercise),
        ]),
      );
      const unique = new Map(exercises.map((e) => [e.id, e.name]));
      for (const session of state.strength) unique.set(session.exerciseId, session.exerciseName);
      return send({
        items: [...unique].map(([exerciseId, exerciseName]) => {
          const sessions = state.strength
            .filter((s) => s.exerciseId === exerciseId)
            .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
          const sets = sessions.flatMap((s) => s.sets);
          return {
            exerciseId,
            exerciseName,
            latestWeightKg: sessions[0]?.heaviestWeightKg ?? null,
            bestWeightKg: sets.length ? Math.max(...sets.map((s) => s.weightKg)) : null,
            bestSet: sets[0] ?? null,
            estimatedOneRepMaxKg: null,
            trendKg: null,
            latestRecordedAt: sessions[0]?.recordedAt ?? null,
          };
        }),
      });
    }
    if (path.startsWith('/me/strength/exercises/')) {
      const exerciseId = path.split('/').at(-1);
      const url = new URL(request.url());
      const page = Number(url.searchParams.get('page') || 1),
        pageSize = Number(url.searchParams.get('pageSize') || 20);
      const items = state.strength
        .filter((s) => s.exerciseId === exerciseId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      return send({
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize,
      });
    }
    if (
      (path === '/me/strength' && method === 'POST') ||
      (path === '/me/workouts' && method === 'POST' && request.postDataJSON().sets) ||
      (path.startsWith('/me/strength/') && method === 'PUT')
    ) {
      const body = request.postDataJSON();
      const old = state.strength.find((s) => s.id === path.split('/').at(-1));
      const placement = state.training.days
        .flatMap((d) => d.exercises)
        .find((p) => p.id === body.planExerciseId);
      const chosen =
        placement?.alternatives.find((a) => a.id === body.alternativeId)?.exercise ??
        placement?.exercise;
      const result: StrengthSession = {
        ...old,
        id: old?.id ?? `strength-${Date.now()}`,
        exerciseId: old?.exerciseId ?? chosen!.id,
        exerciseName: old?.exerciseName ?? chosen!.name,
        planExerciseId: old?.planExerciseId ?? body.planExerciseId,
        alternativeId: old?.alternativeId ?? body.alternativeId,
        recordedAt: old?.recordedAt ?? new Date().toISOString(),
        localDate:
          old?.localDate ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }),
        sets: body.sets,
        note: body.note ?? null,
        bestSet: body.sets[0],
        heaviestWeightKg: Math.max(...body.sets.map((s: { weightKg: number }) => s.weightKg)),
        estimatedOneRepMaxKg: null,
      };
      state.strength = [...state.strength.filter((s) => s.id !== result.id), result];
      return send(result, old ? 200 : 201);
    }
    if (path.startsWith('/me/strength/') && method === 'DELETE') {
      state.strength = state.strength.filter((s) => s.id !== path.split('/').at(-1));
      return send({ message: 'ok' });
    }
    if (path === '/me/training') {
      const last = (exerciseId: string) => {
        const history = state.strength
          .filter((s) => s.exerciseId === exerciseId)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
        const latest = history[0];
        return latest
          ? {
              lastSession: {
                sets: latest.sets,
                recordedAt: latest.recordedAt,
                localDate: latest.localDate,
              },
              bestWeightKg: Math.max(...history.flatMap((s) => s.sets.map((set) => set.weightKg))),
            }
          : {};
      };
      const plan = {
        ...state.training,
        days: state.training.days.map((day) => ({
          ...day,
          exercises: day.exercises.map((p) => ({
            ...p,
            ...last(p.exerciseId),
            alternatives: p.alternatives.map((a) => ({ ...a, ...last(a.exerciseId) })),
          })),
        })),
      };
      return state.trainingDeleted ? send({ code: 'NOT_FOUND' }, 404) : send(plan);
    }
    if (path.includes('/training/exercises/') && method === 'PUT') {
      state.training.version++;
      state.training.days[0].exercises[0].selectedAlternativeId =
        request.postDataJSON().alternativeId;
      return send(state.training);
    }
    if (path === '/me/diet')
      return state.dietDeleted ? send({ code: 'NOT_FOUND' }, 404) : send(state.diet);
    if (path.includes('/diet/meals/') && method === 'PUT') {
      state.mealChoices++;
      if (state.conflict) {
        state.conflict = false;
        return send({ code: 'VERSION_CONFLICT' }, 409);
      }
      const body = request.postDataJSON();
      state.diet.version++;
      state.diet.meals[0].selection = { optionId: body.optionId, locked: body.locked ?? false };
      const option = state.diet.meals[0].options.find((o) => o.id === body.optionId)!;
      state.diet.selectedTotals = {
        calories: option.calories,
        protein: option.protein,
        carbs: option.carbs,
        fat: option.fat,
      };
      return send(state.diet);
    }
    if (path === '/me/progress') return send(paged(state.history));
    if (path === '/me/workouts')
      return method === 'GET'
        ? send(paged([]))
        : send(
            {
              id: 'workout-1',
              recordedAt: new Date().toISOString(),
              localDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }),
            },
            201,
          );
    if (path === '/me/check-ins') {
      state.checkInSubmissions++;
      const item = { ...checkIn, ...request.postDataJSON(), id: 'check-new' };
      state.history.unshift(item);
      return send(item, 201);
    }
    if (path.includes('/photos') && method === 'POST') return send({ id: 'photo-new' }, 201);
    if (path === '/coach/clients') {
      const filter = new URL(request.url()).searchParams.get('status');
      return send(paged(!filter || filter === state.account.status ? [state.account] : []));
    }
    if (path === '/coach/clients/client-1') return send(state.account);
    if (path === '/coach/clients/client-1/activate' || path === '/coach/clients/client-1/extend') {
      state.account.status = 'Active';
      state.account.version++;
      return send(state.account);
    }
    if (path === '/coach/clients/client-1/training') {
      if (method === 'DELETE') {
        const body = request.postDataJSON();
        if (body.planId !== state.training.id || body.version !== state.training.version)
          return send({ code: 'VERSION_CONFLICT' }, 409);
        state.trainingDeleted = true;
        return send({ message: 'ok' });
      }
      if (method === 'PUT') {
        state.trainingSaves++;
        state.training = enrichTraining(request.postDataJSON());
        state.trainingDeleted = false;
      }
      if (state.trainingDeleted) return send({ code: 'NOT_FOUND' }, 404);
      return send(state.training);
    }
    if (path === '/coach/clients/client-1/diet') {
      if (method === 'DELETE') {
        const body = request.postDataJSON();
        if (body.planId !== state.diet.id || body.version !== state.diet.version)
          return send({ code: 'VERSION_CONFLICT' }, 409);
        state.dietDeleted = true;
        return send({ message: 'ok' });
      }
      if (method === 'PUT') {
        state.dietSaves++;
        const body: DietDto = request.postDataJSON();
        const plan: Diet = {
          ...state.diet,
          ...body,
          version: state.diet.version + 1,
          meals: body.meals.map((meal, index) => ({
            ...meal,
            id: `meal-${index + 1}`,
            time: meal.time || null,
            selection: state.diet.meals[index]?.selection || null,
            options: meal.options.map((option, i) => ({ ...option, id: `option-${i + 1}` })),
          })),
        };
        state.diet = plan;
        state.dietDeleted = false;
      }
      if (state.dietDeleted) return send({ code: 'NOT_FOUND' }, 404);
      return send(state.diet);
    }
    if (path === '/coach/clients/client-1/diet/lock') {
      state.diet.choicesLocked = request.postDataJSON().locked;
      state.diet.version++;
      return send(state.diet);
    }
    if (path.includes('/check-ins/') && path.endsWith('/feedback')) {
      state.history[0].feedback = request.postDataJSON().feedback;
      state.history[0].version++;
      return send({ message: 'ok' });
    }
    if (path === '/coach/clients/client-1/progress') return send(paged(state.history));
    if (path === '/coach/exercises') {
      if (method === 'POST') {
        state.library.push({ ...exercise, ...request.postDataJSON(), id: 'new-exercise' });
        return send(state.library.at(-1));
      }
      return send(paged(state.library));
    }
    if (path === '/coach/templates/training') {
      if (method === 'POST') {
        state.templateCreates++;
        const template = {
          ...enrichTraining(request.postDataJSON(), 'new-template'),
          version: 1,
          isTemplate: true,
          clientId: null,
        };
        state.trainingTemplates.push(template);
        return send(template);
      }
      return send(
        paged(state.trainingTemplates.map(({ id, name, version }) => ({ id, name, version }))),
      );
    }
    if (path === '/coach/templates/diet') {
      if (method === 'POST') {
        const template = {
          ...state.diet,
          ...request.postDataJSON(),
          id: 'new-diet-template',
          version: 1,
          isTemplate: true,
          clientId: null,
        };
        state.dietTemplates.push(template);
        return send(template);
      }
      return send(
        paged(state.dietTemplates.map(({ id, name, version }) => ({ id, name, version }))),
      );
    }
    const templatePath = path.match(/^\/coach\/templates\/(training|diet)\/([^/]+)$/);
    if (templatePath) {
      const kind = templatePath[1],
        id = templatePath[2];
      const templates = kind === 'training' ? state.trainingTemplates : state.dietTemplates;
      const index = templates.findIndex((template) => template.id === id);
      if (index < 0) return send({ code: 'NOT_FOUND' }, 404);
      if (method === 'DELETE') {
        if (request.postDataJSON().version !== templates[index].version)
          return send({ code: 'VERSION_CONFLICT' }, 409);
        templates.splice(index, 1);
        return send({ message: 'ok' });
      }
      if (method === 'PUT') {
        const old = templates[index];
        if (kind === 'training') {
          state.trainingSaves++;
          templates[index] = {
            ...enrichTraining(request.postDataJSON(), id),
            version: old.version + 1,
            isTemplate: true,
            clientId: null,
          };
        } else templates[index] = { ...old, ...request.postDataJSON(), version: old.version + 1 };
      }
      return send(templates[index]);
    }
    if (path.endsWith('/copy')) {
      state.copied = true;
      return send(state.training);
    }
    return send({ code: 'NOT_FOUND' }, 404);
  });
  return state;
}
