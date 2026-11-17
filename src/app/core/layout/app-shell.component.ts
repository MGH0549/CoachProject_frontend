import { IconComponent } from '../../shared/icon/icon.component';
import { Component, inject, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionService } from '../auth/session.service';
import { NotificationService } from '../feedback/notification.service';
import { BrandComponent } from '../../shared/brand/brand.component';
import { CairoDatePipe } from '../../shared/pipes/cairo-date.pipe';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
@Component({
  selector: 'app-shell',
  imports: [
    IconComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    BrandComponent,
    ThemeToggleComponent,
    CairoDatePipe,
    TranslocoPipe,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  readonly outlet = viewChild(RouterOutlet);
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly notices = inject(NotificationService);
  readonly clientLinks = [
    { path: '/client/training', label: 'training', icon: '•' },
    { path: '/client/diet', label: 'diet', icon: '•' },
    { path: '/client/progress', label: 'progress', icon: '↗' },
    { path: '/client/profile', label: 'profile', icon: '♙' },
  ];
  readonly coachLinks = [
    { path: '/coach/clients', label: 'clients', icon: '•' },
    { path: '/coach/templates', label: 'templates', icon: '•' },
    { path: '/coach/library', label: 'library', icon: '▣' },
    { path: '/coach/settings', label: 'settings', icon: '☷' },
  ];
  get links() {
    return this.session.tokens.role() === 'Coach' ? this.coachLinks : this.clientLinks;
  }
  async signOut() {
    const screen = this.outlet()?.component as {
      canLeave?: () => boolean;
      discardChanges?: () => void;
    } | null;
    if (screen?.canLeave && !screen.canLeave()) return;
    try {
      await this.session.signOut();
      screen?.discardChanges?.();
      await this.router.navigateByUrl('/auth/sign-in');
    } catch (error) {
      this.notices.error(error);
    }
  }
}
