import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientService } from '../../../core/api/services/client.service';
@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly api = inject(ClientService);
  load() {
    return firstValueFrom(this.api.clientControllerPlan());
  }
  async choose(id: string, alternativeId: string | null, version: number) {
    await firstValueFrom(
      this.api.clientControllerExercise({ id, body: { alternativeId, version } }),
    );
    return this.load();
  }
  log(planExerciseId: string, alternativeId: string | null) {
    return firstValueFrom(
      this.api.clientControllerLog({ body: { planExerciseId, alternativeId } }),
    );
  }
}
