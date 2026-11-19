import { Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionService } from '../../core/auth/session.service';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-account-access',
  imports: [TranslocoPipe, StatusBadgeComponent, IconComponent],
  templateUrl: './account-access.component.html',
  styleUrl: './account-access.component.css',
})
export class AccountAccessComponent {
  readonly session = inject(SessionService);
  readonly planLocked = input(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly status = computed(() => this.session.account()?.status);
  readonly title = computed(() => {
    if (this.session.accountUnavailable() || !this.status() || this.status() === 'Active')
      return 'unavailableTitle';
    if (this.status() === 'Expired') return 'expiredTitle';
    if (this.status() === 'Deactivated') return 'deactivatedTitle';
    return this.planLocked() ? 'preparingTitle' : 'pendingTitle';
  });
  readonly body = computed(() => {
    if (this.session.accountUnavailable() || !this.status() || this.status() === 'Active')
      return 'unavailableBody';
    if (this.status() === 'Expired') return 'expiredBody';
    if (this.status() === 'Deactivated') return 'deactivatedBody';
    return this.planLocked() ? 'preparingBody' : 'pendingBody';
  });
  readonly steps = ['stepCreated', 'stepMessage', 'stepActivation', 'stepPlans'];

  async refresh(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await this.session.loadAccount();
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
