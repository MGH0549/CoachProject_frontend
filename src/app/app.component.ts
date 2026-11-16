import { NotificationService } from './core/feedback/notification.service';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaStatusComponent } from './shared/pwa-status/pwa-status.component';

@Component({
  imports: [RouterOutlet, PwaStatusComponent],
  selector: 'app-root',
  styleUrl: './app.component.css',
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly notices = inject(NotificationService);
}
