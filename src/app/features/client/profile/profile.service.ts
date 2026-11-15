import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientService } from '../../../core/api/services/client.service';
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ClientService);
  export() {
    return firstValueFrom(this.api.clientControllerExport());
  }
  delete() {
    return firstValueFrom(this.api.clientControllerDelete());
  }
}
