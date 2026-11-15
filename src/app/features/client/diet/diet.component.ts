import { Component, inject, signal } from '@angular/core';
import { DietService } from './diet.service';
import { Diet } from '../../../core/api/models/diet';
import { NotificationService } from '../../../core/feedback/notification.service';
import { MealCardComponent } from '../../../shared/meal-card/meal-card.component';
import { StatCardComponent } from '../../../shared/stat-card/stat-card.component';
@Component({
  selector: 'app-diet',
  imports: [MealCardComponent, StatCardComponent],
  templateUrl: './diet.component.html',
  styleUrl: './diet.component.css',
})
export class DietComponent {
  private readonly api = inject(DietService);
  private readonly notices = inject(NotificationService);
  readonly plan = signal<Diet | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.plan.set(await this.api.load());
    } catch (error) {
      this.error.set(this.notices.error(error));
    } finally {
      this.loading.set(false);
    }
  }
  async choose(mealId: string, optionId: string) {
    if (this.busy() || !this.plan()) return;
    this.busy.set(true);
    try {
      this.plan.set(await this.api.choose(mealId, optionId, this.plan()!.version));
    } catch (error) {
      this.notices.error(error);
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
}
