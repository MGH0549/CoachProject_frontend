import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LibraryService } from './library.service';
import { Exercise } from '../../../core/api/models/exercise';
import { ExercisePage } from '../../../core/api/models/exercise-page';
import { NotificationService } from '../../../core/feedback/notification.service';
import { VideoPanelComponent } from '../../../shared/video-panel/video-panel.component';
import { youtubeId } from './youtube-id';
@Component({
  selector: 'app-library',
  imports: [FormsModule, ReactiveFormsModule, VideoPanelComponent],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css',
})
export class LibraryComponent {
  private readonly api = inject(LibraryService);
  private readonly notices = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  readonly data = signal<ExercisePage | null>(null);
  readonly selected = signal<Exercise | null>(null);
  readonly editing = signal(false);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly preview = signal('');
  search = '';
  muscle = '';
  readonly muscles = ['الصدر', 'الظهر', 'الأرجل', 'الأكتاف', 'الذراع', 'البطن'];
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    muscleGroup: ['', Validators.required],
    video: ['', Validators.required],
    notes: ['', [Validators.maxLength(3000)]],
  });
  private sequence = 0;
  constructor() {
    void this.load();
    this.form.controls.video.valueChanges.subscribe((value) =>
      this.preview.set(youtubeId(value) || ''),
    );
  }
  async load(page = 1) {
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.api.list(page, this.search, this.muscle || undefined);
      if (sequence === this.sequence) this.data.set(data);
    } catch (error) {
      if (sequence === this.sequence) this.error.set(this.notices.error(error));
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  edit(exercise: Exercise | null) {
    this.selected.set(exercise);
    this.editing.set(true);
    this.form.reset({
      name: exercise?.name || '',
      muscleGroup: exercise?.muscleGroup || '',
      video: exercise?.youtubeVideoId || '',
      notes: exercise?.notes || '',
    });
    this.preview.set(exercise?.youtubeVideoId || '');
  }
  async save() {
    if (this.form.invalid || !youtubeId(this.form.controls.video.value)) {
      this.form.markAllAsTouched();
      this.notices.show('أدخل اسم التمرين والعضلة ورابط يوتيوب صالحاً.', true);
      return;
    }
    this.busy.set(true);
    try {
      const data = this.form.getRawValue();
      const body = {
        name: data.name,
        muscleGroup: data.muscleGroup,
        notes: data.notes,
        youtubeVideoId: youtubeId(data.video)!,
      };
      const selected = this.selected();
      const exercise = selected
        ? await this.api.update(selected.id, body, selected.version)
        : await this.api.create(body);
      this.edit(exercise);
      await this.load(this.data()?.page);
      this.notices.show('تم حفظ التمرين.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async archive() {
    const selected = this.selected();
    if (!selected || !confirm('أرشفة هذا التمرين؟ سيظل متاحاً في الخطط التي تستخدمه.')) return;
    this.busy.set(true);
    try {
      await this.api.archive(selected.id, selected.version);
      this.editing.set(false);
      this.selected.set(null);
      await this.load();
      this.notices.show('تمت أرشفة التمرين.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
