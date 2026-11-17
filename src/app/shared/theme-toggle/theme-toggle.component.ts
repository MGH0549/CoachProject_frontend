import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      [attr.aria-label]="theme.theme() === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'"
      [title]="theme.theme() === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'"
      (click)="theme.toggle()"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        @if (theme.theme() === 'dark') {
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        } @else {
          <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
        }
      </svg>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    button {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: var(--surface);
      color: var(--text);
    }
    button:hover {
      background: var(--raised);
    }
  `,
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);
}
