import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../../../core/auth/session.service';
import { NotificationService } from '../../../core/feedback/notification.service';
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly notices = inject(NotificationService);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly registered = signal(false);
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    whatsapp: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{8,15}$/)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(128),
        Validators.pattern(/^(?=.*[a-zA-Z])(?=.*[0-9]).+$/),
      ],
    ],
    consent: [false, Validators.requiredTrue],
  });
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const data = this.form.getRawValue();
    try {
      await this.auth.register({ ...data, consent: true });
      this.registered.set(true);
      await this.session.signIn({ email: data.email, password: data.password });
      await this.router.navigateByUrl('/auth/pending');
    } catch (error) {
      this.error.set(
        this.registered() ? 'تم إنشاء الحساب. سجّل الدخول للمتابعة.' : this.notices.error(error),
      );
    } finally {
      this.busy.set(false);
    }
  }
}
