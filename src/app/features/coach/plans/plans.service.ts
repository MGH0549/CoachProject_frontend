import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CoachService } from '../../../core/api/services/coach.service';
import { TemplatesService } from '../../../core/api/services/templates.service';
import { TrainingDto } from '../../../core/api/models/training-dto';
import { DietDto } from '../../../core/api/models/diet-dto';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api-base-url.token';
@Injectable({ providedIn: 'root' })
export class PlansService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  deleteTemplate(kind: 'training' | 'diet', id: string, version: number) {
    return firstValueFrom(
      this.http.delete(`${this.base}/v1/coach/templates/${kind}/${encodeURIComponent(id)}`, {
        body: { version },
      }),
    );
  }
  deletePlan(clientId: string, kind: 'training' | 'diet', planId: string, version: number) {
    return firstValueFrom(
      this.http.delete(`${this.base}/v1/coach/clients/${encodeURIComponent(clientId)}/${kind}`, {
        body: { planId, version },
      }),
    );
  }
  private readonly coach = inject(CoachService);
  private readonly templates = inject(TemplatesService);
  training(clientId: string, templateId = '') {
    return firstValueFrom(
      templateId
        ? this.templates.templatesControllerGetTraining({ id: templateId })
        : this.coach.coachControllerTrainingPlan({ clientId }),
    );
  }
  saveTraining(clientId: string, body: TrainingDto, templateMode = false, templateId = '') {
    return firstValueFrom(
      templateMode
        ? templateId
          ? this.templates.templatesControllerEditTraining({ id: templateId, body })
          : this.templates.templatesControllerCreateTraining({ body })
        : this.coach.coachControllerSaveTraining({ clientId, body }),
    );
  }
  trainingTemplate(body: TrainingDto) {
    return firstValueFrom(
      this.templates.templatesControllerCreateTraining({ body: { ...body, version: undefined } }),
    );
  }
  lockTraining(clientId: string, version: number, locked: boolean) {
    return firstValueFrom(
      this.coach.coachControllerLockTraining({ clientId, body: { version, locked } }),
    );
  }
  lockExercise(
    clientId: string,
    id: string,
    version: number,
    alternativeId: string | null,
    locked: boolean,
  ) {
    return firstValueFrom(
      this.coach.coachControllerSelectExercise({
        clientId,
        id,
        body: { version, alternativeId, locked },
      }),
    );
  }
  diet(clientId: string, templateId = '') {
    return firstValueFrom(
      templateId
        ? this.templates.templatesControllerGetDiet({ id: templateId })
        : this.coach.coachControllerDietPlan({ clientId }),
    );
  }
  saveDiet(clientId: string, body: DietDto, templateMode = false, templateId = '') {
    return firstValueFrom(
      templateMode
        ? templateId
          ? this.templates.templatesControllerEditDiet({ id: templateId, body })
          : this.templates.templatesControllerCreateDiet({ body })
        : this.coach.coachControllerSaveDiet({ clientId, body }),
    );
  }
  dietTemplate(body: DietDto) {
    return firstValueFrom(
      this.templates.templatesControllerCreateDiet({ body: { ...body, version: undefined } }),
    );
  }
  lockDiet(clientId: string, version: number, locked: boolean) {
    return firstValueFrom(
      this.coach.coachControllerLockDiet({ clientId, body: { version, locked } }),
    );
  }
  chooseMeal(clientId: string, id: string, optionId: string, version: number, locked: boolean) {
    return firstValueFrom(
      this.coach.coachControllerSelectMeal({ clientId, id, body: { optionId, version, locked } }),
    );
  }
}
