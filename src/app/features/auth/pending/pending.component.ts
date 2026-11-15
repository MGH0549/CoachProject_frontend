import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { NotificationService } from '../../../core/feedback/notification.service';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
@Component({
  selector: 'app-pending',
  imports: [StatusBadgeComponent],
  templateUrl: './pending.component.html',
  styleUrl: './pending.component.css',
})
export class PendingComponent {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly notices = inject(NotificationService);
  readonly busy = signal(false);
  get whatsapp() {
    const url = this.session.account()?.whatsappUrl;
    try {
      const parsed = new URL(url ?? '');
      return parsed.protocol === 'https:' && ['wa.me', 'api.whatsapp.com'].includes(parsed.hostname)
        ? parsed.href
        : null;
    } catch {
      return null;
    }
  }
  async check() {
    this.busy.set(true);
    try {
      await this.session.loadAccount();
      if (this.session.account()?.status === 'Active')
        await this.router.navigateByUrl('/client/training');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async logout() {
    try {
      await this.session.signOut();
      await this.router.navigateByUrl('/auth/sign-in');
    } catch (error) {
      this.notices.error(error);
    }
  }
}
