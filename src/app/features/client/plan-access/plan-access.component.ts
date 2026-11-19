import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { SessionService } from '../../../core/auth/session.service';
import { AccountAccessComponent } from '../../../shared/account-access/account-access.component';
import { TrainingComponent } from '../training/training.component';
import { DietComponent } from '../diet/diet.component';
import { ProgressComponent } from '../progress/progress.component';

@Component({
  selector: 'app-plan-access',
  imports: [AccountAccessComponent, TrainingComponent, DietComponent, ProgressComponent],
  template: `
    <div [class.diet-access]="routeData()['page'] === 'diet'">
      @if (session.isActive()) {
        @switch (routeData()['page']) {
          @case ('training') {
            <app-training />
          }
          @case ('diet') {
            <app-diet />
          }
          @case ('progress') {
            <app-progress />
          }
        }
      } @else {
        <app-account-access [planLocked]="true" />
      }
    </div>
  `,
  styles: `
    .diet-access {
      --action-red: var(--action-green);
      --action-red-hover: var(--action-green-hover);
    }
  `,
})
export class PlanAccessComponent {
  readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  constructor() {
    const dialog = inject(Dialog);
    effect(() => {
      if (!this.session.isActive()) dialog.closeAll();
    });
  }
}
