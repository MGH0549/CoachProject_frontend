import { Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TrainingBuilderComponent } from '../plans/training-builder.component';
import { DietBuilderComponent } from '../plans/diet-builder.component';
@Component({
  selector: 'app-template-editor',
  imports: [RouterLink, TrainingBuilderComponent, DietBuilderComponent],
  templateUrl: './template-editor.component.html',
  styleUrl: './template-editor.component.css',
})
export class TemplateEditorComponent {
  readonly trainingBuilder = viewChild(TrainingBuilderComponent);
  readonly dietBuilder = viewChild(DietBuilderComponent);
  discardChanges() {
    this.trainingBuilder()?.dirty.set(false);
    this.dietBuilder()?.dirty.set(false);
  }
  canLeave() {
    return (
      !(this.trainingBuilder()?.dirty() || this.dietBuilder()?.dirty()) ||
      confirm('لديك تغييرات غير محفوظة. مغادرة الصفحة؟')
    );
  }
  private readonly route = inject(ActivatedRoute);
  readonly id =
    this.route.snapshot.paramMap.get('id') === 'new' ? '' : this.route.snapshot.paramMap.get('id')!;
  readonly diet = this.route.snapshot.data['diet'] === true;
}
