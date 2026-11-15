import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CoachService } from '../../../core/api/services/coach.service';
import { Client } from '../../../core/api/models/client';
import { AccessDto } from '../../../core/api/models/access-dto';
@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(CoachService);
  list(page = 1, search = '', status?: Client['status']) {
    return firstValueFrom(
      this.api.coachControllerList({ page, pageSize: 20, search: search || undefined, status }),
    );
  }
  get(clientId: string) {
    return firstValueFrom(this.api.coachControllerClient({ clientId }));
  }
  activate(clientId: string, body: AccessDto) {
    return firstValueFrom(this.api.coachControllerActivate({ clientId, body }));
  }
  extend(clientId: string, body: AccessDto) {
    return firstValueFrom(this.api.coachControllerExtend({ clientId, body }));
  }
  deactivate(clientId: string, version: number) {
    return firstValueFrom(this.api.coachControllerDeactivate({ clientId, body: { version } }));
  }
}
