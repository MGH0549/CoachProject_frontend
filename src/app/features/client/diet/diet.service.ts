import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientService } from '../../../core/api/services/client.service';
@Injectable({ providedIn: 'root' })
export class DietService {
  private readonly api = inject(ClientService);
  load() {
    return firstValueFrom(this.api.clientControllerDietPlan());
  }
  async choose(id: string, optionId: string, version: number) {
    await firstValueFrom(this.api.clientControllerMeal({ id, body: { optionId, version } }));
    return this.load();
  }
}
