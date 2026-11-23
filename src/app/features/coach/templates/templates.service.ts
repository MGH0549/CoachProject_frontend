import { Training } from '../../../core/api/models/training';
import { Diet } from '../../../core/api/models/diet';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TemplatesService as GeneratedTemplatesService } from '../../../core/api/services/templates.service';
import { CoachService } from '../../../core/api/services/coach.service';
import { PlansService } from '../plans/plans.service';
@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly plans = inject(PlansService);
  remove(diet: boolean, id: string, version: number) {
    return this.plans.deleteTemplate(diet ? 'diet' : 'training', id, version);
  }
  private readonly api = inject(GeneratedTemplatesService);
  private readonly coach = inject(CoachService);
  list(diet: boolean, page = 1, search = '') {
    return firstValueFrom(
      diet
        ? this.api.templatesControllerDietList({ page, pageSize: 20, search: search || undefined })
        : this.api.templatesControllerTrainingList({
            page,
            pageSize: 20,
            search: search || undefined,
          }),
    );
  }
  get(diet: boolean, id: string) {
    return firstValueFrom<Training | Diet>(
      diet
        ? this.api.templatesControllerGetDiet({ id })
        : this.api.templatesControllerGetTraining({ id }),
    );
  }
  clients(page = 1, search = '') {
    return firstValueFrom(
      this.coach.coachControllerList({ page, pageSize: 20, search: search || undefined }),
    );
  }
  async copy(diet: boolean, id: string, clientId: string) {
    let version: number | undefined;
    try {
      const current = await firstValueFrom<Training | Diet>(
        diet
          ? this.coach.coachControllerDietPlan({ clientId })
          : this.coach.coachControllerTrainingPlan({ clientId }),
      );
      version = current.version;
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
    }
    return firstValueFrom<Training | Diet>(
      diet
        ? this.api.templatesControllerCopyDiet({ id, body: { clientId, version } })
        : this.api.templatesControllerCopyTraining({ id, body: { clientId, version } }),
    );
  }
  async duplicate(diet: boolean, id: string) {
    const plan = await this.get(diet, id);
    if ('days' in plan)
      return firstValueFrom(
        this.api.templatesControllerCreateTraining({
          body: {
            name: plan.name + ' (نسخة)',
            days: plan.days.map((day) => ({
              name: day.name,
              order: day.order,
              exercises: day.exercises.map((p) => ({
                exerciseId: p.exerciseId,
                sets: p.sets,
                reps: p.reps,
                restSeconds: p.restSeconds,
                tempo: p.tempo,
                note: p.note,
                order: p.order,
                alternatives: p.alternatives.map((a) => ({
                  exerciseId: a.exerciseId,
                  sets: a.sets,
                  reps: a.reps,
                  note: a.note,
                })),
              })),
            })),
          },
        }),
      );
    return firstValueFrom(
      this.api.templatesControllerCreateDiet({
        body: {
          name: plan.name + ' (نسخة)',
          calories: plan.calories,
          protein: plan.protein,
          carbs: plan.carbs,
          fat: plan.fat,
          meals: plan.meals.map((meal) => ({
            name: meal.name,
            time: meal.time || undefined,
            order: meal.order,
            options: meal.options.map((o) => ({
              name: o.name,
              calories: o.calories,
              protein: o.protein,
              carbs: o.carbs,
              fat: o.fat,
              items: o.items.map((item) => ({ ...item })),
            })),
          })),
        },
      }),
    );
  }
}
