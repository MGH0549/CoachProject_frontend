import { NotificationService } from './core/feedback/notification.service';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaStatusComponent } from './shared/pwa-status/pwa-status.component';
import { SessionService } from './core/auth/session.service';

@Component({
  imports: [RouterOutlet, PwaStatusComponent],
  selector: 'app-root',
  styleUrl: './app.component.css',
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly notices = inject(NotificationService);
  readonly session = inject(SessionService);
  readonly browserReady = signal(false);
  constructor() {
    afterNextRender(() => this.browserReady.set(true));
  }
}
