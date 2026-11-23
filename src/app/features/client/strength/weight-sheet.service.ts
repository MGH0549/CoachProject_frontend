import { Injectable, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { PlanLift, StrengthSession } from './strength.models';

@Injectable({ providedIn: 'root' })
export class WeightSheetService {
  private readonly dialog = inject(Dialog);
  async open(
    lift: PlanLift | null,
    session?: StrengthSession,
  ): Promise<StrengthSession | undefined> {
    const { LogWeightsComponent } = await import('./log-weights.component');
    return firstValueFrom(
      this.dialog.open<StrengthSession>(LogWeightsComponent, {
        data: { lift, session },
        ariaLabelledBy: 'log-weights-title',
        panelClass: 'weight-sheet-pane',
        maxWidth: '100vw',
        disableClose: true,
      }).closed,
    );
  }
}
