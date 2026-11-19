import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SessionService } from '../../../core/auth/session.service';
import { AccountAccessComponent } from '../../../shared/account-access/account-access.component';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  selector: 'app-client-home',
  imports: [RouterLink, TranslocoPipe, AccountAccessComponent, IconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly session = inject(SessionService);
  readonly translations = inject(TranslocoService);
  readonly loading = signal(true);
  readonly pages = ['training', 'diet', 'progress'];
  constructor() {
    void this.session
      .loadAccount()
      .catch(() => undefined)
      .finally(() => this.loading.set(false));
  }
}
