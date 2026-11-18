import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProfileService } from './profile.service';
import { SessionService } from '../../../core/auth/session.service';
import { NotificationService } from '../../../core/feedback/notification.service';
import { CairoDatePipe } from '../../../shared/pipes/cairo-date.pipe';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
import { MobileSignOutComponent } from '../../../shared/mobile-sign-out/mobile-sign-out.component';
@Component({
  selector: 'app-profile',
  imports: [FormsModule, RouterLink, CairoDatePipe, StatusBadgeComponent, MobileSignOutComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  readonly session = inject(SessionService);
  private readonly api = inject(ProfileService);
  private readonly notices = inject(NotificationService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly deleting = signal(false);
  confirmation = '';
  async export() {
    this.busy.set(true);
    try {
      const data = await this.api.export();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'forma-personal-data.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notices.show('تم تنزيل نسخة من بياناتك. احتفظ بها في مكان آمن.');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
  async remove() {
    if (
      this.confirmation !== this.session.account()?.email ||
      !confirm('حذف حسابك وبياناتك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')
    )
      return;
    this.busy.set(true);
    try {
      await this.api.delete();
      this.session.tokens.token.set(null);
      this.session.account.set(null);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.notices.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
