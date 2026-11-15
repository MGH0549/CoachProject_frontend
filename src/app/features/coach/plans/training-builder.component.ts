import { Component, HostListener, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PlansService } from './plans.service';
import { LibraryService } from '../library/library.service';
import { TrainingDto } from '../../../core/api/models/training-dto';
import { Training } from '../../../core/api/models/training';
import { Exercise } from '../../../core/api/models/exercise';
import { PlacementDto } from '../../../core/api/models/placement-dto';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-training-builder',
  imports: [FormsModule, DragDropModule],
  templateUrl: './training-builder.component.html',
  styleUrl: './training-builder.component.css',
})
export class TrainingBuilderComponent {
  readonly clientId = input('');
  readonly templateMode = input(false);
  readonly templateId = input('');
  private readonly api = inject(PlansService);
  private readonly libraryApi = inject(LibraryService);
  private readonly notices = inject(NotificationService);
  readonly draft = signal<TrainingDto>({ name: '', days: [] });
  readonly original = signal<Training | null>(null);
  readonly currentTemplateId = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly dirty = signal(false);
  readonly error = signal('');
  readonly library = signal<Exercise[]>([]);
  readonly libraryTotal = signal(0);
  readonly libraryPage = signal(1);
  search = '';
  readonly dayIndex = signal(0);
  readonly exerciseIndex = signal(0);
  get day() {
    return this.draft().days[this.dayIndex()];
  }
  get placement() {
    return this.day?.exercises[this.exerciseIndex()];
  }
  constructor() {
    effect(() => {
      const clientId = this.clientId(),
        templateId = this.templateId(),
        mode = this.templateMode();
      this.currentTemplateId.set(templateId);
      if (clientId || templateId) untracked(() => void this.load());
      else if (mode) {
        this.loading.set(false);
      }
    });
    void this.loadLibrary();
  }
  async reload() {
    if (!this.dirty() || confirm('إعادة تحميل الخطة؟ ستفقد التغييرات غير المحفوظة.'))
      await this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const plan = await this.api.training(this.clientId(), this.currentTemplateId());
      this.apply(plan);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.draft.set({ name: '', days: [] });
        this.original.set(null);
      } else this.error.set(this.notices.error(error));
    } finally {
      this.loading.set(false);
    }
  }
  apply(plan: Training) {
    this.original.set(plan);
    this.draft.set({
      name: plan.name,
      version: plan.version,
      days: plan.days.map((day) => ({
        name: day.name,
        order: day.order,
        exercises: day.exercises.map((p) => ({
          exerciseId: p.exerciseId,
          sets: p.sets,
          reps: p.reps,
          restSeconds: p.restSeconds,
          tempo: p.tempo,
          note: p.note,
          order: p.order,
          alternatives: p.alternatives.map((a) => ({
            exerciseId: a.exerciseId,
            sets: a.sets,
            reps: a.reps,
            note: a.note,
          })),
        })),
      })),
    });
    this.dirty.set(false);
    this.dayIndex.set(Math.min(this.dayIndex(), Math.max(0, plan.days.length - 1)));
    this.exerciseIndex.set(0);
  }
  async loadLibrary(page = 1) {
    try {
      const result = await this.libraryApi.list(page, this.search);
      this.library.set(result.items);
      this.libraryPage.set(result.page);
      this.libraryTotal.set(result.total);
    } catch (error) {
      this.notices.error(error);
    }
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) {
      event.preventDefault();
    }
  }
  change() {
    this.dirty.set(true);
  }
  addDay() {
    this.draft.update((d) => ({
      ...d,
      days: [...d.days, { name: 'يوم جديد', order: d.days.length, exercises: [] }],
    }));
    this.dayIndex.set(this.draft().days.length - 1);
    this.exerciseIndex.set(0);
    this.change();
  }
  removeDay() {
    if (!this.day || !confirm('حذف هذا اليوم من مسودة الخطة؟')) return;
    this.draft.update((d) => ({
      ...d,
      days: d.days.filter((_, index) => index !== this.dayIndex()),
    }));
    this.dayIndex.set(0);
    this.exerciseIndex.set(0);
    this.change();
  }
  add(exercise: Exercise) {
    if (!this.day) {
      this.addDay();
    }
    this.day.exercises.push({
      exerciseId: exercise.id,
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      order: this.day.exercises.length,
      alternatives: [],
    });
    this.exerciseIndex.set(this.day.exercises.length - 1);
    this.change();
  }
  removeExercise() {
    this.day.exercises.splice(this.exerciseIndex(), 1);
    this.exerciseIndex.set(0);
    this.change();
  }
  name(id: string) {
    return (
      this.library().find((e) => e.id === id)?.name ||
      this.original()
        ?.days.flatMap((d) =>
          d.exercises.flatMap((p) => [p.exercise, ...p.alternatives.map((a) => a.exercise)]),
        )
        .find((e) => e.id === id)?.name ||
      'تمرين'
    );
  }
  drop(event: CdkDragDrop<PlacementDto[]>) {
    moveItemInArray(this.day.exercises, event.previousIndex, event.currentIndex);
    this.exerciseIndex.set(event.currentIndex);
    this.change();
  }
  move(index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= this.day.exercises.length) return;
    moveItemInArray(this.day.exercises, index, next);
    this.exerciseIndex.set(next);
    this.change();
  }
  addAlternative(id: string) {
    if (
      !id ||
      !this.placement ||
      this.placement.exerciseId === id ||
      this.placement.alternatives.some((a) => a.exerciseId === id)
    )
      return;
    this.placement.alternatives.push({ exerciseId: id });
    this.change();
  }
  body(): TrainingDto {
    return {
      ...this.draft(),
      days: this.draft().days.map((day, index) => ({
        ...day,
        order: index,
        exercises: day.exercises.map((p, i) => ({ ...p, order: i })),
      })),
    };
  }
  valid() {
    return (
      !!this.draft().name.trim() &&
      this.draft().days.length > 0 &&
      this.draft().days.every(
        (d) =>
          d.name.trim() &&
          d.exercises.length &&
          d.exercises.every(
            (p) => p.sets > 0 && Number.isInteger(p.sets) && p.reps.trim() && p.restSeconds >= 0,
          ),
      )
    );
  }
  async save(asTemplate = false) {
    if (!this.valid()) {
      this.notices.show(
        'أدخل اسم الخطة، وأضف يوماً وتمريناً على الأقل لكل يوم، وراجع المجموعات والتكرارات.',
        true,
      );
      return;
    }
    this.busy.set(true);
    try {
      if (asTemplate) {
        await this.api.trainingTemplate(this.body());
      } else {
        const plan = await this.api.saveTraining(
          this.clientId(),
          this.body(),
          this.templateMode(),
          this.currentTemplateId(),
        );
        if (this.templateMode()) this.currentTemplateId.set(plan.id);
        this.apply(plan);
      }
      this.notices.show(asTemplate ? 'تم حفظ نسخة كقالب.' : 'تم حفظ الخطة التدريبية.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async lock(locked: boolean) {
    if (!this.original() || this.dirty()) return;
    this.busy.set(true);
    try {
      this.apply(await this.api.lockTraining(this.clientId(), this.original()!.version, locked));
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async lockPlacement(locked: boolean) {
    const original = this.original(),
      placement = original?.days[this.dayIndex()]?.exercises[this.exerciseIndex()];
    if (!placement || !original || this.dirty()) return;
    this.busy.set(true);
    try {
      this.apply(
        await this.api.lockExercise(
          this.clientId(),
          placement.id,
          original.version,
          placement.selectedAlternativeId,
          locked,
        ),
      );
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  get placementLocked() {
    return (
      this.original()?.days[this.dayIndex()]?.exercises[this.exerciseIndex()]?.choicesLocked ||
      false
    );
  }
}
