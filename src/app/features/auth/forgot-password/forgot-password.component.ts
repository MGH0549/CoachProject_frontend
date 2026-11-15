import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthService);
  private readonly notices = inject(NotificationService);
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.forgot(this.form.controls.email.value);
      this.sent.set(true);
    } catch (error) {
      this.error.set(this.notices.error(error));
    } finally {
      this.busy.set(false);
    }
  }
}
