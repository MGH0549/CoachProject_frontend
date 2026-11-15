import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom, filter, tap } from 'rxjs';
import { ClientService } from '../../../core/api/services/client.service';
import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import { CheckInDto } from '../../../core/api/models/check-in-dto';
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly api = inject(ClientService);
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  history(page = 1) {
    return firstValueFrom(this.api.clientControllerHistory({ page, pageSize: 20 }));
  }
  workouts() {
    return firstValueFrom(this.api.clientControllerWorkouts({ pageSize: 100 }));
  }
  submit(body: CheckInDto) {
    return firstValueFrom(this.api.clientControllerCheckIn({ body }));
  }
  async photo(id: string) {
    return firstValueFrom(this.api.clientControllerPhoto({ id }));
  }
  upload(id: string, file: File, progress: (value: number) => void) {
    const body = new FormData();
    body.append('photo', file);
    return firstValueFrom(
      this.http
        .post(`${this.base}/v1/me/check-ins/${encodeURIComponent(id)}/photos`, body, {
          reportProgress: true,
          observe: 'events',
        })
        .pipe(
          tap((event) => {
            if (event.type === HttpEventType.UploadProgress)
              progress(Math.round((100 * event.loaded) / (event.total || file.size)));
          }),
          filter((event) => event.type === HttpEventType.Response),
        ),
    );
  }
}
