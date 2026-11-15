import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CoachService } from '../../../core/api/services/coach.service';
@Injectable({ providedIn: 'root' })
export class ClientProgressService {
  private readonly api = inject(CoachService);
  history(clientId: string, page = 1) {
    return firstValueFrom(
      this.api.coachControllerProgressHistory({ clientId, page, pageSize: 20 }),
    );
  }
  feedback(clientId: string, id: string, feedback: string, version: number) {
    return firstValueFrom(
      this.api.coachControllerFeedback({ clientId, id, body: { feedback, version } }),
    );
  }
  photo(clientId: string, id: string) {
    return firstValueFrom(this.api.coachControllerPhoto({ clientId, id }));
  }
}
