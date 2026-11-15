import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CoachService } from '../../../core/api/services/coach.service';
import { ExerciseDto } from '../../../core/api/models/exercise-dto';
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly api = inject(CoachService);
  list(page = 1, search = '', muscleGroup?: string) {
    return firstValueFrom(
      this.api.coachControllerLibrary({
        page,
        pageSize: 24,
        search: search || undefined,
        muscleGroup,
        archived: false,
      }),
    );
  }
  create(body: ExerciseDto) {
    return firstValueFrom(this.api.coachControllerCreateExercise({ body }));
  }
  update(id: string, body: ExerciseDto, version: number) {
    return firstValueFrom(
      this.api.coachControllerUpdateExercise({ id, body: { ...body, version } }),
    );
  }
  archive(id: string, version: number) {
    return firstValueFrom(this.api.coachControllerArchive({ id, body: { version } }));
  }
}
