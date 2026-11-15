import { Component, HostListener, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PlansService } from './plans.service';
import { DietDto } from '../../../core/api/models/diet-dto';
import { Diet } from '../../../core/api/models/diet';
import { OptionDto } from '../../../core/api/models/option-dto';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-diet-builder',
  imports: [FormsModule],
  templateUrl: './diet-builder.component.html',
  styleUrl: './diet-builder.component.css',
})
export class DietBuilderComponent {
  readonly clientId = input('');
  readonly templateMode = input(false);
  readonly templateId = input('');
  private readonly api = inject(PlansService);
  private readonly notices = inject(NotificationService);
  readonly draft = signal<DietDto>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    meals: [],
  });
  readonly original = signal<Diet | null>(null);
  readonly currentTemplateId = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly dirty = signal(false);
  readonly error = signal('');
  readonly mealIndex = signal(0);
  get meal() {
    return this.draft().meals[this.mealIndex()];
  }
  constructor() {
    effect(() => {
      const id = this.clientId(),
        templateId = this.templateId(),
        mode = this.templateMode();
      this.currentTemplateId.set(templateId);
      if (id || templateId) untracked(() => void this.load());
      else if (mode) this.loading.set(false);
    });
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) {
      event.preventDefault();
    }
  }
  change() {
    this.dirty.set(true);
  }
  async reload() {
    if (!this.dirty() || confirm('إعادة تحميل الخطة؟ ستفقد التغييرات غير المحفوظة.'))
      await this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.apply(await this.api.diet(this.clientId(), this.currentTemplateId()));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.original.set(null);
      } else this.error.set(this.notices.error(error));
    } finally {
      this.loading.set(false);
    }
  }
  apply(plan: Diet) {
    this.original.set(plan);
    this.draft.set({
      name: plan.name,
      version: plan.version,
      calories: plan.calories,
      protein: plan.protein,
      carbs: plan.carbs,
      fat: plan.fat,
      meals: plan.meals.map((meal) => ({
        name: meal.name,
        time: meal.time || undefined,
        order: meal.order,
        options: meal.options.map((option) => ({
          name: option.name,
          calories: option.calories,
          protein: option.protein,
          carbs: option.carbs,
          fat: option.fat,
          items: option.items.map((item) => ({ ...item })),
        })),
      })),
    });
    this.dirty.set(false);
    this.mealIndex.set(Math.min(this.mealIndex(), Math.max(0, plan.meals.length - 1)));
  }
  option(): OptionDto {
    return { name: '', calories: 0, protein: 0, carbs: 0, fat: 0, items: [] };
  }
  addMeal() {
    this.draft.update((d) => ({
      ...d,
      meals: [
        ...d.meals,
        {
          name: 'وجبة جديدة',
          time: '',
          order: d.meals.length,
          options: [this.option(), this.option()],
        },
      ],
    }));
    this.mealIndex.set(this.draft().meals.length - 1);
    this.change();
  }
  removeMeal() {
    if (!confirm('حذف هذه الوجبة من مسودة النظام؟')) return;
    this.draft.update((d) => ({
      ...d,
      meals: d.meals.filter((_, index) => index !== this.mealIndex()),
    }));
    this.mealIndex.set(0);
    this.change();
  }
  addOption() {
    this.meal.options.push(this.option());
    this.change();
  }
  addFood(option: OptionDto) {
    option.items.push({ food: '', quantity: 0, unit: 'جم' });
    this.change();
  }
  valid() {
    const d = this.draft();
    return (
      !!d.name.trim() &&
      [d.calories, d.protein, d.carbs, d.fat].every((n) => Number.isFinite(n) && n >= 0) &&
      d.meals.length > 0 &&
      d.meals.every(
        (meal) =>
          meal.name.trim() &&
          meal.options.length >= 2 &&
          meal.options.every(
            (option) =>
              option.name.trim() &&
              [option.calories, option.protein, option.carbs, option.fat].every(
                (n) => Number.isFinite(n) && n >= 0,
              ) &&
              option.items.length > 0 &&
              option.items.every(
                (item) => item.food.trim() && item.quantity > 0 && item.unit.trim(),
              ),
          ),
      )
    );
  }
  async save(asTemplate = false) {
    if (!this.valid()) {
      this.notices.show(
        'أكمل اسم النظام والوجبات. أضف خيارين لكل وجبة، مع مكوناتها وكمياتها والماكروز.',
        true,
      );
      return;
    }
    this.busy.set(true);
    try {
      const body = {
        ...this.draft(),
        meals: this.draft().meals.map((meal, index) => ({
          ...meal,
          time: meal.time || undefined,
          order: index,
        })),
      };
      if (asTemplate) await this.api.dietTemplate(body);
      else {
        const plan = await this.api.saveDiet(
          this.clientId(),
          body,
          this.templateMode(),
          this.currentTemplateId(),
        );
        if (this.templateMode()) this.currentTemplateId.set(plan.id);
        this.apply(plan);
      }
      this.notices.show(asTemplate ? 'تم حفظ النظام كقالب.' : 'تم حفظ النظام الغذائي.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async lockAll(locked: boolean) {
    if (!this.original() || this.dirty()) return;
    this.busy.set(true);
    try {
      this.apply(await this.api.lockDiet(this.clientId(), this.original()!.version, locked));
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async select(mealId: string, optionId: string, locked: boolean) {
    if (!this.original() || this.dirty() || !optionId) return;
    this.busy.set(true);
    try {
      this.apply(
        await this.api.chooseMeal(
          this.clientId(),
          mealId,
          optionId,
          this.original()!.version,
          locked,
        ),
      );
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
