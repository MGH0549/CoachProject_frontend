import { Component, input, output, computed } from '@angular/core';
import { Meal } from '../../core/api/models/meal';
@Component({
  selector: 'app-meal-card',
  templateUrl: './meal-card.component.html',
  styleUrl: './meal-card.component.css',
})
export class MealCardComponent {
  readonly meal = input.required<Meal>();
  readonly locked = input(false);
  readonly busy = input(false);
  readonly choose = output<string>();
  readonly selected = computed(() =>
    this.meal().options.find((o) => o.id === this.meal().selection?.optionId),
  );
}
