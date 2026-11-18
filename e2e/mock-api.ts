import { DietDto } from '../src/app/core/api/models/diet-dto';
import { Diet } from '../src/app/core/api/models/diet';
import { TrainingDto } from '../src/app/core/api/models/training-dto';
import { Training } from '../src/app/core/api/models/training';
import { Page } from '@playwright/test';
import { account, training, diet, exercise, checkIn } from './fixtures';
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
    role,
    registered: false,
    copied: false,
    templateCreates: 0,
    trainingSaves: 0,
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
    if (path === '/me/training') return send(state.training);
    if (path.includes('/training/exercises/') && method === 'PUT') {
      state.training.version++;
      state.training.days[0].exercises[0].selectedAlternativeId =
        request.postDataJSON().alternativeId;
      return send(state.training);
    }
    if (path === '/me/diet') return send(state.diet);
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
      return method === 'GET' ? send(paged([])) : send({ id: 'workout-1' });
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
      if (method === 'PUT') {
        state.trainingSaves++;
        state.training = enrichTraining(request.postDataJSON());
      }
      return send(state.training);
    }
    if (path === '/coach/clients/client-1/diet') {
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
      }
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
        return send({
          ...state.training,
          ...request.postDataJSON(),
          id: 'new-template',
          version: 1,
          isTemplate: true,
        });
      }
      return send(paged([{ id: 'template-1', name: 'دفع سحب أرجل', version: 1 }]));
    }
    if (path === '/coach/templates/diet') return send(paged([]));
    if (path === '/coach/templates/training/new-template') {
      state.trainingSaves++;
      return send({ ...enrichTraining(request.postDataJSON(), 'new-template'), isTemplate: true });
    }
    if (path.endsWith('/copy')) {
      state.copied = true;
      return send(state.training);
    }
    return send({ code: 'NOT_FOUND' }, 404);
  });
  return state;
}
