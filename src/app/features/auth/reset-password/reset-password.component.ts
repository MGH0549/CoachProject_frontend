import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthService);
  private readonly notices = inject(NotificationService);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') || '';
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(128),
        Validators.pattern(/^(?=.*[a-zA-Z])(?=.*[0-9]).+$/),
      ],
    ],
    confirm: ['', Validators.required],
  });
  async submit() {
    if (
      !this.token ||
      this.form.invalid ||
      this.form.controls.password.value !== this.form.controls.confirm.value
    ) {
      this.form.markAllAsTouched();
      this.error.set('راجع كلمة المرور وتأكيدها. استخدم 12–128 حرفاً تشمل حروفاً وأرقاماً.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.reset(this.token, this.form.controls.password.value);
      this.done.set(true);
      this.form.reset();
    } catch (error) {
      this.error.set(this.notices.error(error));
    } finally {
      this.busy.set(false);
    }
  }
}
