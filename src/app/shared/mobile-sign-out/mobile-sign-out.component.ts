import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { NotificationService } from '../../core/feedback/notification.service';

@Component({
  selector: 'app-mobile-sign-out',
  template: `
    <hr class="divider" />
    <h3>تسجيل الخروج</h3>
    <p>يمكنك تسجيل الدخول مرة أخرى للوصول إلى حسابك وخططك.</p>
    <button type="button" class="btn secondary" [disabled]="busy()" (click)="signOut()">
      {{ busy() ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج' }}
    </button>
  `,
  styles: `
    :host {
      display: none;
    }
    p {
      margin-block: 8px 16px;
    }
    @media (max-width: 760px) {
      :host {
        display: block;
      }
    }
  `,
})
export class MobileSignOutComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly notices = inject(NotificationService);
  readonly busy = signal(false);

  async signOut(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.session.signOut();
      await this.router.navigateByUrl('/auth/sign-in');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
